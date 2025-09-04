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
