import { NextRequest, NextResponse } from "next/server";

async function handleProxy(request: NextRequest, { params }: { params: { encoded: string } }) {
  try {
    const encoded = params.encoded;
    
    // Remove the .jpg extension if added for crawler compatibility
    const base64Data = encoded.replace(/\.jpg$/i, "");
    
    // Base64Url decode back to the original signed URL
    const originalUrl = Buffer.from(base64Data, "base64url").toString("utf-8");

    if (!originalUrl.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL structure" }, { status: 400 });
    }

    const response = await fetch(originalUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      // Set typical crawler user-agent just in case the origin CDN strictly expects it
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MetaMediaProxy/1.0; +https://wa-ai.com)"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from upstream CDN" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const contentLength = response.headers.get("content-length");

    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          ...(contentLength ? { "Content-Length": contentLength } : {}),
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }

    const blob = await response.blob();

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    console.error("[media-proxy] Error decoding or fetching url:", error);
    return NextResponse.json({ error: "Proxy internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: { params: { encoded: string } }) {
  return handleProxy(request, context);
}

export async function HEAD(request: NextRequest, context: { params: { encoded: string } }) {
  return handleProxy(request, context);
}
