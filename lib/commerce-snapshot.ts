import { readSettings } from "@/lib/settings";

export type CommerceSnapshot = {
  schemaVersion: string;
  generatedAt: string;
  store?: {
    name?: string;
    baseUrl?: string;
  };
  products?: unknown[];
  vouchers?: unknown[];
  promos?: unknown[];
};

type CommerceSnapshotCacheEntry = {
  etag?: string;
  snapshot: CommerceSnapshot;
  fetchedAt: number;
};

export type CommerceSnapshotResult = {
  snapshot: CommerceSnapshot;
  status: number;
  etag?: string;
  notModified: boolean;
  fetchedAt: string;
  counts: {
    products: number;
    vouchers: number;
    promos: number;
  };
};

const snapshotCache = new Map<string, CommerceSnapshotCacheEntry>();

function normalizePath(path: string) {
  const trimmed = path.trim() || "/api/integrations/creator/catalog-snapshot";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function resolveRequestOrigin(baseUrl: string) {
  return normalizeBaseUrl(
    process.env.COMMERCE_ORIGIN ||
      process.env.CREATOR_COMMERCE_ORIGIN ||
      process.env.NEXTAUTH_URL ||
      process.env.APP_URL ||
      baseUrl
  );
}

function resolveCommerceConfig(settings: Awaited<ReturnType<typeof readSettings>>) {
  const baseUrl = normalizeBaseUrl(
    settings.commerceBaseUrl ||
      process.env.COMMERCE_BASE_URL ||
      process.env.CREATOR_COMMERCE_BASE_URL ||
      process.env.NEXT_PUBLIC_STORE_URL ||
      ""
  );
  const snapshotPath = normalizePath(
    settings.commerceSnapshotPath ||
      process.env.COMMERCE_SNAPSHOT_PATH ||
      process.env.CREATOR_COMMERCE_SNAPSHOT_PATH ||
      "/api/integrations/creator/catalog-snapshot"
  );
  const secret =
    settings.commerceIntegrationSecret ||
    process.env.COMMERCE_INTEGRATION_SECRET ||
    process.env.CREATOR_INTEGRATION_SECRET ||
    "";

  return {
    enabled:
      settings.commerceIntegrationEnabled ||
      (process.env.COMMERCE_INTEGRATION_ENABLED ?? process.env.CREATOR_COMMERCE_ENABLED ?? "")
        .trim()
        .toLowerCase() === "true",
    baseUrl,
    snapshotPath,
    secret,
    origin: resolveRequestOrigin(baseUrl)
  };
}

function countItems(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function validateSnapshot(value: unknown): CommerceSnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("Commerce snapshot response bukan JSON object.");
  }

  const snapshot = value as CommerceSnapshot;

  if (String(snapshot.schemaVersion ?? "").trim() !== "1") {
    throw new Error("Commerce snapshot schemaVersion tidak didukung.");
  }

  if (!String(snapshot.generatedAt ?? "").trim()) {
    throw new Error("Commerce snapshot tidak punya generatedAt.");
  }

  if (!Array.isArray(snapshot.products)) {
    throw new Error("Commerce snapshot tidak punya products array.");
  }

  if (!Array.isArray(snapshot.vouchers)) {
    throw new Error("Commerce snapshot tidak punya vouchers array.");
  }

  if (!Array.isArray(snapshot.promos)) {
    throw new Error("Commerce snapshot tidak punya promos array.");
  }

  return snapshot;
}

export async function fetchCommerceSnapshot(businessId: string): Promise<CommerceSnapshotResult> {
  const settings = await readSettings(businessId);
  const config = resolveCommerceConfig(settings);

  if (!config.enabled) {
    throw new Error("Commerce integration belum aktif.");
  }

  if (!config.baseUrl) {
    throw new Error("Commerce Base URL belum diisi.");
  }

  if (!config.secret) {
    throw new Error("Commerce Integration Secret belum diisi.");
  }

  const url = new URL(config.snapshotPath, config.baseUrl);
  const cacheKey = `${businessId}:${url.toString()}`;
  const cached = snapshotCache.get(cacheKey);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secret}`,
    Accept: "application/json",
    Origin: config.origin
  };

  if (cached?.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000)
  });
  const etag = response.headers.get("etag") ?? undefined;
  const fetchedAt = Date.now();

  if (response.status === 304) {
    if (!cached) {
      throw new Error("Commerce snapshot 304 diterima tanpa cache lokal.");
    }

    return {
      snapshot: cached.snapshot,
      status: response.status,
      etag: etag ?? cached.etag,
      notModified: true,
      fetchedAt: new Date(fetchedAt).toISOString(),
      counts: {
        products: countItems(cached.snapshot.products),
        vouchers: countItems(cached.snapshot.vouchers),
        promos: countItems(cached.snapshot.promos)
      }
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Commerce snapshot failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const snapshot = validateSnapshot(await response.json());

  snapshotCache.set(cacheKey, {
    etag,
    snapshot,
    fetchedAt
  });

  return {
    snapshot,
    status: response.status,
    etag,
    notModified: false,
    fetchedAt: new Date(fetchedAt).toISOString(),
    counts: {
      products: countItems(snapshot.products),
      vouchers: countItems(snapshot.vouchers),
      promos: countItems(snapshot.promos)
    }
  };
}

export async function testCommerceSnapshotConnection(businessId: string) {
  const result = await fetchCommerceSnapshot(businessId);
  const storeName = result.snapshot.store?.name || "Commerce";

  return {
    ...result,
    summary: `${storeName} snapshot OK: ${result.counts.products} produk, ${result.counts.vouchers} voucher, ${result.counts.promos} promo${result.notModified ? " (304 cache)" : ""}.`
  };
}
