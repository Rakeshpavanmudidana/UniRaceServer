import dotenv from "dotenv";
import cron from "node-cron";
import express from "express";
import { checkCompetitions } from "./reminderJob.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// API endpoint to manually trigger the reminder job
app.get("/", async (req, res) => {
  await checkCompetitions();
  res.send("Reminder job executed manually!");
});

// Schedule job: run daily at 8:00 AM
cron.schedule("0 18 * * *", () => {
  console.log("⏰ Running scheduled competition reminder job...");
  checkCompetitions();
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
