const express = require("express");
const startBot = require("./bot.js");

const app = express();
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Start Telegram bot
startBot();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
