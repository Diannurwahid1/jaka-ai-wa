import { createHmac, timingSafeEqual } from "crypto";

function normalizeSecret(value: string) {
  return value.trim();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function extractBearerToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function matchesSharedSecret(expected: string, presented: string) {
  const normalizedExpected = normalizeSecret(expected);
  const normalizedPresented = normalizeSecret(presented);

  if (!normalizedExpected || !normalizedPresented) {
    return false;
  }

  return safeEqual(normalizedExpected, normalizedPresented);
}

export function matchesHeaderSecret(expected: string, headerValues: Array<string | null | undefined>) {
  const normalizedExpected = normalizeSecret(expected);

  if (!normalizedExpected) {
    return false;
  }

  return headerValues.some((value) => {
    const normalized = normalizeSecret(value ?? "");
    const bearer = extractBearerToken(normalized);
    return matchesSharedSecret(normalizedExpected, normalized) || matchesSharedSecret(normalizedExpected, bearer);
  });
}

export function verifySignedPayload(expectedSecret: string, rawBody: string, headerValues: Array<string | null | undefined>) {
  const normalizedExpected = normalizeSecret(expectedSecret);

  if (!normalizedExpected) {
    return false;
  }

  const sha256 = createHmac("sha256", normalizedExpected).update(rawBody).digest("hex");
  const sha1 = createHmac("sha1", normalizedExpected).update(rawBody).digest("hex");
  const acceptedVariants = new Set([sha256, `sha256=${sha256}`, sha1, `sha1=${sha1}`]);

  return headerValues.some((value) => {
    const normalized = normalizeSecret(value ?? "");
    if (!normalized) {
      return false;
    }

    const bearer = extractBearerToken(normalized);
    return acceptedVariants.has(normalized) || acceptedVariants.has(bearer);
  });
}
