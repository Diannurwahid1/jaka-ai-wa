export type MemoryRole = "user" | "assistant";

export type MemoryMessage = {
  role: MemoryRole;
  content: string;
  createdAt: string;
};

export type MemorySession = {
  phone: string;
  messages: MemoryMessage[];
  summary: string;
  lastActive: string;
};

export interface MemoryStore {
  get(phone: string): MemorySession | undefined;
  set(phone: string, session: MemorySession): void;
  clear(phone: string): void;
  entries(): IterableIterator<[string, MemorySession]>;
}
