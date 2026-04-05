# 19 Comments and Moderation

Source sections: 3.4, 24.3, 25, 5.2.
Atomic aspect: comments and moderation workflow only.
Prerequisite: step 18.

## Goal

Implement guest comments, moderation controls, and one-level reply support.

## Implement

1. Build the public comment submission API and form.
2. Enforce validation, rate limiting, spam checks, duplicate detection, and profanity filtering.
3. Support one reply level through `parentId`.
4. Build the admin Comments Moderation page.
5. Record moderation actions in moderation-event history.
6. Add optional CAPTCHA behind configuration only.

## Required Outputs

- comment submission flow
- moderation service
- comments moderation admin surface

## Verify

- approved comments render publicly
- rejected and spam comments remain hidden
- moderation actions are auditable

## Exit Criteria

- the public comment system is safe and manageable
