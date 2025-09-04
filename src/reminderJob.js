import { db, ref } from "./firebaseService.js";
import { child, get, set } from "firebase/database";
import { sendEmail } from "./emailService.js";

// Helper Functions
function dateDifferenceInDays(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function parseDDMMYYYY(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

// Main Function
export async function checkCompetitions() {
  console.log("🔍 Checking competitions for reminders...");

  try {
    let subject, message;
    const snapshot = await get(child(ref(db), "Competition/"));

    if (!snapshot.exists()) {
      console.log("❌ No competition data found.");
      return;
    }

    const data = snapshot.val();
    const today = new Date();

    for (const [compId, compData] of Object.entries(data)) {
      console.log("📌 Competition ID:", compId);

      if (!compData.deadline) continue;

      const deadline = parseDDMMYYYY(compData.deadline);
      const diff = dateDifferenceInDays(today, deadline);

      console.log(`➡️ Days until deadline for "${compData.title}": ${diff}`);

      // Notify users if 2 or 3 days remaining
      if (diff === 2 || diff === 3) {
        for (const [userId, user] of Object.entries(compData.visitedUsers || {})) {

          if (!user.Registered && user.NotifyMe) {
            console.log(user.email);
            subject = `Reminder: Registration for "${compData.title}"  closes in ${diff} day${diff > 1 ? 's' : ''}`;
            message = "Dear Participant,\n\n" +

                    "This is a reminder that the registration for " + compData.title + " (" + compData.Id + ") " + "closes in" + diff +  "day" + diff > 1 ? 's' : '' + ".\n\n"

                    "Search " + compData.title + " or ID '" + compId + "' in UniRace to register before the deadline.\n\n" +

                    "Warm regards,\n" +
                    "Team UniRace" +
                    "*(This is an automated message, please do not reply.)*";
                    sendEmail(subject, message, user.email);
          }
          
        }
        
      }

      else if (diff === 1) {
            for (const [userId, user] of Object.entries(compData.visitedUsers || {})) {
                subject = `Registration for "${compData.title}" closes tomorrow!`;
                message = "Dear Participant,\n\n" + 
                        "This is a final reminder that the registration for " + compData.title + " (" + compData.Id + ") closes tomorrow.\n\n" +

                        "Search " + compData.title + " or ID " + compId + " in UniRace to register before the today.\n\n" +
                        "Warm regards,\n" +
                        "Team UniRace\n" +
                        "*(This is an automated message, please do not reply.)*";

            sendEmail(subject, message, user.email);
            }
        }

        
    }
  } catch (error) {
    console.error("🔥 Error fetching competitions:", error);
  }
}



export async function quizNotification() {

    try {
        const snapshot = await get(child(ref(db), "Competition/"));

        if (!snapshot.exists()) {
            console.log("❌ No competition data found.");
            return;
        }

        const data = snapshot.val();
        

        let today = new Date();

        for (const [compId, compData] of Object.entries(data)) {
            console.log("📌 Competition ID:", compId);

            if (compData.deadline === "") continue;
            if (compData.type != "Quiz") continue;

            const EventEndDate = parseDDMMYYYY(compData.eventEndDate);

            const diff = dateDifferenceInDays(today, EventEndDate);

            console.log(`➡️ Days until deadline for "${compData.title}": ${diff}`);

            // Notify users if 2 or 3 days remaining
            if (diff <= 3 && diff >= 0) {
                for (const [userId, user] of Object.entries(compData.registeredUsers || {})) {

                    // Get today's date in YYYY-MM-DD format
                    const todayDateString  = today.toISOString().split('T')[0];

                    // Extract just the attempt dates (keys)
                    const attemptDates = Object.keys(user.attempts || {});

                    // Debugging
                    console.log("Attempt Dates:", attemptDates);
                    console.log("Today:", today);

                    // Check if today's date is present
                    if (attemptDates.includes(todayDateString )) {
                        console.log("✅ User attempted the quiz today!");
                    } else {
                        console.log("❌ User has NOT attempted the quiz today!");
                        
                        // Send reminder email
                        const subject = `Reminder: Quiz "${compData.title}" (${compData.Id}) not attempted today!`;
                        const message = "Dear Participant, \n\n" +

                                        "This is a reminder that you have not attempted the quiz test for " + compData.title + " (" + compData.Id + ")"+ "today.\n" +

                                        "Please attempt the quiz, or you may lose your rank.\n\n"+

                                        "Warm regards,\n"+
                                        "Team UniRace\n" +
                                        "*(This is an automated message, please do not reply.)*";

                        sendEmail(subject, message, user.email);
                    }

                }
                
            }

            // sendEmail(subject, message, user.email);
        }
  } catch (error) {
    console.error("🔥 Error fetching competitions:", error);
  }

}




export async function winnerDecider() {
  console.log("🏆 Deciding winners for ended quizzes...");

  try {
    const snapshot = await get(child(ref(db), "Competition/"));

    if (!snapshot.exists()) {
      console.log("❌ No competition data found.");
      return;
    }

    const data = snapshot.val();

    for (const [compId, compData] of Object.entries(data)) {
      console.log("📌 Competition ID:", compId);

      // Only process quizzes
      if (compData.type !== "Quiz") continue;

      const registeredUsers = compData.registeredUsers || {};
      console.log("Registered Users:", registeredUsers);

      // Step 1: Fetch all user scores first
      const usersWithScores = [];

      for (const [userId] of Object.entries(registeredUsers)) {
        // Fetch this user's scores from Firebase
        console.log("Fetching scores for user:", userId);
        const userScoresSnap = await get(child(ref(db), `Users/${userId}/scores/${compId}`));

        if (!userScoresSnap.exists()) {
          console.log(`❌ No score data for user: ${userId}`);
          continue;
        }

        const scoreData = userScoresSnap.val();

        // Extract TotalScore
        const totalScore = scoreData.TotalScore || 0;

        // Extract daily scores, excluding TotalScore
        const dailyScores = Object.entries(scoreData)
          .filter(([key]) => key !== "TotalScore")
          .map(([date, obj]) => ({
            date,
            score: obj.score || 0,
          }))
          // Sort daily scores by date descending (latest first)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4); // Only top 4 days

        usersWithScores.push({
          userId,
          TotalScore: totalScore,
          dailyScores,
        });
      }

      // Step 2: Sort users
      const sortedUsers = usersWithScores.sort((a, b) => {
        // 1. Compare TotalScore
        if (b.TotalScore !== a.TotalScore) {
          return b.TotalScore - a.TotalScore;
        }

        // 2. Tie-breaker: Compare day-by-day scores
        for (let i = 0; i < 4; i++) {
          const scoreA = a.dailyScores[i]?.score || 0;
          const scoreB = b.dailyScores[i]?.score || 0;

          if (scoreB !== scoreA) {
            return scoreB - scoreA; // Descending
          }
        }

        // 3. Still tied
        return 0;
      });

      // Step 3: Assign ranks
      let previousUser = null;

      const rankedUsers = sortedUsers.map((user, index) => {
        let rank;

        if (
          previousUser &&
          previousUser.TotalScore === user.TotalScore &&
          JSON.stringify(previousUser.dailyScores) === JSON.stringify(user.dailyScores)
        ) {
          rank = previousUser.rank; // same rank for exact tie
        } else {
          rank = index + 1;
        }

        previousUser = { ...user, rank };

        return {
          userId: user.userId,
          TotalScore: user.TotalScore,
          rank,
          dailyScores: user.dailyScores,
        };
      });

        console.log("🏆 Final Ranking:", rankedUsers);
        const resultsRef = ref(db, `Competition/${compId}/result`);

        const resultArray = rankedUsers.map(user => ({
        userId: user.userId,
        TotalScore: user.TotalScore,
        rank: user.rank,
        dailyScores: user.dailyScores,
        }));

        await set(resultsRef, resultArray);

    }
  } catch (error) {
    console.error("🔥 Error fetching competitions:", error);
  }
}


