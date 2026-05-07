type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionRequest = {
  apiUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
};

export function resolveChatCompletionsUrl(apiUrl: string) {
  const trimmed = apiUrl.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/\/chat\/completions\/?$/i.test(trimmed)) {
    return trimmed;
  }

  if (/\/responses\/?$/i.test(trimmed)) {
    return trimmed.replace(/\/responses\/?$/i, "/chat/completions");
  }

  if (/\/api\/v\d+\/?$/i.test(trimmed)) {
    return `${trimmed.replace(/\/$/, "")}/chat/completions`;
  }

  return trimmed;
}

export async function postChatCompletion(request: ChatCompletionRequest) {
  const signal = request.timeoutMs && request.timeoutMs > 0 ? AbortSignal.timeout(request.timeoutMs) : undefined;

  const response = await fetch(resolveChatCompletionsUrl(request.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
      ...request.extraHeaders
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens
    }),
    signal
  });

  return response;
}
