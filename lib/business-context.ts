import { AsyncLocalStorage } from "node:async_hooks";

type BusinessContext = {
  businessId: string;
};

const storage = new AsyncLocalStorage<BusinessContext>();

/**
 * Run a callback with the given businessId stored in async-local context.
 * Internal helpers can read it via currentBusinessId() without threading the
 * value through every function signature.
 */
export function runInBusinessContext<T>(businessId: string, fn: () => Promise<T> | T): Promise<T> | T {
  if (!businessId) {
    throw new Error("businessId is required for business context");
  }
  return storage.run({ businessId }, fn);
}

/**
 * Get the businessId for the current async-local context.
 * Throws if called outside runInBusinessContext (programmer error).
 */
export function currentBusinessId(): string {
  const context = storage.getStore();
  if (!context?.businessId) {
    throw new Error("No business context available. Wrap caller in runInBusinessContext().");
  }
  return context.businessId;
}

/**
 * Get the businessId if available, or undefined when running outside any
 * business context (e.g. webhook before resolving the business).
 */
export function maybeBusinessId(): string | undefined {
  return storage.getStore()?.businessId;
}
