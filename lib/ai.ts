import { buildContextMessages, resetIfExpired, saveMessage } from "@/lib/memory";
import { retrieveKnowledgeContext } from "@/lib/rag";
import { readSettings } from "@/lib/settings";

type AskAIOptions = {
  phone?: string;
  remember?: boolean;
  useRag?: boolean;
};

export async function askAI(message: string, options?: AskAIOptions) {
  const settings = await readSettings();

  if (!settings.aiApiKey || !settings.aiApiUrl) {
    throw new Error("AI configuration is incomplete.");
  }

  const phone = options?.phone?.trim();
  const remember = Boolean(phone && options?.remember !== false);
  const useRag = options?.useRag !== false;

  let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: settings.promptSystem
    },
    {
      role: "user",
      content: message
    }
  ];

  if (remember && phone) {
    await resetIfExpired(phone);
    await saveMessage(phone, "user", message);
    messages = await buildContextMessages(phone, settings.promptSystem);
  }

  if (useRag) {
    try {
      const knowledge = await retrieveKnowledgeContext(message);

      if (knowledge.results.length > 0 && knowledge.context.trim()) {
        messages.splice(1, 0, {
          role: "system",
          content:
            `Gunakan knowledge base berikut hanya jika relevan dengan pertanyaan user. ` +
            `Jika knowledge base tidak relevan, tetap jawab berdasarkan konteks percakapan biasa.\n${knowledge.context}`
        });
      }
    } catch {
      // RAG should not block the primary reply path.
    }
  }

  const response = await fetch(settings.aiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages,
      temperature: 0.7,
      max_tokens: 300
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "Maaf, terjadi kesalahan.";

  if (remember && phone) {
    await saveMessage(phone, "assistant", reply);
  }

  return reply;
}
