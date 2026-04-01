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

export type SendWAResult = {
  sentPayload: Record<string, unknown>;
  apiResponse: unknown;
  httpStatus: number;
};

export async function sendWA(to: string, message: string): Promise<SendWAResult> {
  const settings = await readSettings();

  if (!settings.waApiUrl || !settings.waSessionId || !settings.waToken) {
    throw new Error("WA Blast configuration is incomplete.");
  }

  const normalizedTo = normalizeWhatsappTarget(to);

  if (!normalizedTo) {
    throw new Error("Recipient number is invalid.");
  }

  const sentPayload = {
    to: normalizedTo,
    type: "text",
    text: { body: message }
  };

  const url = `${settings.waApiUrl}/messages?sessionId=${encodeURIComponent(settings.waSessionId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.waToken}`
    },
    body: JSON.stringify(sentPayload),
    signal: AbortSignal.timeout(25000)
  });

  let detail = "";
  let data: any = null;

  try {
    detail = await response.text();
    data = JSON.parse(detail);
  } catch {
    // raw text
  }

  if (!response.ok) {
    throw new Error(`WA send HTTP ${response.status}: ${detail}`);
  }

  if (data && (data.status === false || data.error)) {
    throw new Error(`WA send API error: ${detail}`);
  }

  return {
    sentPayload,
    apiResponse: data ?? detail,
    httpStatus: response.status
  };
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
