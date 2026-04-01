import { readSettings } from "@/lib/settings";
import { MemoryMessage } from "@/types/memory";

export async function summarizeConversation(
  messages: MemoryMessage[],
  existingSummary?: string
) {
  if (messages.length === 0) {
    return existingSummary?.trim() ?? "";
  }

  const settings = await readSettings();

  if (!settings.aiApiKey || !settings.aiApiUrl) {
    throw new Error("AI configuration is incomplete.");
  }

  const summarySeed = existingSummary?.trim()
    ? `Ringkasan sebelumnya:\n${existingSummary}\n\n`
    : "";

  const response = await fetch(settings.aiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages: [
        {
          role: "system",
          content:
            "Ringkas percakapan menjadi konteks penting: intent user, kebutuhan, preferensi, info penting, dan keputusan. Maksimal 5 kalimat. Tulis ringkas, padat, dan fokus ke konteks yang masih relevan untuk chat berikutnya."
        },
        {
          role: "user",
          content: `${summarySeed}Percakapan baru:\n${JSON.stringify(messages)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 180
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Summary request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || existingSummary?.trim() || "";
}
