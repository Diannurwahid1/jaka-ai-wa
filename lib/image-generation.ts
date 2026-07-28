import { readSettings } from "@/lib/settings";

type GenerateImageInput = {
  prompt: string;
  model?: string;
  size?: string;
};

type ImageProvider = "byteplus" | "nararouter";

const bytePlusDefaults = {
  baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
  model: "seedream-4-5-251128"
};

const naraDefaults = {
  baseUrl: "https://api-images.bynara.id/v1",
  model: "gpt-image-2"
};

const supportedBytePlusImageModelPrefixes = ["seedream-", "seededit-"];
const supportedNaraSizes = new Set(["1024x1024", "2048x2048", "3840x2160"]);

function normalizeImageProvider(value?: string): ImageProvider {
  return value?.trim().toLowerCase() === "nararouter" ? "nararouter" : "byteplus";
}

function isSupportedBytePlusImageModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return supportedBytePlusImageModelPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function normalizeNaraSize(size?: string) {
  const normalized = size?.trim() || "2048x2048";

  if (supportedNaraSizes.has(normalized)) {
    return normalized;
  }

  // NaraRouter currently supports square or 16:9 sizes only.
  // Map unsupported Creator ratios like 4:5 to the nearest safe supported size.
  if (normalized.includes("x")) {
    const [widthText, heightText] = normalized.split("x");
    const width = Number(widthText);
    const height = Number(heightText);

    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      const ratio = width / height;

      // 16:9-ish
      if (ratio > 1.45) {
        return "3840x2160";
      }
    }
  }

  return "2048x2048";
}

async function readImageConfig(businessId: string) {
  const settings = await readSettings(businessId);
  const provider = normalizeImageProvider(settings.imageProvider);

  return {
    provider,
    apiKey: settings.bytePlusApiKey.trim() || process.env.ARK_API_KEY?.trim() || "",
    baseUrl:
      settings.bytePlusBaseUrl.trim() ||
      process.env.ARK_BASE_URL?.trim() ||
      (provider === "nararouter" ? naraDefaults.baseUrl : bytePlusDefaults.baseUrl),
    imageModel:
      settings.bytePlusImageModel.trim() ||
      process.env.ARK_IMAGE_MODEL?.trim() ||
      (provider === "nararouter" ? naraDefaults.model : bytePlusDefaults.model)
  };
}

export async function hasImageGenerationConfig(businessId: string) {
  const config = await readImageConfig(businessId);
  return Boolean(config.apiKey);
}

export async function generateConfiguredImage(businessId: string, input: GenerateImageInput) {
  const config = await readImageConfig(businessId);
  const selectedModel = input.model?.trim() || config.imageModel;

  if (!config.apiKey) {
    throw new Error("Image API key is required for image generation.");
  }

  if (!selectedModel) {
    throw new Error("Image model is required for image generation.");
  }

  if (config.provider === "nararouter") {
    return generateNaraRouterImage({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: selectedModel,
      prompt: input.prompt,
      size: normalizeNaraSize(input.size)
    });
  }

  return generateBytePlusImage({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: selectedModel,
    prompt: input.prompt,
    size: input.size || "1024x1024"
  });
}

async function generateBytePlusImage(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  size: string;
}) {
  if (!isSupportedBytePlusImageModel(input.model)) {
    throw new Error(
      `BytePlus Image Model "${input.model}" tidak valid untuk endpoint /images/generations. Gunakan model image seperti seedream-4-5-251128 atau seededit-3-0-i2i-250628.`
    );
  }

  const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: input.size,
      stream: false,
      watermark: false
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`BytePlus image generation failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const first = data?.data?.[0];

  if (first?.url) {
    return {
      imageUrl: String(first.url),
      provider: "byteplus" as const
    };
  }

  if (first?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${String(first.b64_json)}`,
      provider: "byteplus" as const
    };
  }

  throw new Error("BytePlus image generation did not return a usable image payload.");
}

async function generateNaraRouterImage(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  size: string;
}) {
  const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      negative_prompt: "blurry, low quality, distorted, deformed",
      n: 1,
      size: input.size,
      quality: "medium",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`NaraRouter image generation failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const first = data?.data?.[0];

  if (first?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${String(first.b64_json)}`,
      provider: "nararouter" as const
    };
  }

  if (first?.url) {
    return {
      imageUrl: String(first.url),
      provider: "nararouter" as const
    };
  }

  throw new Error("NaraRouter image generation did not return a usable image payload.");
}
