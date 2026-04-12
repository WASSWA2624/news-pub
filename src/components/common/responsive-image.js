/**
 * Responsive image wrapper used for NewsPub story, card, and media rendering.
 */

import Image from "next/image";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675;
const remoteImageHostnames = new Set(
  [
    "flagcdn.com",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.S3_MEDIA_BASE_URL,
    ...`${process.env.NEXT_IMAGE_REMOTE_HOSTS || ""}`.split(","),
  ]
    .map((value) => {
      const normalizedValue = `${value || ""}`.trim();

      if (!normalizedValue) {
        return "";
      }

      try {
        return new URL(normalizedValue).hostname;
      } catch {
        return normalizedValue.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
      }
    })
    .filter(Boolean),
);

function isAbsoluteHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isNextImageEligibleRemoteUrl(value) {
  if (!isAbsoluteHttpUrl(value)) {
    return false;
  }

  try {
    return remoteImageHostnames.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/**
 * Renders a Next.js-optimized image with safe fallback dimensions for editorial media.
 *
 * @param {object} props - Image props forwarded to `next/image`.
 * @param {string} [props.alt] - Accessible alternative text.
 * @param {string} [props.className] - Optional styled-components class name.
 * @param {boolean} [props.fill=false] - Whether the image should fill its positioned parent.
 * @param {number} [props.height] - Explicit intrinsic height when `fill` is disabled.
 * @param {boolean} [props.priority=false] - Whether the image should be eagerly loaded.
 * @param {string} [props.sizes] - Responsive image sizes hint.
 * @param {string} props.src - Image source URL or local path.
 * @param {number} [props.width] - Explicit intrinsic width when `fill` is disabled.
 * @returns {JSX.Element|null} An optimized image element or `null` when no source is available.
 */
export default function ResponsiveImage({
  alt = "",
  className,
  fill = false,
  height,
  priority = false,
  sizes,
  src,
  width,
  ...rest
}) {
  if (!src) {
    return null;
  }

  if (isAbsoluteHttpUrl(src) && !isNextImageEligibleRemoteUrl(src)) {
    const { decoding, fetchPriority, loading, style, ...imgRest } = rest;

    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts must not enter Next image optimization.
      <img
        alt={alt}
        className={className}
        decoding={decoding || "async"}
        fetchPriority={priority ? "high" : fetchPriority}
        height={fill ? undefined : height || DEFAULT_HEIGHT}
        loading={priority ? "eager" : loading || "lazy"}
        src={src}
        style={fill ? { ...style, height: "100%", width: "100%" } : style}
        width={fill ? undefined : width || DEFAULT_WIDTH}
        {...imgRest}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill={fill || undefined}
      height={fill ? undefined : height || DEFAULT_HEIGHT}
      priority={priority}
      sizes={sizes || (fill ? "100vw" : undefined)}
      src={src}
      width={fill ? undefined : width || DEFAULT_WIDTH}
      {...rest}
    />
  );
}
