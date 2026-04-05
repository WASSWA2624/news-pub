"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import styled from "styled-components";

function formatDateLabel(locale, value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildHref(pathname, searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    params.set(key, `${value}`);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getFieldErrors(payload) {
  return payload?.issues?.fieldErrors || payload?.fieldErrors || {};
}

const Panel = styled.section`
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94)),
    radial-gradient(circle at top right, rgba(0, 95, 115, 0.14), transparent 40%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 26px 82px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  padding: clamp(1rem, 3vw, 1.5rem);

  @media (min-width: 800px) {
    padding: clamp(1.35rem, 3vw, 1.75rem);
  }
`;

const SectionHeader = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const SectionTitle = styled.h2`
  color: #16243b;
  font-family: var(--font-editorial), Georgia, serif;
  font-size: clamp(1.55rem, 4vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.05;
  margin: 0;
`;

const SectionDescription = styled.p`
  color: rgba(72, 84, 108, 0.94);
  line-height: 1.58;
  margin: 0;
  max-width: 60ch;
`;

const Notice = styled.div`
  background: ${({ $tone }) =>
    $tone === "success" ? "rgba(21, 115, 71, 0.12)" : "rgba(180, 35, 24, 0.12)"};
  border: 1px solid
    ${({ $tone, theme }) => ($tone === "success" ? theme.colors.success : theme.colors.danger)};
  border-radius: 0;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const FieldGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FieldLabel = styled.span`
  font-weight: 600;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(16, 32, 51, 0.14);
  border-radius: 0;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 48px;
  padding: 0.8rem 0.95rem;
`;

const Textarea = styled.textarea`
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(16, 32, 51, 0.14);
  border-radius: 0;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 140px;
  padding: 0.8rem 0.95rem;
  resize: vertical;
`;

const HelpText = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.9rem;
  margin: 0;
`;

const ButtonRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PrimaryButton = styled.button`
  background: linear-gradient(180deg, #274d74, #1f3e5e);
  border: none;
  border-radius: 0;
  box-shadow: 0 18px 36px rgba(31, 62, 94, 0.18);
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font: inherit;
  font-weight: 700;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: 0.82rem 1.35rem;
`;

const SecondaryButton = styled.button`
  background: rgba(247, 249, 252, 0.96);
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 0;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0.78rem 1.08rem;
`;

const CommentThread = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const CommentCard = styled.article`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 253, 0.96)),
    radial-gradient(circle at top right, rgba(36, 75, 115, 0.05), transparent 52%);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: 0;
  box-shadow: 0 12px 28px rgba(19, 34, 58, 0.04);
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: clamp(0.95rem, 2.2vw, 1.15rem);
`;

const MetaRow = styled.div`
  color: ${({ theme }) => theme.colors.muted};
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: 0.88rem;
`;

const CommentText = styled.p`
  color: rgba(65, 78, 99, 0.98);
  font-family: var(--font-editorial), Georgia, serif;
  font-size: 1.03rem;
  line-height: 1.66;
  margin: 0;
  white-space: pre-wrap;
`;

const ReplyThread = styled.div`
  border-left: 2px solid rgba(36, 75, 115, 0.16);
  display: grid;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-left: ${({ theme }) => theme.spacing.md};
  padding-left: ${({ theme }) => theme.spacing.md};
`;

const ReplyButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  justify-self: start;
  padding: 0;
`;

const Pager = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: space-between;
`;

const PagerSummary = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  margin: 0;
`;

const PagerActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PagerButton = styled(Link)`
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(16, 32, 51, 0.12);
  border-radius: 0;
  color: #183b63;
  font-weight: 700;
  padding: 0.55rem 0.95rem;
`;

function Pagination({ copy, pagination, pathname }) {
  if (!pagination || pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  return (
    <Pager aria-label="Comment pagination">
      <PagerSummary>
        {copy.commentsPaginationLabel}: {pagination.startItem}-{pagination.endItem} /{" "}
        {pagination.totalItems}
      </PagerSummary>
      <PagerActions>
        {pagination.hasPreviousPage ? (
          <PagerButton
            href={buildHref(pathname, {
              commentsPage: pagination.currentPage - 1,
            })}
          >
            {copy.previousPage}
          </PagerButton>
        ) : null}
        {pagination.hasNextPage ? (
          <PagerButton
            href={buildHref(pathname, {
              commentsPage: pagination.currentPage + 1,
            })}
          >
            {copy.nextPage}
          </PagerButton>
        ) : null}
      </PagerActions>
    </Pager>
  );
}

function createInitialFormState() {
  return {
    body: "",
    captchaAnswer: "",
    email: "",
    name: "",
  };
}

export default function PublicCommentSection({ article, copy, locale }) {
  const resolvedCopy = {
    commentBodyPlaceholder: "Share your question or experience.",
    commentCancelReplyAction: "Cancel reply",
    commentCaptchaLabel: "Captcha challenge",
    commentCaptchaPlaceholder: "Enter the answer",
    commentEmailLabel: "Email (optional)",
    commentEmailPlaceholder: "name@example.com",
    commentNameLabel: "Name",
    commentNamePlaceholder: "Your name",
    commentReplyAction: "Reply",
    commentReplyingToLabel: "Replying to",
    commentsPaginationLabel: "Comments",
    commentSubmitAction: "Submit comment",
    commentSubmitWorking: "Submitting...",
    commentSuccess:
      "Comment submitted. It will appear once an editor approves it.",
    ...copy,
  };
  const [formState, setFormState] = useState(createInitialFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [captcha, setCaptcha] = useState(article.comments.form.captcha);

  function handleReplyTo(comment) {
    setReplyTarget({
      id: comment.id,
      name: comment.name,
    });
    setNotice(null);
    window.document.getElementById("public-comment-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleCancelReply() {
    setReplyTarget(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setNotice(null);

    try {
      const response = await fetch("/api/comments", {
        body: JSON.stringify({
          body: formState.body,
          captchaAnswer: captcha ? formState.captchaAnswer : undefined,
          captchaToken: captcha?.token,
          email: formState.email,
          name: formState.name,
          parentId: replyTarget?.id || undefined,
          postId: article.comments.form.postId,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw payload;
      }

      startTransition(() => {
        setFieldErrors({});
        setFormState((currentState) => ({
          ...currentState,
          body: "",
          captchaAnswer: "",
        }));
        setReplyTarget(null);
        setCaptcha(payload.data?.captcha || null);
      });
      setNotice({
        message: payload.data?.message || resolvedCopy.commentSuccess,
        tone: "success",
      });
    } catch (errorPayload) {
      const payload = typeof errorPayload === "object" ? errorPayload : {};

      startTransition(() => {
        setFieldErrors(getFieldErrors(payload));
        setCaptcha(payload.data?.captcha || captcha);
      });
      setNotice({
        message: payload.message || "Unable to submit your comment right now.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel>
      <SectionHeader>
        <SectionTitle>{resolvedCopy.commentsTitle}</SectionTitle>
        <SectionDescription>{resolvedCopy.commentsDescription}</SectionDescription>
      </SectionHeader>

      {notice ? <Notice $tone={notice.tone}>{notice.message}</Notice> : null}

      <Form id="public-comment-form" onSubmit={handleSubmit}>
        <SectionHeader>
          <SectionTitle>{resolvedCopy.commentsFormTitle}</SectionTitle>
          <SectionDescription>{resolvedCopy.commentsFormDescription}</SectionDescription>
        </SectionHeader>

        {replyTarget ? (
          <ButtonRow>
            <HelpText>
              {resolvedCopy.commentReplyingToLabel}: <strong>{replyTarget.name}</strong>
            </HelpText>
            <SecondaryButton onClick={handleCancelReply} type="button">
              {resolvedCopy.commentCancelReplyAction}
            </SecondaryButton>
          </ButtonRow>
        ) : null}

        <FieldGrid>
          <Field>
            <FieldLabel>{resolvedCopy.commentNameLabel}</FieldLabel>
            <Input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  name: event.target.value,
                }))
              }
              placeholder={resolvedCopy.commentNamePlaceholder}
              value={formState.name}
            />
            {fieldErrors.name?.map((error) => (
              <ErrorText key={error}>{error}</ErrorText>
            ))}
          </Field>
          <Field>
            <FieldLabel>{resolvedCopy.commentEmailLabel}</FieldLabel>
            <Input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  email: event.target.value,
                }))
              }
              placeholder={resolvedCopy.commentEmailPlaceholder}
              type="email"
              value={formState.email}
            />
            {fieldErrors.email?.map((error) => (
              <ErrorText key={error}>{error}</ErrorText>
            ))}
          </Field>
        </FieldGrid>

        <Field>
          <FieldLabel>{resolvedCopy.commentBodyLabel || "Comment"}</FieldLabel>
          <Textarea
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                body: event.target.value,
              }))
            }
            placeholder={resolvedCopy.commentBodyPlaceholder}
            value={formState.body}
          />
          {fieldErrors.body?.map((error) => (
            <ErrorText key={error}>{error}</ErrorText>
          ))}
        </Field>

        {captcha ? (
          <Field>
            <FieldLabel>{resolvedCopy.commentCaptchaLabel}</FieldLabel>
            <HelpText>{captcha.prompt}</HelpText>
            <Input
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  captchaAnswer: event.target.value,
                }))
              }
              placeholder={resolvedCopy.commentCaptchaPlaceholder}
              value={formState.captchaAnswer}
            />
            {fieldErrors.captchaAnswer?.map((error) => (
              <ErrorText key={error}>{error}</ErrorText>
            ))}
          </Field>
        ) : null}

        <ButtonRow>
          <PrimaryButton disabled={isSubmitting} type="submit">
            {isSubmitting
              ? resolvedCopy.commentSubmitWorking
              : resolvedCopy.commentSubmitAction}
          </PrimaryButton>
        </ButtonRow>
      </Form>

      <SectionDescription>{resolvedCopy.commentsModerationNotice}</SectionDescription>

      {article.comments.items.length ? (
        <CommentThread>
          {article.comments.items.map((comment) => (
            <CommentCard key={comment.id}>
              <MetaRow>
                <strong>{comment.name}</strong>
                {comment.createdAt ? (
                  <span>{formatDateLabel(locale, comment.createdAt)}</span>
                ) : null}
              </MetaRow>
              <CommentText>{comment.body}</CommentText>
              <ReplyButton onClick={() => handleReplyTo(comment)} type="button">
                {resolvedCopy.commentReplyAction}
              </ReplyButton>
              {comment.replies.length ? (
                <ReplyThread>
                  {comment.replies.map((reply) => (
                    <CommentCard key={reply.id}>
                      <MetaRow>
                        <strong>{reply.name}</strong>
                        <span>{resolvedCopy.commentReplyLabel}</span>
                        {reply.createdAt ? (
                          <span>{formatDateLabel(locale, reply.createdAt)}</span>
                        ) : null}
                      </MetaRow>
                      <CommentText>{reply.body}</CommentText>
                    </CommentCard>
                  ))}
                </ReplyThread>
              ) : null}
            </CommentCard>
          ))}
        </CommentThread>
      ) : (
        <SectionDescription>{resolvedCopy.commentsEmpty}</SectionDescription>
      )}

      <Pagination
        copy={resolvedCopy}
        pagination={article.comments.pagination}
        pathname={article.path}
      />
    </Panel>
  );
}
