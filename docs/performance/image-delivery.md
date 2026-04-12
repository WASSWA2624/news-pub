# Editorial Image Delivery Strategy

## Decision

NewsPub now treats arbitrary editorial image hosts as untrusted for direct rendering. Public pages use a two-path model:

- Same-origin and explicitly approved remote hosts render directly through `next/image`.
- Everything else is rewritten to `/api/media/proxy?url=...`, which keeps delivery on a first-party origin and makes the image optimizer path predictable.

## Why

- Third-party editorial hosts were bypassing the optimizer and falling back to plain `<img>`, which made LCP and cache behavior inconsistent.
- A controlled proxy prevents homepage and story-hero images from depending on unknown cache headers, formats, or intermittent third-party failures.
- Preserving intrinsic dimensions and adding blur placeholders reduces visible layout movement on cards, lists, and story media.

## Implementation Notes

- `src/lib/media/index.js` now routes unknown remote images through the proxy and preserves direct rendering only for approved hosts.
- `src/app/api/media/proxy/route.js` rejects localhost, private IP ranges, and DNS resolutions that collapse to private space, which reduces SSRF risk.
- `src/components/common/responsive-image.js` always resolves through the safe image path and applies a lightweight generated blur placeholder when practical.
- Structured story HTML now emits `loading`, `decoding`, and width/height hints for inline gallery images.

## Tradeoffs

- The proxy adds one controlled hop for previously direct third-party images, so first uncached requests can be marginally slower.
- Blur placeholders are synthetic. They improve perceived stability but do not replace producing real first-party derivatives for important hero images.
- SVG fixture images used in CI are for repeatability, not to model final newsroom photography quality.

## Operator Guidance

- Prefer saving true hero assets into first-party storage when editorial tooling supports it. The proxy is the safety net, not the preferred LCP path.
- Keep `NEXT_IMAGE_REMOTE_HOSTS` limited to hosts that are operationally trusted and consistently cacheable.
- When a route is image-heavy, verify the `sizes` hint in the calling component before widening the image layout.
