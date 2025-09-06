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
            const message =
                        "<p>Dear Participant,</p>" +

                        "<p>This is a reminder that the registration for " +
                        "<b>" + compData.title + " (" + compData.Id + ")</b> " +
                        "closes in <b>" + diff + " day" + (diff > 1 ? "s" : "") + "</b>.</p>" +

                        "<p>Search for <b>" + compData.title + "</b> or use the ID <b>" + compId + "</b> in the <b>UniRace</b> app to register before the deadline.</p>" +

                        "<p>Don't miss out — complete your registration now!</p>" +

                        "<p>Warm regards,<br><b>Team UniRace</b></p>" +

                        "<p style=\"color: gray; font-size: 12px;\">*(This is an automated message, please do not reply.)*</p>";

                    sendEmail(subject, message, user.email);
          }
          
        }
        
      }

      else if (diff === 1) {
            for (const [userId, user] of Object.entries(compData.visitedUsers || {})) {
                subject = `Registration for "${compData.title}" closes tomorrow!`;
                const subject = `Registration for "${compData.title}" Closes Tomorrow!`;

                const message =
                                "<p>Dear Participant,</p>" +

                                "<p>This is a final reminder that the registration for " +
                                "<b>" + compData.title + " (" + compData.Id + ")</b> will close <b>tomorrow</b>.</p>" +

                                "<p>Search for <b>" + compData.title + "</b> or use the ID <b>" + compId + "</b> in the <b>UniRace</b> app to register before the deadline.</p>" +

                                "<p>Don't miss out on this opportunity — complete your registration now!</p>" +

                                "<p>Warm regards,<br><b>Team UniRace</b></p>" +

                                "<p style=\"color: gray; font-size: 12px;\">*(This is an automated message, please do not reply.)*</p>";


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

                        const subject = `Reminder: Quiz "${compData.title}" (${compData.Id}) Not Attempted Today!`;

                        const message =
                        "<p>Dear Participant,</p>" +

                        "<p>This is a friendly reminder that you have not attempted the quiz test for " +
                        "<b>" + compData.title + " (" + compData.Id + ")</b> today.</p>" +

                        "<p><b>⚠️ Please attempt the quiz as soon as possible</b>, or you may risk losing your rank.</p>" +

                        "<p>Stay consistent and keep up the great work!</p>" +

                        "<p>Warm regards,<br><b>Team UniRace</b></p>" +

                        "<p style=\"color: gray; font-size: 12px;\">*(This is an automated message, please do not reply.)*</p>";



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
            time: obj.TotalTime || 0,
          }))
          
          // Sort daily scores by date descending (latest first)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4); // Only top 4 days
          console.log(dailyScores);

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

        for (let i = 0; i < 4; i++){
            const timeA = a.dailyScores[i]?.time || Infinity;
            const timeB = b.dailyScores[i]?.time || Infinity;
            if (timeA !== timeB) {
                return timeA - timeB; // Ascending
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
        console.log("daily Score", user.dailyScores);
        return {
          userId: user.userId,
          TotalScore: user.TotalScore,
          rank,
          dailyScores: user.dailyScores,
        };
      });

      let htmlMessage = "";

        console.log("🏆 Final Ranking:", rankedUsers);

        // email sending code for winners can be added here

                htmlMessage = "<p>Dear Team,</p>" +

                                "<p>The results for the competition <b>" + compData.title + " (" + compId + ")</b> have been finalized.</p>" +

                                "<h3>🏆 Winner Details:</h3>" +
                                "<p><b>1st Place:</b> " + rankedUsers[0].userId + "</p>" +

                                "<p>Please update the records and take the necessary follow-up actions.</p>" +

                                "<p>Best Regards,<br><b>Team UniRace</b></p>" +

                                "<p style=\"color: gray; font-size: 12px;\">(This is an automated message, please do not reply.)</p>";

                sendEmail(
                "Winner Announcement - UniRace Competition",
                htmlMessage,
                process.env.GMAIL_HEAD
                );

        const subject = "🎉 Congratulations! You're a Winner - UniRace";

        htmlMessage = "<p>Dear Participant,</p>" +

                            "<p>Congratulations! 🎊 You have emerged as a <b>winner</b> in the competition " +
                            "<b>" + compData.title + " (" + compId + ")</b>.</p>" +

                            "<h3>🏆 Your Results:</h3>" +
                            "<ul>" +
                            "<li><b>Rank:</b> " + rankedUsers[0].rank + "</li>" +
                            "<li><b>Total Score:</b> " + rankedUsers[0].TotalScore + "</li>" +
                            "</ul>" +

                            "<p>As a token of appreciation, <b>200 coins</b> have been credited to your UniRace account. 💰</p>" +

                            "<p>" +
                            "You can view detailed results and claim your rewards by visiting the " +
                            "<b>UniRace app/website</b>." +
                            "</p>" +

                            "<p>Keep up the great work and continue participating in upcoming events!</p>" +

                            "<p>Warm regards,<br>" +
                            "<b>Team UniRace</b></p>" +

                            "<p style=\"color: gray; font-size: 12px;\">" +
                            "*(This is an automated message, please do not reply.)*" +
                            "</p>";





        sendEmail( subject, htmlMessage, registeredUsers[rankedUsers[0].userId].email);

        const coins1 = (registeredUsers[rankedUsers[0].userId].coins || 0) + 220;
        await set(ref(db, `Users/${rankedUsers[0].userId}/coins`), coins1);

        await set(ref(db, `Users/${rankedUsers[0].userId}/competitionCoins/${compId}`), 220);

        for (let i = 1; i < rankedUsers.length; i++) {
            if (rankedUsers[i].dailyScores.length !== 0 ) {
                
                const htmlMessage = "<p>Hello " + (registeredUsers[rankedUsers[i].userId].name || "Participant") + ",</p>" +

                                    "<p>The results for the competition <b>" + compData.title + " (" + compId + ")</b> have been announced! 🎉</p>" +

                                    "<p>Thank you for participating in this event.</p>" +

                                    "<p>As a token of appreciation, <b>20 coins</b> have been added to your account for participating. 💰</p>" +

                                    "<p>You can check the detailed results and your performance in the <b>UniRace app</b> or <b>website</b>.</p>" +

                                    "<p>Stay tuned for more exciting competitions ahead!</p>" +

                                    "<p>Best Regards,<br><b>Team UniRace</b></p>" +

                                    "<p style=\"color: gray; font-size: 12px;\">(This is an automated message, please do not reply.)</p>";
        
                sendEmail(
                "Results Announced - UniRace Competition",
                htmlMessage,
                registeredUsers[rankedUsers[i].userId].email
                );

                const Totalcoins = (registeredUsers[rankedUsers[0].userId].coins || 0) + 20;
                await set(ref(db, `Users/${rankedUsers[i].userId}/coins`), Totalcoins);

                await set(ref(db, `Users/${rankedUsers[i].userId}/competitionCoins/${compId}`), 20);

            }
            

        }




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


