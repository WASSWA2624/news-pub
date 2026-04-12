import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";
import { sanitizeMediaUrl } from "@/lib/security";

const imageProxyCacheControl = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

function isPrivateIpv4Address(value) {
  const [first = 0, second = 0] = `${value || ""}`
    .split(".")
    .map((segment) => Number.parseInt(segment, 10));

  return (
    first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
  );
}

function isPrivateIpv6Address(value) {
  const normalizedValue = `${value || ""}`.toLowerCase();

  return (
    normalizedValue === "::1"
    || normalizedValue.startsWith("fc")
    || normalizedValue.startsWith("fd")
    || normalizedValue.startsWith("fe80")
  );
}

function isPrivateNetworkAddress(value) {
  const version = isIP(`${value || ""}`);

  if (version === 4) {
    return isPrivateIpv4Address(value);
  }

  if (version === 6) {
    return isPrivateIpv6Address(value);
  }

  return false;
}

async function assertPublicRemoteImageHost(hostname) {
  const normalizedHostname = `${hostname || ""}`.trim().toLowerCase();

  if (
    !normalizedHostname
    || normalizedHostname === "localhost"
    || normalizedHostname.endsWith(".local")
    || normalizedHostname.endsWith(".internal")
  ) {
    throw new Error("Blocked image host.");
  }

  if (isPrivateNetworkAddress(normalizedHostname)) {
    throw new Error("Blocked image host.");
  }

  const records = await lookup(normalizedHostname, { all: true, verbatim: true });

  if (!records.length || records.some((record) => isPrivateNetworkAddress(record.address))) {
    throw new Error("Blocked image host.");
  }
}

function parseByteLength(value) {
  const parsedValue = Number.parseInt(`${value || ""}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const remoteUrl = sanitizeMediaUrl(searchParams.get("url"));

  if (!remoteUrl || remoteUrl.startsWith("/") || remoteUrl.startsWith("data:image/")) {
    return NextResponse.json(
      {
        message: "A valid absolute image url is required.",
        success: false,
      },
      { status: 400 },
    );
  }

  let parsedRemoteUrl;

  try {
    parsedRemoteUrl = new URL(remoteUrl);
    await assertPublicRemoteImageHost(parsedRemoteUrl.hostname);
  } catch {
    return NextResponse.json(
      {
        message: "The requested image host is not allowed.",
        success: false,
      },
      { status: 400 },
    );
  }

  let upstreamResponse;

  try {
    upstreamResponse = await fetch(parsedRemoteUrl, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "NewsPub/1.0 (+image-proxy)",
      },
      next: {
        revalidate: 86400,
      },
      redirect: "follow",
    });
  } catch {
    return NextResponse.json(
      {
        message: "The requested image could not be fetched.",
        success: false,
      },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        message: "The requested image is unavailable.",
        success: false,
      },
      { status: 502 },
    );
  }

  const contentType = `${upstreamResponse.headers.get("content-type") || ""}`.split(";")[0].trim().toLowerCase();
  const contentLength = parseByteLength(upstreamResponse.headers.get("content-length"));

  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      {
        message: "The requested asset is not an image.",
        success: false,
      },
      { status: 415 },
    );
  }

  if (contentLength !== null && contentLength > env.media.maxRemoteFileBytes) {
    return NextResponse.json(
      {
        message: "The requested image exceeds the configured size limit.",
        success: false,
      },
      { status: 413 },
    );
  }

  return new Response(upstreamResponse.body, {
    headers: {
      "Cache-Control": imageProxyCacheControl,
      "Content-Disposition": 'inline; filename="editorial-image"',
      "Content-Type": contentType,
      ...(contentLength !== null ? { "Content-Length": `${contentLength}` } : {}),
    },
    status: 200,
  });
}
