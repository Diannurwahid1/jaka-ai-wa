import { readSettings } from "@/lib/settings";

type GenerateBytePlusImageInput = {
  prompt: string;
  model?: string;
  size?: string;
};

const defaultBaseUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
const defaultModel = "seedream-4-5-251128";
const supportedImageModelPrefixes = ["seedream-", "seededit-"];

function isSupportedBytePlusImageModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return supportedImageModelPrefixes.some((prefix) => normalized.startsWith(prefix));
}

async function readBytePlusConfig() {
  const settings = await readSettings();
  return {
    apiKey: settings.bytePlusApiKey.trim() || process.env.ARK_API_KEY?.trim() || "",
    baseUrl: settings.bytePlusBaseUrl.trim() || process.env.ARK_BASE_URL?.trim() || defaultBaseUrl,
    imageModel:
      settings.bytePlusImageModel.trim() ||
      process.env.ARK_IMAGE_MODEL?.trim() ||
      defaultModel
  };
}

export async function hasBytePlusImageConfig() {
  const config = await readBytePlusConfig();
  return Boolean(config.apiKey);
}

export async function generateBytePlusImage(input: GenerateBytePlusImageInput) {
  const config = await readBytePlusConfig();
  const selectedModel = input.model?.trim() || config.imageModel;

  if (!config.apiKey) {
    throw new Error("BytePlus API key is required for image generation.");
  }

  if (!selectedModel) {
    throw new Error("BytePlus image model is required for image generation.");
  }

  if (!isSupportedBytePlusImageModel(selectedModel)) {
    throw new Error(
      `BytePlus Image Model "${selectedModel}" tidak valid untuk endpoint /images/generations. Gunakan model image seperti seedream-4-5-251128 atau seededit-3-0-i2i-250628.`
    );
  }

  const response = await fetch(`${config.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      prompt: input.prompt,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: input.size || "1024x1024",
      stream: false,
      watermark: false
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`BytePlus image generation failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const first = data?.data?.[0];

  if (first?.url) {
    return String(first.url);
  }

  if (first?.b64_json) {
    return `data:image/png;base64,${String(first.b64_json)}`;
  }

  throw new Error("BytePlus image generation did not return a usable image payload.");
}
