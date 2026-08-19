import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

import { handleBotUpdate } from "../lib/bot-handler";

const token = process.env.BALE_BOT_TOKEN;
if (!token) {
  console.error("❌ BALE_BOT_TOKEN is required in .env.local");
  process.exit(1);
}

const API_BASE = `https://tapi.bale.ai/bot${token}`;

let offset = 0;
let isRunning = true;

async function poll() {
  console.log("🤖 Bale bot polling started (listening for /start and messages)...");

  while (isRunning) {
    try {
      const url = `${API_BASE}/getUpdates?offset=${offset}&timeout=15`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const data = await res.json() as { ok: boolean; result?: Array<{ update_id: number; message?: any; callback_query?: any }> };

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          console.log(`📩 Received update ${update.update_id} from ${update.message?.from?.username || update.message?.from?.id}: ${update.message?.text}`);
          try {
            await handleBotUpdate("bale", update);
            console.log(`✅ Handled update ${update.update_id}`);
          } catch (handlerErr) {
            console.error(`❌ Error handling update ${update.update_id}:`, handlerErr);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "TimeoutError") {
        console.error("⚠️ Polling error:", err?.message || err);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

process.on("SIGINT", () => {
  console.log("Stopping Bale poller...");
  isRunning = false;
  process.exit(0);
});

poll();
