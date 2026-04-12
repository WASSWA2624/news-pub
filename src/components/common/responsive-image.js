/**
 * Responsive image wrapper used for NewsPub story, card, and media rendering.
 */

import Image from "next/image";
import { createImagePlaceholderDataUrl, getRenderableImageUrl } from "@/lib/media";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675;

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
  placeholder,
  priority = false,
  sizes,
  src,
  width,
  ...rest
}) {
  if (!src) {
    return null;
  }

  const resolvedWidth = width || DEFAULT_WIDTH;
  const resolvedHeight = height || DEFAULT_HEIGHT;
  const resolvedSrc = getRenderableImageUrl(src, {
    alt,
    height: resolvedHeight,
    width: resolvedWidth,
  });

  if (!resolvedSrc) {
    return null;
  }

  const shouldUseBlurPlaceholder =
    placeholder === undefined
      && !resolvedSrc.startsWith("data:image/")
      && (fill || resolvedWidth >= 96 || resolvedHeight >= 96);
  const blurDataURL =
    placeholder === "blur" || shouldUseBlurPlaceholder
      ? createImagePlaceholderDataUrl({
          alt,
          height: resolvedHeight,
          sourceUrl: resolvedSrc,
          width: resolvedWidth,
        })
      : undefined;

  return (
    <Image
      alt={alt}
      className={className}
      fill={fill || undefined}
      height={fill ? undefined : resolvedHeight}
      placeholder={placeholder || (shouldUseBlurPlaceholder ? "blur" : "empty")}
      priority={priority}
      blurDataURL={blurDataURL}
      sizes={sizes || (fill ? "100vw" : undefined)}
      src={resolvedSrc}
      width={fill ? undefined : resolvedWidth}
      {...rest}
    />
  );
}
