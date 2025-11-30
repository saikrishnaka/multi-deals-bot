import express from "express";
import bot from "./bot.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Start Telegram bot
bot();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
