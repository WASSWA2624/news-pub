# 23 Security Compliance And Secret Handling

Source sections: 7, 9, 10, 11, 15, 18, 22, 24, 25.
Atomic aspect: security hardening, compliance, and secret-handling only.
Prerequisite: step 22.

## Goal

Apply the security and compliance rules that let NewsPub operate safely with external providers and social destinations.

## Reuse First

- Reuse the current auth guards, input-validation pattern, and security utility layer where it still fits.
- Extend existing secret-handling and sanitization helpers before introducing new ones.

## Implement

1. Keep news-provider secrets env-only.
2. Encrypt persisted destination tokens before writing them to the database.
3. Redact secrets and tokens from logs, errors, and admin responses.
4. Enforce permission checks on all protected admin APIs.
5. Harden remote-media ingestion against unsafe protocols, MIME types, and untrusted fetch behavior.
6. Validate outbound social publish payloads against platform requirements before attempting publication.
7. Remove any remaining active AI provider flows, prompt-management flows, or retired equipment-product secrets.

## Required Outputs

- encryption and redaction utilities
- security-focused tests
- hardened admin APIs and media ingestion rules
- dependency and config cleanup for retired AI flows

## Verify

- provider credentials never appear in browser payloads or database records
- destination tokens are encrypted at rest
- logs and admin responses redact sensitive values
- retired AI and old-product secret flows are fully removed from the active app

## Exit Criteria

- NewsPub meets its Release 1 secret-handling and operational-security rules
