require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "@dealhuntertelugu";

const INTERVAL_MINUTES = 10;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not found!");
  process.exit(1);
}

const TELEGRAM_SEND_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
const TELEGRAM_PHOTO_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

const SOURCES_FILE = path.join(__dirname, 'sources.json');

async function loadSources() {
  const raw = await fs.readFile(SOURCES_FILE, 'utf8');
  return JSON.parse(raw);
}

function short(text, max = 200) {
  if (!text) return "";
  return text.length > max ? text.substring(0, max) + "…" : text;
}

async function scrapeProduct(url, platform) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });

    const $ = cheerio.load(data);

    if (platform === "flipkart") {
      return {
        title: $('span.B_NuCI').text().trim(),
        price: $('div._30jeq3._16Jk6d').text().trim(),
        image: $('img._2r_T1I').attr('src')
      };
    }

    return {
      title: $('title').text().trim(),
      price: "",
      image: $('img').first().attr('src')
    };
  } catch (err) {
    return { title: null, price: null, image: null };
  }
}

async function postToTelegram(text, image) {
  try {
    if (image) {
      await axios.post(TELEGRAM_PHOTO_URL, {
        chat_id: TELEGRAM_CHAT_ID,
        photo: image,
        caption: text,
        parse_mode: "HTML"
      });
    } else {
      await axios.post(TELEGRAM_SEND_URL, {
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
}

function formatMessage(item, scraped) {
  let msg = `<b>${short(scraped.title || item.title)}</b>\n`;
  if (scraped.price) msg += `<b>Price:</b> ${scraped.price}\n`;
  msg += `\n${item.url}\n`;
  return msg;
}

let lastPosted = {};

async function processSources() {
  const items = await loadSources();

  for (const item of items) {
    const cooldown = (item.cooldown_minutes || 60) * 60 * 1000;
    const last = lastPosted[item.id] || 0;

    if (Date.now() - last < cooldown) continue;

    if (item.type === "manual") {
      const msg = `<b>${item.title}</b>\n\n${item.url}`;
      await postToTelegram(msg, item.image);
      lastPosted[item.id] = Date.now();
      continue;
    }

    const scraped = await scrapeProduct(item.url, item.platform);
    const msg = formatMessage(item, scraped);
    await postToTelegram(msg, scraped.image || item.image);

    lastPosted[item.id] = Date.now();
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function main() {
  await processSources();
  setInterval(processSources, INTERVAL_MINUTES * 60 * 1000);
}

main();
