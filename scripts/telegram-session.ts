import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";
import * as readline from "node:readline/promises";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

import { env } from "@/env";

async function main() {
  const existingSession = process.env.TELEGRAM_SESSION_STRING ?? "";

  const rl = readline.createInterface({ input, output });

  const stringSession = new StringSession(existingSession);
  const client = new TelegramClient(
    stringSession,
    env.TELEGRAM_API_ID!,
    env.TELEGRAM_API_HASH!,
    {
      connectionRetries: 5,
    },
  );

  try {
    await client.start({
      phoneNumber: async () => rl.question("Phone number (international): "),
      password: async () => rl.question("2FA password (if enabled): "),
      phoneCode: async () => rl.question("Login code from Telegram: "),
      onError: (error) => console.error(error),
    });

    const sessionString = stringSession.save();

    console.log(
      "\nAuthorized. Add this to .env (and your deployment secrets):\n",
    );
    console.log(`TELEGRAM_SESSION_STRING="${sessionString}"\n`);
    console.log(
      "Treat it like a password — anyone with it can use your Telegram account.",
    );
  } finally {
    await client.disconnect();
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
