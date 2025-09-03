import express from "express";
import nodemailer from "nodemailer";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, child, get } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyCZt5GakrqwBwbMq2H2IyIERRaGmgX4CQY",
  authDomain: "unirace-9c79c.firebaseapp.com",
  databaseURL: "https://unirace-9c79c-default-rtdb.firebaseio.com",
  projectId: "unirace-9c79c",
  storageBucket: "unirace-9c79c.firebasestorage.app",
  messagingSenderId: "396590569940",
  appId: "1:396590569940:web:651076e392456115b49e41",
  measurementId: "G-XLQBT8CCBM",
  databaseURL: "https://unirace-9c79c-default-rtdb.firebaseio.com/",
};


const app = initializeApp(firebaseConfig);
const CompetitionId = '1';
const dbRef = ref(getDatabase(app));
get(child(dbRef, "Competition/"))
  .then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val(); // full object
      // Loop through competitions
      Object.entries(data).forEach(([key, value]) => {
        console.log("📌 Competition ID:", key);
        const today = new Date();
        const CompetitionId = key;
        const CompetitionName = value.title;
        
        if ( value.deadline != ""){
          
        
        const deadline = parseDDMMYYYY(value.deadline); // Custom format


        const diff = dateDifferenceInDays(today, deadline);
        let msg = "";
        let subject = "";

        console.log("Difference in days:", diff);

        if (diff === 2 || diff === 3) {

          console.log("➡️ deadLine:", value.deadline);
          const visitedUsers = value.visitedUsers;
          Object.entries(visitedUsers).forEach(([key, value]) => {
            if ( value.Registered === false && value.NotifyMe == true) {
              console.log("📧 Sending email to:", value.email);
              subject = `Reminder: Registration for "${CompetitionName}" (ID: ${CompetitionId}) closes in ${diff} day${diff > 1 ? 's' : ''}`;
              msg = `Dear Participant,

We hope this message finds you well.

This is a gentle reminder that the registration for the competition "${CompetitionName}" (ID: ${CompetitionId})
will be closing in "${diff} day${diff > 1 ? 's' : ''}".

Please open the UniRace app/website and search "${CompetitionName}" or "${CompetitionId}" to complete your registration before the deadline.

Thank you for being a part of UniRace.  
We look forward to your participation and wish you the very best!

Warm regards,  
**Team UniRace**  
*(This is an automated message, please do not reply.)*
`;
                  // console.log("Subject:", value.Email );
              sendEmailVerification(subject, msg, value.email);
            }
        });


        } else {
          console.log("❌ Not yet the right time.");
        }
        
    }});
    } else {
      console.log("❌ No data available");
    }
  })
  .catch((error) => {
    console.error("Error fetching competitions:", error);
  });


  function dateDifferenceInDays(date1, date2) {
  // Set both dates to midnight (ignore time part)
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const diffInMs = d2 - d1; // deadline - today
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }



function parseDDMMYYYY(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day); // month is 0-based
}

function sendEmailVerification(subject, msg, userEmail) {
  // 1. Create a transporter using Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "unirace3@gmail.com", // replace with your UniRace Gmail
      pass: "qnxn xkfe yehh geru", // Google App Password (not normal password)
    },
  });

  // 2. Define mail options
  const mailOptions = {
    from: '"Team UniRace" <unirace3@gmail.com>', // sender
    to: userEmail,                                       // receiver
    subject: subject,                                    // email subject
    text: msg,                                           // plain text body
  };

  // 3. Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    console.log("Attempting to send email...");
    if (error) {
      console.error("❌ Error sending email:", error);
    } else {
      console.log(`✅ Email sent to ${userEmail}:`, info.response);
    }
  });
}
