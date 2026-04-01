import { readSettings } from "@/lib/settings";

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeWhatsappTarget(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

export async function sendWA(to: string, message: string) {
  const settings = await readSettings();

  if (!settings.waApiUrl || !settings.waSessionId || !settings.waToken) {
    throw new Error("WA Blast configuration is incomplete.");
  }

  const normalizedTo = normalizeWhatsappTarget(to);

  if (!normalizedTo) {
    throw new Error("Recipient number is invalid.");
  }

  const response = await fetch(
    `${settings.waApiUrl}/messages?sessionId=${encodeURIComponent(settings.waSessionId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.waToken}`
      },
      body: JSON.stringify({
        to: normalizedTo,
        type: "text",
        text: { body: message }
      }),
      signal: AbortSignal.timeout(25000)
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WA send failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export function extractWebhookPayload(body: any) {
  const firstMessage = body?.messages?.[0];
  const cloudMessage = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  const rawFrom = firstString(
    body?.from,
    body?.sender,
    body?.message?.from,
    body?.data?.from,
    body?.data?.key?.remoteJid,
    body?.key?.remoteJid,
    firstMessage?.from,
    cloudMessage?.from
  );

  const message = firstString(
    body?.message?.text,
    body?.message?.body,
    body?.text?.body,
    body?.text,
    body?.data?.message,
    body?.data?.body,
    body?.data?.text?.body,
    firstMessage?.text?.body,
    firstMessage?.body,
    cloudMessage?.text?.body
  );

  return {
    from: normalizeWhatsappTarget(rawFrom),
    message
  };
}
