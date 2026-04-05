# ADR 003: Secrets And Destination Authentication

- Status: Accepted
- Date: 2026-04-05

## Context

NewsPub integrates with third-party providers and social destinations. Release 1 must keep credentials and tokens out of public runtime surfaces while preserving operational traceability.

## Decision

- Provider credentials remain env-only and are resolved at runtime from:
  - `MEDIASTACK_API_KEY`
  - `NEWSDATA_API_KEY`
  - `NEWSAPI_API_KEY`
- Destination tokens are encrypted before persistence using `DESTINATION_TOKEN_ENCRYPTION_KEY`.
- Public routes expose only public-safe app and locale configuration.
- Social publication happens through publish adapters that consume encrypted tokens, never raw browser-side secrets.
- Remote media ingestion validates URL protocol, content type, and size before any storage write.

## Consequences

- Provider and destination credentials follow distinct handling rules that match their risk profiles.
- Admins can manage destination connectivity without exposing tokens in the UI or public payloads.
- Platform failures are observable through `PublishAttempt` and `AuditEvent` without leaking secrets.

