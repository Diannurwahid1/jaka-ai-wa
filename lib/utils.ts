import { MessageIntent } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function detectIntent(message: string): MessageIntent {
  const normalized = message.toLowerCase();

  if (/(beli|order|checkout|pesan|booking|reservasi|daftar)/.test(normalized)) {
    return "order";
  }

  if (/(komplain|complain|keluhan|marah|jelek|error|rusak|lambat)/.test(normalized)) {
    return "complaint";
  }

  if (/(harga|promo|fitur|berapa|jadwal|alamat|info|detail)/.test(normalized)) {
    return "question";
  }

  return "general";
}
