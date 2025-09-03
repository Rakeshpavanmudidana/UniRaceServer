import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("EMAIL_USER:", process.env.GMAIL_USER);
console.log("EMAIL_PASS:", process.env.GMAIL_PASS ? "Loaded ✅" : "Missing ❌");

export function sendEmail(subject, message, recipientEmail) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Team UniRace" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email sending failed:", error);
    } else {
      console.log(`✅ Email sent to ${recipientEmail}: ${info.response}`);
    }
  });
}
