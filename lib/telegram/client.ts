import { Api, TelegramClient, helpers, sessions } from "telegram";

import { env } from "@/env";

function getTelegramConfig() {
  const apiId = env.TELEGRAM_API_ID;
  const apiHash = env.TELEGRAM_API_HASH;
  const session = env.TELEGRAM_SESSION_STRING;

  if (apiId === undefined || apiHash === undefined || session === undefined) {
    return null;
  }

  return { apiId, apiHash, session };
}

export function isTelegramConfigured() {
  return getTelegramConfig() !== null;
}

async function withTelegramClient<T>(
  operation: (client: TelegramClient) => Promise<T>,
): Promise<T> {
  const config = getTelegramConfig();
  if (config === null) {
    throw new Error("Telegram is not configured");
  }

  const client = new TelegramClient(
    new sessions.StringSession(config.session),
    config.apiId,
    config.apiHash,
    { connectionRetries: 3 },
  );

  await client.connect();

  try {
    const authorized = await client.checkAuthorization();
    if (!authorized) {
      throw new Error("Telegram session is not authorized");
    }

    return await operation(client);
  } finally {
    await client.disconnect();
  }
}

function extractScheduledMessageId(updates: Api.TypeUpdates): number {
  const updateList =
    updates instanceof Api.Updates || updates instanceof Api.UpdatesCombined
      ? updates.updates
      : [];

  for (const update of updateList) {
    if (update instanceof Api.UpdateNewScheduledMessage) {
      return update.message.id;
    }
  }

  throw new Error("Telegram did not return a scheduled message id");
}

export async function scheduleSavedMessage(
  text: string,
  scheduleDateUnix: number,
): Promise<number> {
  return withTelegramClient(async (client) => {
    const updates = await client.invoke(
      new Api.messages.SendMessage({
        peer: "me",
        message: text,
        randomId: helpers.generateRandomLong(),
        scheduleDate: scheduleDateUnix,
      }),
    );

    return extractScheduledMessageId(updates);
  });
}

export async function deleteScheduledSavedMessage(messageId: number) {
  await withTelegramClient(async (client) => {
    await client.invoke(
      new Api.messages.DeleteScheduledMessages({
        peer: "me",
        id: [messageId],
      }),
    );
  });
}
