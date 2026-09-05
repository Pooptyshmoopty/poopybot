const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OWNER_NUMBER = process.env.OWNER_NUMBER;

const HOURS_MSG = "Our hours:\nMon-Thu: 5 PM - 12 AM\nWeekends: 5 PM - 2 AM";
const PRICE_MSG = "Pricing:\nWeekdays: Rs. 2000/hour\nWeekends: Rs. 2500/hour";
const LOCATION_MSG = "We're located at Nagan Chowrangi, Shadman Town, near APPA Palace.";
const MENU_MSG = "Welcome to Futsal Bot! ⚽\n\nReply with:\n1. Book - to reserve a slot\n2. Hours - operating hours\n3. Price - pricing info\n4. Location - our address\n5. Help - talk to a real person";
const BOOK_PROMPT = "Great! Please send your booking details in this format:\n\nBook: [Day] [Time] [Your Name]\n\nExample: Book: Friday 7pm Ali";

async function sendMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const message = change && change.value && change.value.messages && change.value.messages[0];

    if (message) {
      const from = message.from;
      const text = (message.text ? message.text.body : "").trim();
      const lower = text.toLowerCase();

      if (lower.startsWith("book:")) {
        const details = text.substring(5).trim();
        await sendMessage(from, `Thanks! We've received your booking request:\n"${details}"\n\nWe'll confirm with you shortly!`);
        if (OWNER_NUMBER) {
          await sendMessage(OWNER_NUMBER, `📅 New booking request!\nFrom: ${from}\nDetails: ${details}`);
        }
      } else if (lower.includes("book")) {
        await sendMessage(from, BOOK_PROMPT);
      } else if (lower.includes("hour") || lower.includes("open") || lower.includes("timing")) {
        await sendMessage(from, HOURS_MSG);
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
        await sendMessage(from, PRICE_MSG);
      } else if (lower.includes("location") || lower.includes("address") || lower.includes("where")) {
        await sendMessage(from, LOCATION_MSG);
      } else if (lower.includes("help") || lower.includes("human") || lower.includes("agent") || lower.includes("talk to")) {
        await sendMessage(from, "Sure! I've let our team know — someone will message you here shortly. 🙌");
        if (OWNER_NUMBER) {
          await sendMessage(OWNER_NUMBER, `🙋 Customer needs help!\nFrom: ${from}\nMessage: "${text}"`);
        }
      } else {
        await sendMessage(from, MENU_MSG);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
    res.sendStatus(500);
  }
});

module.exports = app;
