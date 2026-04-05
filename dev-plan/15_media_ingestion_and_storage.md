# 15 Media Ingestion And Storage

Source sections: 7, 8, 15, 18, 22, 23.
Atomic aspect: remote media ingestion, storage, and media-library management only.
Prerequisite: step 14.

## Goal

Safely ingest provider images into managed storage and expose them through the existing media infrastructure.

## Reuse First

- Reuse the existing storage adapter abstraction, media-variant generation flow, and media-library admin surface.
- Extend the current media pipeline instead of building a separate news-image subsystem.

## Implement

1. Add a remote-media ingestion service for provider-supplied image URLs.
2. Validate protocol, MIME type, size, and fetch failures before storing any asset.
3. Store source URL, attribution, caption, alt text, and license notes when available.
4. Generate responsive variants using the existing image tooling.
5. Reuse the media library screen so admins can inspect imported assets and their metadata.
6. Support both local and S3-compatible storage drivers without changing the calling code.
7. Define graceful fallback behavior when no safe image can be stored.

## Required Outputs

- media-ingestion services
- media library screen updates
- storage integration tests
- variant generation or ingestion tests

## Verify

- unsafe or invalid remote images are rejected
- stored assets work with both configured storage drivers
- imported media metadata stays queryable in the admin UI
- website and social flows can consume the stored asset output instead of hotlinking unmanaged images

## Exit Criteria

- NewsPub has a managed media pipeline ready for website and social publication
