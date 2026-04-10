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
  if (typeof value !== "string") return "";
  let cleaned = value.trim().replace(/[\s\-().]/g, "");
  // +62 → 62
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  // 08xxx → 628xxx (Indonesian local to international)
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

function truncateForLog(value: string, max = 1200) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...<truncated>`;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}

export type SendWAResult = {
  sentPayload: Record<string, unknown>;
  apiResponse: unknown;
  httpStatus: number;
};

export async function sendWA(to: string, message: string): Promise<SendWAResult> {
  const settings = await readSettings();

  if (!settings.waApiUrl || !settings.waSessionId || !settings.waToken) {
    console.error("[wa.send] Missing WA configuration", {
      hasWaApiUrl: Boolean(settings.waApiUrl),
      hasWaSessionId: Boolean(settings.waSessionId),
      hasWaToken: Boolean(settings.waToken)
    });
    throw new Error("WA Blast configuration is incomplete.");
  }

  const normalizedTo = normalizeWhatsappTarget(to);

  if (!normalizedTo) {
    console.error("[wa.send] Invalid recipient number", {
      rawTo: to,
      normalizedTo
    });
    throw new Error("Recipient number is invalid.");
  }

  const sentPayload = {
    to: normalizedTo,
    type: "text",
    text: { body: message }
  };

  const url = `${settings.waApiUrl}/messages?sessionId=${encodeURIComponent(settings.waSessionId)}`;

  console.info("[wa.send] Sending WhatsApp message", {
    to: normalizedTo,
    url,
    messageLength: message.length,
    preview: truncateForLog(message, 400),
    payload: sentPayload
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.waToken}`
      },
      body: JSON.stringify(sentPayload),
      signal: AbortSignal.timeout(120000)
    });

    let detail = "";
    let data: any = null;

    try {
      detail = await response.text();
      data = JSON.parse(detail);
    } catch {
      // raw text
    }

    console.info("[wa.send] WhatsApp API response received", {
      to: normalizedTo,
      httpStatus: response.status,
      ok: response.ok,
      responseBody: truncateForLog(detail, 2000)
    });

    if (!response.ok) {
      throw new Error(`WA send HTTP ${response.status}: ${detail}`);
    }

    if (data && (data.status === false || data.error)) {
      throw new Error(`WA send API error: ${detail}`);
    }

    // WA API sometimes returns array: [{status: "error", message: "..."}]
    if (Array.isArray(data)) {
      const firstItem = data[0];
      if (firstItem?.status === "error" || firstItem?.error) {
        throw new Error(`WA send API error: ${firstItem.message || firstItem.error || detail}`);
      }
    }

    return {
      sentPayload,
      apiResponse: data ?? detail,
      httpStatus: response.status
    };
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? (error as any).cause : undefined;
    console.error("[wa.send] Failed to send WhatsApp message", {
      to: normalizedTo,
      url,
      messageLength: message.length,
      payload: sentPayload,
      error: serializeError(error),
      cause: cause ? serializeError(cause) : undefined,
      causeCode: cause?.code,
      causeErrno: cause?.errno,
      causeHostname: cause?.hostname
    });
    throw error;
  }
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
