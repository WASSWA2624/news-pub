# 18 Media Storage Adapter

Source sections: 22, 34, 5.2.
Atomic aspect: media storage, processing, and media library only.
Prerequisite: step 17.

## Goal

Implement media storage and metadata handling with interchangeable local and object storage drivers.

## Implement

1. Build the local `public/uploads` driver.
2. Build the S3-compatible object storage driver behind the same interface.
3. Store all required media metadata from section 22.2.
4. Implement responsive image processing and optimized variants.
5. Enforce upload MIME type restrictions.
6. Build the Media Library admin page for browsing uploaded and generated assets.

## Required Outputs

- storage adapter interface
- local and cloud storage implementations
- media processing pipeline
- media library admin surface

## Verify

- switching drivers requires configuration only
- metadata persists for every stored asset
- non-allowed MIME types are blocked

## Exit Criteria

- media handling is ready for generation, rendering, and admin browsing
