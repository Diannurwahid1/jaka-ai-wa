// Token cost helpers for AI chat usage analytics.
//
// Pricing is keyed by lowercased model name. Numbers are USD per 1 million
// tokens. Defaults reflect public Sumopod dashboard pricing for seed-2-0-mini
// at the time of writing — adjust via the UI (stored per-browser) when the
// upstream provider changes their rates.

export type TokenPrice = {
  /** Display label for the pricing row */
  label: string;
  /** USD per 1 million prompt/input tokens */
  inputPerMillion: number;
  /** USD per 1 million completion/output tokens */
  outputPerMillion: number;
};

export const DEFAULT_TOKEN_PRICES: Record<string, TokenPrice> = {
  "seed-2-0-mini": {
    label: "Sumopod • seed-2-0-mini",
    inputPerMillion: 0.11,
    outputPerMillion: 0.55
  },
  "seed-2-0-pro": {
    label: "Sumopod • seed-2-0-pro",
    inputPerMillion: 0.55,
    outputPerMillion: 2.2
  },
  "gpt-4o-mini": {
    label: "OpenAI • gpt-4o-mini",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6
  }
};

export const DEFAULT_USD_TO_IDR = 16450;

export type UsageBreakdown = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type CostBreakdown = {
  costUsd: number;
  costIdr: number;
  inputUsd: number;
  outputUsd: number;
};

export function computeCost(
  usage: UsageBreakdown,
  price: Pick<TokenPrice, "inputPerMillion" | "outputPerMillion">,
  usdToIdr: number
): CostBreakdown {
  const inputUsd = (usage.promptTokens / 1_000_000) * price.inputPerMillion;
  const outputUsd = (usage.completionTokens / 1_000_000) * price.outputPerMillion;
  const costUsd = inputUsd + outputUsd;
  return {
    inputUsd,
    outputUsd,
    costUsd,
    costIdr: costUsd * usdToIdr
  };
}

export function findPriceForModel(
  model: string,
  prices: Record<string, TokenPrice>
): TokenPrice | undefined {
  if (!model) {
    return undefined;
  }
  const key = model.toLowerCase();
  if (prices[key]) {
    return prices[key];
  }
  // Match by prefix to support versioned model ids like seed-2-0-mini-260215.
  const matchedKey = Object.keys(prices).find((candidate) =>
    key.startsWith(candidate.toLowerCase())
  );
  return matchedKey ? prices[matchedKey] : undefined;
}

export function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "$0";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function formatIdr(value: number) {
  if (!Number.isFinite(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatTokens(value: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}
