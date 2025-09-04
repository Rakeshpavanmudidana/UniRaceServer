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
            message = `Dear Participant,

This is a reminder that the registration for "${compData.title}"(${compData.Id}) closes in ${diff} day${diff > 1 ? 's' : ''}.

Search "${compData.title}" or ID "${compId}" in UniRace to register before the deadline.

Warm regards,
Team UniRace
*(This is an automated message, please do not reply.)*
`;
          }
          sendEmail(subject, message, user.email);
        }
        
      }

      else if (diff === 1) {
            for (const [userId, user] of Object.entries(compData.visitedUsers || {})) {
                subject = `Registration for "${compData.title}" closes tomorrow!`;
                message = `Dear Participant,
This is a final reminder that the registration for "${compData.title}" (${compData.Id}) closes tomorrow.

Search "${compData.title}" or ID "${compId}" in UniRace to register before the today.
Warm regards,
Team UniRace
*(This is an automated message, please do not reply.)*
`;
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

      if (compData.deadline === "") continue;
      if (compData.type != "Quiz") continue;

      const EventEndDate = parseDDMMYYYY(compData.eventEndDate);

      const diff = dateDifferenceInDays(today, EventEndDate);

      console.log(`➡️ Days until deadline for "${compData.title}": ${diff}`);

      // Notify users if 2 or 3 days remaining
      if (diff <= 3 && diff >= 0) {
        for (const [userId, user] of Object.entries(compData.registeredUsers || {})) {

            for (const [date, value] of Object.entries(user.attempts || {})) {
                console.log("User Attempt Date:", date);
                if ( date === today.toISOString().split('T')[0]) {
                  console.log("hello");
                    subject = `Reminder: Quiz "${compData.title}"(${compData.Id}) test not attempted today!`;
                    message = `Dear Participant,
This is a reminder that you have not attempted the quiz test for "${compData.title}" (${compData.Id}) today.

Please attempt the quiz or you may loss the rank.


Warm regards,

Team UniRace
*(This is an automated message, please do not reply.)*
`;
                    sendEmail(subject, message, user.email);
                }
            }

//             subject = `Reminder: Registration for "${compData.title}" closes in ${diff} day${diff > 1 ? 's' : ''}`;
//             message = `Dear Participant,

// This is a reminder that the registration for "${compData.title}" ${compData.type} closes in ${diff} day${diff > 1 ? 's' : ''}.

// Search "${compData.title}" or ID "${compId}" in UniRace to register before the deadline.

// Warm regards,
// Team UniRace
// *(This is an automated message, please do not reply.)*
// `;
        }
        
      }

        // sendEmail(subject, message, user.email);
    }
  } catch (error) {
    console.error("🔥 Error fetching competitions:", error);
  }

}
