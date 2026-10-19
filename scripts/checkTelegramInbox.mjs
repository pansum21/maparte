import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Read .env
let token = process.env.VITE_TELEGRAM_BOT_TOKEN;
if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/VITE_TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
  if (match) token = match[1].trim();
}

if (!token) {
  console.error('Error: VITE_TELEGRAM_BOT_TOKEN not found in environment or .env');
  process.exit(1);
}

async function checkInbox() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data);
      return;
    }

    const messages = data.result || [];
    console.log(`\n📬 Telegram Inbox for @MaparteBot: ${messages.length} message(s) found.\n`);

    for (const item of messages) {
      const msg = item.message;
      if (!msg) continue;
      const from = msg.from ? `${msg.from.first_name || ''} (@${msg.from.username || 'unknown'})` : 'Anonymous';
      const text = msg.text || '[Non-text message]';
      const date = new Date(msg.date * 1000).toLocaleString();

      const isPricing = /(price|cost|rate|महंगा|सस्ता|रेट|discount|offer|rupee|pay)/i.test(text);
      const isBug = /(bug|error|glitch|fail|crash|blur|stuck|cut off|problem|issue)/i.test(text);

      const tag = isPricing
        ? '💰 [PRICING - MANUAL REVIEW ONLY]'
        : isBug
        ? '🚨 [TECHNICAL BUG - AUTO FIXABLE]'
        : '💬 [GENERAL MESSAGE]';

      console.log(`----------------------------------------`);
      console.log(`ID: ${msg.message_id} | Date: ${date} | From: ${from}`);
      console.log(`Tag: ${tag}`);
      console.log(`Message: "${text}"`);
    }
    console.log(`----------------------------------------\n`);
  } catch (err) {
    console.error('Failed to fetch Telegram inbox:', err);
  }
}

checkInbox();
