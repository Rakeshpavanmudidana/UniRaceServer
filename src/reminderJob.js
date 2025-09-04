import { db, ref } from "./firebaseService.js";
import { child, get } from "firebase/database";
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
            subject = `Reminder: Registration for "${compData.title}"  closes in ${diff} day${diff > 1 ? 's' : ''}`;
            message = "Dear Participant,\n\n" +

                    "This is a reminder that the registration for " + compData.title + " (" + compData.Id + ") " + "closes in" + diff +  "day" + diff > 1 ? 's' : '' + ".\n\n"

                    "Search " + compData.title + " or ID '" + compId + "' in UniRace to register before the deadline.\n\n" +

                    "Warm regards,\n" +
                    "Team UniRace" +
                    "*(This is an automated message, please do not reply.)*";
          }
          sendEmail(subject, message, user.email);
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
                    today = today.toISOString().split('T')[0];

                    // Extract just the attempt dates (keys)
                    const attemptDates = Object.keys(user.attempts || {});

                    // Debugging
                    console.log("Attempt Dates:", attemptDates);
                    console.log("Today:", today);

                    // Check if today's date is present
                    if (attemptDates.includes(today)) {
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

    console.log("🏆 Deciding winners for ended quizzes...")
    try {
        const snapshot = get(child(ref(db), "Competition/")).then((snapshot) => {
            if (!snapshot.exists()) {
                console.log("❌ No competition data found.");
                return;
            }
            const data = snapshot.val();

            for (const [compId, compData] of Object.entries(data)) {
                console.log("📌 Competition ID:", compId);
                
                if (compData.type != "Quiz") continue;
                
                // Convert users to an array
                const usersArray = Object.entries(compData.registeredUsers || {});

                // Custom sort with tie-breaking
                const sortedUsers = usersArray.sort((a, b) => {
                    const userA = a[1];
                    const userB = b[1];

                    // 1. Compare TotalScore
                    if (userB.TotalScore !== userA.TotalScore) {
                        return userB.TotalScore - userA.TotalScore; // Descending
                    }

                    // 2. Tie-breaker: Compare daily scores (up to 4 days)
                    let userADates; 
                    get(child(ref(db), `Users/${a[0]}/scores/${compId}`))
                    .then((userScoreSnap) => {
                        if (userScoreSnap.exists()) {
                        console.log("User Score Snap:", userScoreSnap.val());
                        userADates = Object.keys(userScoreSnap).filter(key => key !== "TotalScore");
                        } else {
                        console.log("No data available for this user.");
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching user scores:", error);
                    });

                    let userBDates;
                    get(child(ref(db), `Users/${b[0]}/scores/${compId}`))
                    .then((userScoreSnap) => {
                        if (userScoreSnap.exists()) {
                        console.log("User Score Snap:", userScoreSnap.val());
                        userBDates = Object.keys(userScoreSnap).filter(key => key !== "TotalScore");
                        } else {
                        console.log("No data available for this user.");
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching user scores:", error);
                    });

                    for (let i = 0; i < d; i++) {
                        const date = i;
                        const scoreA = get(child(ref(db), `Users/${a[0]}/scores/${compId}/${userADates[date]}/score`)) || 0;
                        const scoreB = get(child(ref(db), `Users/${b[0]}/scores/${compId}/${userBDates[date]}/score`)) || 0;

                        if (scoreA !== scoreB) {
                            return (scoreB || 0) - (scoreA || 0); // Descending, treat undefined as 0
                        }

                    }

                    // 3. If still tie after 4 days, treat as exact tie
                    return 0;
                });

                // Assign ranks
                let currentRank = 1;
                let previousUser = null;

                const rankedUsers = sortedUsers.map(([userId, user], index) => {
                    let rank;

                    if (
                        previousUser &&
                        previousUser.TotalScore === user.TotalScore &&
                        JSON.stringify(previousUser.dailyScores) === JSON.stringify(user.dailyScores)
                    ) {
                        // Same exact scores across all 4 days → same rank
                        rank = previousUser.rank;
                    } else {
                        rank = index + 1;
                    }

                    previousUser = { ...user, rank };

                    return {
                        userId,
                        TotalScore: user.TotalScore,
                        rank
                    };
                });

                console.log("🏆 Final Ranking:", rankedUsers);





                }});
            }
    catch (error) {
        console.error("🔥 Error fetching competitions:", error);
    }


}

