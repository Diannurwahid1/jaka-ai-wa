import { readSettings } from "@/lib/settings";

const DEFAULT_INBOUND_FORWARD_TARGET = "0895110050207";

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function firstDefined<T>(...values: T[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function normalizeWhatsappTarget(value: string) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("@")) {
    return trimmed.replace(/\s+/g, "").replace(/@c\.us$/i, "@s.whatsapp.net");
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
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

function parseWebhookTimestamp(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      const milliseconds = trimmed.length <= 10 ? numericValue * 1000 : numericValue;
      const parsed = new Date(milliseconds);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatJakartaTimestamp(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date).replace(/\./g, ":");
}

export function getInboundForwardTarget() {
  return (process.env.WA_FORWARD_ALL_TO ?? DEFAULT_INBOUND_FORWARD_TARGET).trim();
}

export function formatInboundForwardMessage({
  from,
  message,
  receivedAt
}: {
  from: string;
  message: string;
  receivedAt?: Date;
}) {
  const effectiveReceivedAt = receivedAt ?? new Date();

  return [
    "Pesan WA masuk realtime",
    "",
    `Nomor: ${from}`,
    `Jam: ${formatJakartaTimestamp(effectiveReceivedAt)} WIB`,
    "",
    "Pesan:",
    message
  ].join("\n");
}

export type SendWAResult = {
  sentPayload: Record<string, unknown>;
  apiResponse: unknown;
  httpStatus: number;
};

export type SendWAOptions = {
  timeoutMs?: number;
};

function buildAbortSignal(timeoutMs?: number) {
  if (!timeoutMs || timeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
}

export async function sendWA(businessId: string, to: string, message: string, options?: SendWAOptions): Promise<SendWAResult> {
  const settings = await readSettings(businessId);

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
      signal: buildAbortSignal(options?.timeoutMs ?? 120000)
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

export async function testWAConnection(businessId: string) {
  const settings = await readSettings(businessId);

  if (!settings.waApiUrl || !settings.waSessionId || !settings.waToken) {
    throw new Error("WA Blast configuration is incomplete.");
  }

  const url = `${settings.waApiUrl.replace(/\/$/, "")}/messages?sessionId=${encodeURIComponent(settings.waSessionId)}`;
  const getResponse = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${settings.waToken}`
    },
    signal: AbortSignal.timeout(15000)
  });

  const getDetail = await getResponse.text();

  if (getResponse.ok) {
    return {
      ok: true,
      summary: `WA endpoint terjangkau. HTTP ${getResponse.status}. ${getDetail ? "Body diterima." : "Body kosong."}`
    };
  }

  const getDetailLower = getDetail.toLowerCase();
  const routeGetNotFound =
    getResponse.status === 404 &&
    (getDetailLower.includes("route get") || getDetailLower.includes("cannot get") || getDetailLower.includes("not found"));

  if (!routeGetNotFound) {
    throw new Error(`WA endpoint returned HTTP ${getResponse.status}: ${getDetail.slice(0, 240)}`);
  }

  const probePayload = {
    to: "6280000000000",
    type: "text",
    text: { body: "health-check" }
  };

  const postResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.waToken}`
    },
    body: JSON.stringify(probePayload),
    signal: AbortSignal.timeout(15000)
  });

  const postDetail = await postResponse.text();

  if (!postResponse.ok) {
    const detailLower = postDetail.toLowerCase();
    const looksLikeEndpointReachable =
      postResponse.status === 400 ||
      postResponse.status === 401 ||
      postResponse.status === 403 ||
      postResponse.status === 405 ||
      postResponse.status === 422 ||
      detailLower.includes("invalid") ||
      detailLower.includes("validation") ||
      detailLower.includes("session") ||
      detailLower.includes("token") ||
      detailLower.includes("recipient");

    if (!looksLikeEndpointReachable) {
      throw new Error(`WA endpoint returned HTTP ${postResponse.status}: ${postDetail.slice(0, 240)}`);
    }
  }

  return {
    ok: true,
    summary: `WA endpoint POST terjangkau. GET /messages tidak didukung oleh provider ini, tetapi endpoint kirim pesan merespons HTTP ${postResponse.status}.`
  };
}

export function extractWebhookPayload(body: any) {
  const firstMessage = body?.messages?.[0];
  const cloudValue = body?.entry?.[0]?.changes?.[0]?.value;
  const cloudMessage = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const hasStatusUpdate =
    Array.isArray(body?.statuses) && body.statuses.length > 0
      ? true
      : Array.isArray(cloudValue?.statuses) && cloudValue.statuses.length > 0;
  const isFromMe = [
    body?.fromMe,
    body?.message?.fromMe,
    body?.data?.fromMe,
    body?.data?.key?.fromMe,
    body?.key?.fromMe,
    firstMessage?.fromMe,
    cloudMessage?.fromMe,
    cloudMessage?.from_me
  ].some(Boolean);
  const receivedAt = parseWebhookTimestamp(
    firstDefined(
      body?.timestamp,
      body?.messageTimestamp,
      body?.message?.timestamp,
      body?.data?.timestamp,
      body?.data?.messageTimestamp,
      firstMessage?.timestamp,
      cloudMessage?.timestamp
    )
  );

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
    message,
    receivedAt,
    isInbound: !hasStatusUpdate && !isFromMe
  };
}
