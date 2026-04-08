import { AppSettings } from "@/types";
import {
  CreatorDraft,
  CreatorPlatform,
  CreatorPublishProvider,
  CreatorPublishSimulation
} from "@/types/creator";

import { readSettings, writeSettings } from "@/lib/settings";

type SocialConnectionResult = {
  ok: boolean;
  provider: CreatorPublishProvider;
  summary: string;
  details: Record<string, unknown>;
};

type PublishExecutionResult = {
  provider: CreatorPublishProvider;
  targetLabel: string;
  summary: string;
  externalPostId?: string;
  externalPostUrl?: string;
  requestPreview: Record<string, unknown>;
};

const linkedInScopes = [
  "openid",
  "profile",
  "w_member_social",
  "w_organization_social",
  "rw_organization_admin"
];

function redactToken(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "********";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function toIsoExpiry(expiresIn?: number) {
  if (!expiresIn || !Number.isFinite(expiresIn)) {
    return "";
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function clipText(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function buildDraftText(draft: CreatorDraft) {
  const fallback = draft.parts.map((part) => part.content).join("\n\n").trim();
  return clipText(draft.caption?.trim() || fallback || draft.topic.trim(), 2800);
}

function buildDraftTextUnclipped(draft: CreatorDraft) {
  const fallback = draft.parts.map((part) => part.content).join("\n\n").trim();
  return draft.caption?.trim() || fallback || draft.topic.trim();
}

function graphUrl(version: string, path: string) {
  return `https://graph.facebook.com/${version.replace(/^v/i, "v")}/${path.replace(/^\//, "")}`;
}

function threadsGraphUrl(settings: AppSettings, path: string) {
  const baseUrl = settings.threadsApiBaseUrl.trim() || "https://graph.threads.net";
  const version = settings.threadsApiVersion.trim() || "v1.0";
  return `${baseUrl.replace(/\/$/, "")}/${version.replace(/^v/i, "v")}/${path.replace(/^\//, "")}`;
}

function ensureMetaConfig(settings: AppSettings, platform: CreatorPlatform) {
  if (!settings.metaPageAccessToken.trim()) {
    throw new Error("Meta page access token belum diisi di root Settings.");
  }

  if (platform === "instagram") {
    if (!settings.metaInstagramBusinessId.trim()) {
      throw new Error("Meta Instagram Business ID belum diisi di root Settings.");
    }

    return {
      provider: "meta" as const,
      graphVersion: settings.metaGraphVersion.trim() || "v23.0",
      pageAccessToken: settings.metaPageAccessToken.trim(),
      actorId: settings.metaInstagramBusinessId.trim(),
      targetLabel: settings.metaInstagramUsername.trim() || settings.metaInstagramBusinessId.trim()
    };
  }

  if (!settings.metaFacebookPageId.trim()) {
    throw new Error("Meta Facebook Page ID belum diisi di root Settings.");
  }

  return {
    provider: "meta" as const,
    graphVersion: settings.metaGraphVersion.trim() || "v23.0",
    pageAccessToken: settings.metaPageAccessToken.trim(),
    actorId: settings.metaFacebookPageId.trim(),
    targetLabel: settings.metaFacebookPageName.trim() || settings.metaFacebookPageId.trim()
  };
}

function ensureLinkedInConfig(settings: AppSettings) {
  if (!settings.linkedinAccessToken.trim()) {
    throw new Error("LinkedIn access token belum ada. Jalankan OAuth atau isi token manual di root Settings.");
  }

  const actorUrn = settings.linkedinOrganizationUrn.trim() || settings.linkedinAuthorUrn.trim();

  if (!actorUrn) {
    throw new Error("LinkedIn Author URN atau Organization URN belum diisi di root Settings.");
  }

  return {
    provider: "linkedin" as const,
    accessToken: settings.linkedinAccessToken.trim(),
    refreshToken: settings.linkedinRefreshToken.trim(),
    actorUrn,
    targetLabel: settings.linkedinOrganizationUrn.trim() || settings.linkedinAuthorUrn.trim()
  };
}

function ensureThreadsConfig(settings: AppSettings) {
  if (!settings.threadsAccessToken.trim()) {
    throw new Error("Threads access token belum diisi di root Settings.");
  }

  return {
    provider: "meta" as const,
    accessToken: settings.threadsAccessToken.trim(),
    userId: settings.threadsUserId.trim() || "me",
    username: settings.threadsUsername.trim() || settings.threadsUserId.trim() || "threads-account"
  };
}

async function fetchJsonOrThrow<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const raw = await response.text();
  let data: T | null = null;

  try {
    data = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // ignore parse failure and keep raw
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${raw}`);
  }

  return data as T;
}

async function postGraph(path: string, params: URLSearchParams, settings: AppSettings) {
  const url = graphUrl(settings.metaGraphVersion.trim() || "v23.0", path);
  return fetchJsonOrThrow<Record<string, unknown>>(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(45000)
  });
}

async function getGraph(path: string, fields: string, settings: AppSettings) {
  const token = settings.metaPageAccessToken.trim();
  const url = new URL(graphUrl(settings.metaGraphVersion.trim() || "v23.0", path));
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);

  return fetchJsonOrThrow<Record<string, unknown>>(url.toString(), {
    signal: AbortSignal.timeout(20000)
  });
}

async function postThreads(path: string, params: URLSearchParams, settings: AppSettings) {
  const url = threadsGraphUrl(settings, path);
  return fetchJsonOrThrow<Record<string, unknown>>(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(45000)
  });
}

async function getThreads(path: string, params: URLSearchParams, settings: AppSettings) {
  const url = new URL(threadsGraphUrl(settings, path));
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return fetchJsonOrThrow<Record<string, unknown>>(url.toString(), {
    signal: AbortSignal.timeout(20000)
  });
}

function buildThreadChainTexts(draft: CreatorDraft) {
  if (draft.type === "thread_series" && draft.parts.length > 0) {
    return draft.parts
      .map((part) => part.content.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return [buildDraftTextUnclipped(draft)];
}

function getThreadsMediaType(draft: CreatorDraft, index: number) {
  if (index === 0 && draft.imageUrl) {
    return "IMAGE";
  }

  return "TEXT";
}

async function refreshLinkedInAccessTokenIfNeeded() {
  const settings = await readSettings();
  const refreshToken = settings.linkedinRefreshToken.trim();
  const expiresAt = settings.linkedinTokenExpiresAt.trim();

  if (!settings.linkedinAccessToken.trim()) {
    return settings;
  }

  if (!refreshToken || !expiresAt) {
    return settings;
  }

  const expiryTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryTime) || expiryTime > Date.now() + 5 * 60 * 1000) {
    return settings;
  }

  if (!settings.linkedinClientId.trim() || !settings.linkedinClientSecret.trim()) {
    return settings;
  }

  const payload = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: settings.linkedinClientId.trim(),
    client_secret: settings.linkedinClientSecret.trim()
  });

  const tokenData = await fetchJsonOrThrow<{
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  }>("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
    signal: AbortSignal.timeout(30000)
  });

  const nextSettings = await writeSettings({
    linkedinAccessToken: String(tokenData.access_token ?? "").trim() || settings.linkedinAccessToken,
    linkedinRefreshToken: String(tokenData.refresh_token ?? "").trim() || settings.linkedinRefreshToken,
    linkedinTokenExpiresAt: toIsoExpiry(Number(tokenData.expires_in ?? 0)) || settings.linkedinTokenExpiresAt
  });

  return nextSettings;
}

async function fetchLinkedInUserInfo(accessToken: string) {
  return fetchJsonOrThrow<Record<string, unknown>>("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    signal: AbortSignal.timeout(20000)
  });
}

async function uploadLinkedInAsset(accessToken: string, actorUrn: string, imageUrl: string) {
  const registerPayload = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: actorUrn,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent"
        }
      ]
    }
  };

  const registerData = await fetchJsonOrThrow<{
    value?: {
      asset?: string;
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
          uploadUrl?: string;
        };
      };
    };
  }>("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify(registerPayload),
    signal: AbortSignal.timeout(30000)
  });

  const asset = registerData.value?.asset;
  const uploadUrl =
    registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;

  if (!asset || !uploadUrl) {
    throw new Error("LinkedIn register upload tidak mengembalikan asset/upload URL.");
  }

  const imageResponse = await fetch(imageUrl, {
    signal: AbortSignal.timeout(45000)
  });

  if (!imageResponse.ok) {
    throw new Error(`Gagal mengambil image source untuk LinkedIn (${imageResponse.status}).`);
  }

  const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
  const imageBuffer = await imageResponse.arrayBuffer();

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType
    },
    body: imageBuffer,
    signal: AbortSignal.timeout(60000)
  });

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw new Error(`LinkedIn binary upload gagal (${uploadResponse.status}): ${detail}`);
  }

  return asset;
}

function buildPublishSimulationResult(
  draft: CreatorDraft,
  provider: CreatorPublishProvider,
  targetLabel: string,
  mode: "text" | "image",
  requestPreview: Record<string, unknown>,
  steps: string[],
  warnings: string[],
  error?: string
): CreatorPublishSimulation {
  return {
    draftId: draft.draftId,
    platform: draft.platform,
    provider,
    supported: !error,
    simulated: true,
    targetLabel,
    mode,
    summary: error
      ? error
      : `Simulator upload ${draft.platform} siap memakai ${provider} ke target ${targetLabel}.`,
    steps,
    warnings,
    requestPreview,
    error
  };
}

export async function getLinkedInAuthorizationUrl() {
  const settings = await readSettings();

  if (!settings.linkedinClientId.trim() || !settings.linkedinRedirectUri.trim()) {
    throw new Error("LinkedIn Client ID dan Redirect URI wajib diisi di root Settings.");
  }

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", settings.linkedinClientId.trim());
  url.searchParams.set("redirect_uri", settings.linkedinRedirectUri.trim());
  url.searchParams.set("scope", linkedInScopes.join(" "));
  url.searchParams.set("state", `wa-ai-${Date.now()}`);

  return url.toString();
}

export async function exchangeLinkedInAuthorizationCode(code: string) {
  const settings = await readSettings();

  if (!settings.linkedinClientId.trim() || !settings.linkedinClientSecret.trim() || !settings.linkedinRedirectUri.trim()) {
    throw new Error("LinkedIn OAuth config belum lengkap di root Settings.");
  }

  const payload = new URLSearchParams({
    grant_type: "authorization_code",
    code: code.trim(),
    client_id: settings.linkedinClientId.trim(),
    client_secret: settings.linkedinClientSecret.trim(),
    redirect_uri: settings.linkedinRedirectUri.trim()
  });

  const tokenData = await fetchJsonOrThrow<{
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  }>("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
    signal: AbortSignal.timeout(30000)
  });

  const accessToken = String(tokenData.access_token ?? "").trim();

  if (!accessToken) {
    throw new Error("LinkedIn OAuth tidak mengembalikan access token.");
  }

  let linkedinAuthorUrn = settings.linkedinAuthorUrn;

  try {
    const userInfo = await fetchLinkedInUserInfo(accessToken);
    const sub = String(userInfo.sub ?? "").trim();

    if (sub) {
      linkedinAuthorUrn = `urn:li:person:${sub}`;
    }
  } catch {
    // Leave author URN untouched when userinfo scope is not granted.
  }

  const nextSettings = await writeSettings({
    linkedinAccessToken: accessToken,
    linkedinRefreshToken: String(tokenData.refresh_token ?? "").trim(),
    linkedinTokenExpiresAt: toIsoExpiry(Number(tokenData.expires_in ?? 0)),
    linkedinAuthorUrn
  });

  return nextSettings;
}

export async function testMetaConnection(): Promise<SocialConnectionResult> {
  const settings = await readSettings();
  const config = ensureMetaConfig(settings, "facebook");
  const pageInfo = await getGraph(config.actorId, "id,name,category", settings);

  let instagramInfo: Record<string, unknown> | null = null;

  if (settings.metaInstagramBusinessId.trim()) {
    instagramInfo = await getGraph(settings.metaInstagramBusinessId.trim(), "id,username", settings);
  }

  return {
    ok: true,
    provider: "meta",
    summary: `Meta tersambung ke Page ${String(pageInfo.name ?? config.actorId)}.`,
    details: {
      pageId: pageInfo.id,
      pageName: pageInfo.name,
      category: pageInfo.category,
      instagramId: instagramInfo?.id ?? "",
      instagramUsername: instagramInfo?.username ?? ""
    }
  };
}

export async function testLinkedInConnection(): Promise<SocialConnectionResult> {
  const settings = await refreshLinkedInAccessTokenIfNeeded();
  const config = ensureLinkedInConfig(settings);

  const url = new URL("https://api.linkedin.com/v2/ugcPosts");
  url.searchParams.set("q", "authors");
  url.searchParams.set("authors", `List(${config.actorUrn})`);
  url.searchParams.set("count", "1");

  const posts = await fetchJsonOrThrow<{ paging?: Record<string, unknown> }>(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0"
    },
    signal: AbortSignal.timeout(20000)
  });

  return {
    ok: true,
    provider: "linkedin",
    summary: `LinkedIn token valid untuk actor ${config.targetLabel}.`,
    details: {
      actorUrn: config.actorUrn,
      refreshToken: config.refreshToken ? redactToken(config.refreshToken) : "",
      accessToken: redactToken(config.accessToken),
      paging: posts.paging ?? {}
    }
  };
}

export async function testThreadsConnection(): Promise<SocialConnectionResult> {
  const settings = await readSettings();
  const config = ensureThreadsConfig(settings);
  const params = new URLSearchParams({
    fields: "id,username",
    access_token: config.accessToken
  });
  const profile = await getThreads(`/${config.userId}`, params, settings);

  return {
    ok: true,
    provider: "meta",
    summary: `Threads token valid untuk @${String(profile.username ?? config.username)}.`,
    details: {
      id: profile.id,
      username: profile.username ?? config.username
    }
  };
}

export async function simulatePlatformPublish(draft: CreatorDraft): Promise<CreatorPublishSimulation> {
  const settings = await readSettings();
  const text = buildDraftText(draft);

  if (draft.platform === "threads") {
    try {
      const config = ensureThreadsConfig(settings);
      const chain = buildThreadChainTexts(draft);
      const requestPreview = {
        baseUrl: threadsGraphUrl(settings, `/${config.userId}/threads`),
        publishUrl: threadsGraphUrl(settings, `/${config.userId}/threads_publish`),
        posts: chain.map((content, index) => ({
          step: index === 0 ? "main" : `reply_${index}`,
          create: {
            media_type: getThreadsMediaType(draft, index),
            text: content,
            image_url: index === 0 ? draft.imageUrl || undefined : undefined,
            reply_to_id: index === 0 ? undefined : `<thread_id_${index}>`
          },
          publish: {
            creation_id: `<creation_id_${index + 1}>`
          }
        }))
      };

      return buildPublishSimulationResult(
        draft,
        "meta",
        config.username,
        "text",
        requestPreview,
        [
          "Create main thread",
          "Publish main thread",
          ...chain.slice(1).flatMap((_, index) => [`Create reply ${index + 1}`, `Publish reply ${index + 1}`])
        ],
        []
      );
    } catch (error) {
      return buildPublishSimulationResult(
        draft,
        "meta",
        "Threads",
        "text",
        {},
        ["Validasi konfigurasi Threads"],
        [],
        error instanceof Error ? error.message : "Threads simulation failed."
      );
    }
  }

  if (draft.platform === "facebook" || draft.platform === "instagram") {
    try {
      const config = ensureMetaConfig(settings, draft.platform);
      const mode = draft.imageUrl ? "image" : "text";
      const steps =
        draft.platform === "instagram"
          ? ["Create media container", "Publish media container", "Fetch permalink"]
          : [draft.imageUrl ? "Publish photo post" : "Publish feed post"];
      const requestPreview =
        draft.platform === "instagram"
          ? {
              endpoint: `/${config.actorId}/media -> /${config.actorId}/media_publish`,
              payload: {
                image_url: draft.imageUrl || "<required>",
                caption: text,
                access_token: "[redacted]"
              }
            }
          : {
              endpoint: draft.imageUrl ? `/${config.actorId}/photos` : `/${config.actorId}/feed`,
              payload: {
                url: draft.imageUrl || undefined,
                message: draft.imageUrl ? undefined : text,
                caption: draft.imageUrl ? text : undefined,
                access_token: "[redacted]"
              }
            };

      return buildPublishSimulationResult(
        draft,
        "meta",
        config.targetLabel,
        mode,
        requestPreview,
        steps,
        [],
        draft.platform === "instagram" && !draft.imageUrl
          ? "Instagram publish memerlukan imageUrl yang valid."
          : undefined
      );
    } catch (error) {
      return buildPublishSimulationResult(
        draft,
        "meta",
        "Meta",
        draft.imageUrl ? "image" : "text",
        {},
        ["Validasi konfigurasi Meta"],
        [],
        error instanceof Error ? error.message : "Meta simulation failed."
      );
    }
  }

  try {
    const config = ensureLinkedInConfig(await refreshLinkedInAccessTokenIfNeeded());
    const hasImage = Boolean(draft.imageUrl);

    return buildPublishSimulationResult(
      draft,
      "linkedin",
      config.targetLabel,
      hasImage ? "image" : "text",
      {
        endpoint: hasImage ? "/v2/assets?action=registerUpload -> /v2/ugcPosts" : "/v2/ugcPosts",
        actorUrn: config.actorUrn,
        postPayload: {
          author: config.actorUrn,
          commentary: text,
          shareMediaCategory: hasImage ? "IMAGE" : "NONE",
          imageUrl: draft.imageUrl || undefined
        }
      },
      hasImage ? ["Register upload", "Upload binary image", "Create UGC post"] : ["Create UGC post"],
      []
    );
  } catch (error) {
    return buildPublishSimulationResult(
      draft,
      "linkedin",
      "LinkedIn",
      draft.imageUrl ? "image" : "text",
      {},
      ["Validasi konfigurasi LinkedIn"],
      [],
      error instanceof Error ? error.message : "LinkedIn simulation failed."
    );
  }
}

export async function publishDraftToPlatform(draft: CreatorDraft): Promise<PublishExecutionResult> {
  const text = buildDraftText(draft);

  if (draft.platform === "threads") {
    const settings = await readSettings();
    const config = ensureThreadsConfig(settings);
    const chain = buildThreadChainTexts(draft);
    const publishedIds: string[] = [];

    for (const [index, content] of chain.entries()) {
      const createParams = new URLSearchParams({
        media_type: getThreadsMediaType(draft, index),
        text: content,
        access_token: config.accessToken
      });

      if (index === 0 && draft.imageUrl) {
        createParams.set("image_url", draft.imageUrl);
      }

      if (index > 0) {
        createParams.set("reply_to_id", publishedIds[index - 1]);
      }

      const creation = await postThreads(`/${config.userId}/threads`, createParams, settings);
      const creationId = String(creation.id ?? "").trim();

      if (!creationId) {
        throw new Error(`Threads tidak mengembalikan creation id untuk step ${index + 1}.`);
      }

      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: config.accessToken
      });

      let publishedId = "";
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const published = await postThreads(`/${config.userId}/threads_publish`, publishParams, settings);
          publishedId = String(published.id ?? "").trim();

          if (publishedId) {
            break;
          }
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      if (!publishedId) {
        throw lastError instanceof Error
          ? lastError
          : new Error(`Threads publish gagal pada step ${index + 1}.`);
      }

      publishedIds.push(publishedId);
    }

    return {
      provider: "meta",
      targetLabel: config.username,
      summary: `Threads chain berhasil dipublish ke @${config.username} dengan ${publishedIds.length} post.`,
      externalPostId: publishedIds[0],
      requestPreview: {
        userId: config.userId,
        posts: chain,
        publishedIds
      }
    };
  }

  if (draft.platform === "facebook" || draft.platform === "instagram") {
    const settings = await readSettings();
    const config = ensureMetaConfig(settings, draft.platform);

    if (draft.platform === "instagram") {
      if (!draft.imageUrl) {
        throw new Error("Instagram publish memerlukan imageUrl pada draft.");
      }

      const createParams = new URLSearchParams({
        image_url: draft.imageUrl,
        caption: text,
        access_token: config.pageAccessToken
      });

      const mediaContainer = await postGraph(`/${config.actorId}/media`, createParams, settings);
      const creationId = String(mediaContainer.id ?? "").trim();

      if (!creationId) {
        throw new Error("Meta tidak mengembalikan creation id untuk Instagram.");
      }

      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: config.pageAccessToken
      });

      const published = await postGraph(`/${config.actorId}/media_publish`, publishParams, settings);
      const externalPostId = String(published.id ?? "").trim();

      let externalPostUrl = "";

      if (externalPostId) {
        try {
          const mediaInfo = await getGraph(externalPostId, "id,permalink", settings);
          externalPostUrl = String(mediaInfo.permalink ?? "").trim();
        } catch {
          // Best effort only.
        }
      }

      return {
        provider: "meta",
        targetLabel: config.targetLabel,
        summary: `Instagram post berhasil dipublish ke ${config.targetLabel}.`,
        externalPostId,
        externalPostUrl: externalPostUrl || undefined,
        requestPreview: {
          createMedia: {
            endpoint: `/${config.actorId}/media`,
            image_url: draft.imageUrl,
            caption: clipText(text, 160)
          },
          publishMedia: {
            endpoint: `/${config.actorId}/media_publish`,
            creation_id: creationId
          }
        }
      };
    }

    const params = new URLSearchParams({
      access_token: config.pageAccessToken
    });

    if (draft.imageUrl) {
      params.set("url", draft.imageUrl);
      params.set("caption", text);
    } else {
      params.set("message", text);
    }

    const endpoint = draft.imageUrl ? `/${config.actorId}/photos` : `/${config.actorId}/feed`;
    const published = await postGraph(endpoint, params, settings);
    const externalPostId = String(published.post_id ?? published.id ?? "").trim();
    const postIdPart = externalPostId.includes("_") ? externalPostId.split("_")[1] : externalPostId;
    const externalPostUrl = postIdPart
      ? `https://www.facebook.com/${config.actorId}/posts/${postIdPart}`
      : "";

    return {
      provider: "meta",
      targetLabel: config.targetLabel,
      summary: `Facebook post berhasil dipublish ke ${config.targetLabel}.`,
      externalPostId,
      externalPostUrl: externalPostUrl || undefined,
      requestPreview: {
        endpoint,
        message: draft.imageUrl ? undefined : clipText(text, 160),
        caption: draft.imageUrl ? clipText(text, 160) : undefined,
        imageUrl: draft.imageUrl || undefined
      }
    };
  }

  const settings = await refreshLinkedInAccessTokenIfNeeded();
  const config = ensureLinkedInConfig(settings);
  let mediaAsset: string | undefined;

  if (draft.imageUrl) {
    mediaAsset = await uploadLinkedInAsset(config.accessToken, config.actorUrn, draft.imageUrl);
  }

  const ugcPayload: Record<string, unknown> = {
    author: config.actorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text
        },
        shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
        media: mediaAsset
          ? [
              {
                status: "READY",
                description: { text: clipText(draft.topic, 200) },
                media: mediaAsset,
                title: { text: clipText(draft.topic, 200) }
              }
            ]
          : []
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify(ugcPayload),
    signal: AbortSignal.timeout(30000)
  });

  const raw = await response.text();
  let data: Record<string, unknown> | null = null;

  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    // Keep raw only.
  }

  if (!response.ok) {
    throw new Error(`LinkedIn publish gagal (${response.status}): ${raw}`);
  }

  const externalPostId =
    String(response.headers.get("x-restli-id") ?? "").trim() ||
    String(data?.id ?? "").trim();

  return {
    provider: "linkedin",
    targetLabel: config.targetLabel,
    summary: `LinkedIn post berhasil dipublish untuk ${config.targetLabel}.`,
    externalPostId: externalPostId || undefined,
    requestPreview: {
      endpoint: "/v2/ugcPosts",
      actorUrn: config.actorUrn,
      mediaAsset: mediaAsset || undefined,
      commentary: clipText(text, 160)
    }
  };
}
