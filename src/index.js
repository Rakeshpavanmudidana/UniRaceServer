import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cron from "node-cron";
import express from "express";
import { checkCompetitions, quizNotification, winnerDecider } from "./reminderJob.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// API endpoint to manually trigger the reminder job
app.get("/", async (req, res) => {
  // await checkCompetitions();
  // await quizNotification();
  await winnerDecider();
  res.send("Reminder job executed manually!");
});

// Schedule job: run daily at 8:00 AM
cron.schedule("0 18 * * *", () => {
  console.log("⏰ Running scheduled competition reminder job...");
  checkCompetitions();
  quizNotification();
  sendEmail();
});


cron.schedule("0 21 * * *", () => {
  console.log("⏰ Running scheduled competition reminder job...");
  quizNotification();
  sendEmail();
});


cron.schedule("55 6 * * *", () => {
  const today = new Date();
  if (today.getDay() === 0) {
    console.log("⏰ Running scheduled competition reminder job...");
    // winnerDecider();
  }

});


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


export function sendEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Team UniRace" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIl_HEAD,
    subject: "REMINDER SENT STATUS SUCCESS",
    text: "HI HOST REMINDER SENT STATUS SUCCESS",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email sending failed:", error);
    } else {
      console.log(`✅ Email sent to ${recipientEmail}: ${info.response}`);
    }
  });

}
