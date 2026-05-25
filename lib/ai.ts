import { buildContextMessages, resetIfExpired, saveMessage } from "@/lib/memory";
import { postChatCompletion } from "@/lib/ai-client";
import { retrieveKnowledgeContext } from "@/lib/rag";
import { readSettings } from "@/lib/settings";

type AskAIOptions = {
  phone?: string;
  remember?: boolean;
  useRag?: boolean;
};

export async function askAI(businessId: string, message: string, options?: AskAIOptions) {
  const settings = await readSettings(businessId);

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
    await resetIfExpired(businessId, phone);
    await saveMessage(businessId, phone, "user", message);
    messages = await buildContextMessages(businessId, phone, settings.promptSystem);
  }

  if (useRag) {
    try {
      const knowledge = await retrieveKnowledgeContext(businessId, message);

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

  const response = await postChatCompletion({
    apiUrl: settings.aiApiUrl,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    messages,
    temperature: 0.7,
    maxTokens: 300,
    timeoutMs: 25000
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "Maaf, terjadi kesalahan.";

  if (remember && phone) {
    await saveMessage(businessId, phone, "assistant", reply);
  }

  return reply;
}

export async function testAIConnection(businessId: string) {
  const settings = await readSettings(businessId);

  if (!settings.aiApiKey || !settings.aiApiUrl || !settings.aiModel) {
    throw new Error("AI configuration is incomplete.");
  }

  const response = await postChatCompletion({
    apiUrl: settings.aiApiUrl,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    messages: [
      {
        role: "system",
        content: "Reply with OK"
      },
      {
        role: "user",
        content: "health check"
      }
    ],
    temperature: 0,
    maxTokens: 8,
    timeoutMs: 15000
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const reply = String(data.choices?.[0]?.message?.content ?? "").trim();

  return {
    ok: true,
    summary: reply ? `AI merespons: ${reply.slice(0, 80)}` : "AI endpoint merespons normal."
  };
}
