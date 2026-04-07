"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";

const Shell = styled.main`
  align-items: center;
  display: grid;
  min-height: 100vh;
  padding: clamp(0.72rem, 3vw, ${({ theme }) => theme.spacing.xl});
`;

const Panel = styled.section`
  background:
    radial-gradient(circle at top left, rgba(201, 123, 42, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.96), rgba(16, 32, 51, 0.98));
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: 0 30px 90px rgba(16, 32, 51, 0.22);
  color: white;
  display: grid;
  margin: 0 auto;
  max-width: 980px;
  overflow: hidden;
  width: 100%;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.1fr) minmax(360px, 460px);
  }
`;

const Narrative = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  order: 2;
  padding: clamp(1.4rem, 3vw, 2.4rem);

  @media (min-width: 900px) {
    order: 1;
  }
`;

const NarrativeHero = styled.div`
  display: grid;
  gap: 0.9rem;
`;

const NarrativeIconBadge = styled.span`
  align-items: center;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--theme-radius-lg, 2px);
  display: inline-flex;
  height: 3.3rem;
  justify-content: center;
  width: 3.3rem;

  svg {
    display: block;
    height: 1.5rem;
    width: 1.5rem;
  }
`;

const Eyebrow = styled.p`
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: clamp(1.95rem, 7vw, 4rem);
  line-height: 0.98;
  margin: 0;
  max-width: 10ch;
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.96rem;
  line-height: 1.7;
  margin: 0;
  max-width: 54ch;
`;

const InsightGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const InsightCard = styled.article`
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--theme-radius-md, 1px);
  display: grid;
  gap: 0.28rem;
  padding: clamp(0.68rem, 1.7vw, ${({ theme }) => theme.spacing.lg});
`;

const InsightTitleRow = styled.div`
  align-items: center;
  display: flex;
  gap: 0.42rem;

  svg {
    display: block;
    height: 1rem;
    width: 1rem;
  }
`;

const InsightTitle = styled.h2`
  font-size: 1rem;
  margin: 0;
`;

const InsightBody = styled.p`
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
  margin: 0;
`;

const FormCard = styled.div`
  background: rgba(249, 251, 253, 0.98);
  color: var(--theme-text, #152844);
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  order: 1;
  padding: clamp(1.15rem, 2.3vw, 1.8rem);

  @media (min-width: 900px) {
    order: 2;
  }
`;

const FormHeader = styled.div`
  display: grid;
  gap: 0.32rem;
`;

const FormTitle = styled.h2`
  font-size: 1.45rem;
  margin: 0;
`;

const FormDescription = styled.p`
  color: var(--theme-muted, #54657f);
  line-height: 1.6;
  margin: 0;
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Field = styled.label`
  display: grid;
  gap: 0.32rem;
`;

const FieldLabel = styled.span`
  font-size: 0.92rem;
  font-weight: 700;
`;

const FieldControl = styled.div`
  align-items: center;
  background: white;
  border: 1px solid var(--theme-border, #b8c8de);
  border-radius: var(--theme-radius-sm, 0px);
  display: flex;
  gap: 0.46rem;
  min-height: 42px;
  padding: 0 0.76rem;

  &:focus-within {
    border-color: var(--theme-primary, #1b4f93);
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
  }
`;

const FieldIcon = styled.span`
  color: var(--theme-primary, #1b4f93);
  display: inline-flex;
  flex: 0 0 auto;

  svg {
    display: block;
    height: 0.94rem;
    width: 0.94rem;
  }
`;

const PasswordField = styled.div`
  position: relative;
`;

const Input = styled.input`
  background: transparent;
  border: none;
  flex: 1 1 auto;
  min-height: 100%;
  padding: 0;

  &:focus {
    outline: none;
  }
`;

const PasswordInput = styled(Input)`
  padding-right: 3.4rem;
`;

const PasswordToggle = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: var(--theme-primary, #1b4f93);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  font-weight: 700;
  inset: 0 0 0 auto;
  justify-content: center;
  min-width: 3.8rem;
  padding: 0 0.72rem;
  position: absolute;

  &:focus-visible {
    outline: 2px solid var(--theme-primary, #1b4f93);
    outline-offset: -2px;
  }
`;

const ErrorNotice = styled.p`
  background: rgba(180, 35, 24, 0.08);
  border: 1px solid rgba(180, 35, 24, 0.2);
  border-radius: var(--theme-radius-sm, 0px);
  color: var(--theme-danger, #b42318);
  margin: 0;
  padding: 0.66rem 0.76rem;
`;

const SubmitButton = styled.button`
  align-items: center;
  background: var(--theme-primary, #1b4f93);
  border: none;
  border-radius: var(--theme-radius-lg, 2px);
  color: white;
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  gap: 0.38rem;
  justify-content: center;
  min-height: 40px;
  padding: 0.66rem 0.9rem;
  transition: transform 120ms ease, opacity 120ms ease;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }

  svg {
    display: block;
    height: 0.92rem;
    width: 0.92rem;
  }
`;

const FinePrint = styled.p`
  color: var(--theme-muted, #54657f);
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
`;

export default function AdminLoginScreen({ nextPath }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.message || "Sign-in failed. Please verify your credentials.");
        return;
      }

      startNavigation(() => {
        router.replace(nextPath);
        router.refresh();
      });
    } catch {
      setError("The login request could not be completed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Shell>
      <Panel>
        <Narrative>
          <NarrativeHero>
            <NarrativeIconBadge aria-hidden="true">
              <AppIcon name="shield" size={24} />
            </NarrativeIconBadge>
            <div>
              <Eyebrow>Admin Access</Eyebrow>
              <Title>Source-grounded publishing starts here.</Title>
            </div>
          </NarrativeHero>
          <Description>
            Release 1 keeps the public site open while the editorial workspace stays behind
            authenticated admin sessions. Sign in with the seeded admin account to continue.
          </Description>
          <InsightGrid>
            <InsightCard>
              <InsightTitleRow>
                <AppIcon name="lock" size={16} />
                <InsightTitle>Email and password</InsightTitle>
              </InsightTitleRow>
              <InsightBody>
                The admin workflow uses credential auth first, matching the Release 1 access rules.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitleRow>
                <AppIcon name="shield" size={16} />
                <InsightTitle>Protected sessions</InsightTitle>
              </InsightTitleRow>
              <InsightBody>
                Session cookies are validated server-side so expired or tampered access is rejected.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitleRow>
                <AppIcon name="file-text" size={16} />
                <InsightTitle>Audit trail ready</InsightTitle>
              </InsightTitleRow>
              <InsightBody>
                Login and logout events are recorded to support future editorial accountability work.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitleRow>
                <AppIcon name="settings" size={16} />
                <InsightTitle>RBAC next</InsightTitle>
              </InsightTitleRow>
              <InsightBody>
                This step secures the admin surface now and leaves room for role-based controls next.
              </InsightBody>
            </InsightCard>
          </InsightGrid>
        </Narrative>
        <FormCard>
          <FormHeader>
            <FormTitle>Sign in to the admin workspace</FormTitle>
            <FormDescription>
              Use the seeded admin credentials from your environment and Prisma seed setup.
            </FormDescription>
          </FormHeader>
          <Form onSubmit={handleSubmit}>
            <Field>
              <FieldLabel>Email address</FieldLabel>
              <FieldControl>
                <FieldIcon aria-hidden="true">
                  <AppIcon name="user" size={15} />
                </FieldIcon>
                <Input
                  autoComplete="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  required
                  type="email"
                  value={email}
                />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel>Password</FieldLabel>
              <PasswordField>
                <FieldControl>
                  <FieldIcon aria-hidden="true">
                    <AppIcon name="lock" size={15} />
                  </FieldIcon>
                  <PasswordInput
                    autoComplete="current-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                  />
                  <PasswordToggle
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    aria-pressed={isPasswordVisible}
                    onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                    type="button"
                  >
                    <AppIcon name={isPasswordVisible ? "eye-off" : "eye"} size={15} />
                  </PasswordToggle>
                </FieldControl>
              </PasswordField>
            </Field>
            {error ? <ErrorNotice aria-live="polite">{error}</ErrorNotice> : null}
            <SubmitButton disabled={isSubmitting || isNavigating} type="submit">
              <AppIcon name="log-in" size={15} />
              {isSubmitting || isNavigating ? "Signing in..." : "Sign in"}
            </SubmitButton>
          </Form>
          <FinePrint>
            Successful sign-in returns you to the requested admin route and creates a protected session
            cookie.
          </FinePrint>
        </FormCard>
      </Panel>
    </Shell>
  );
}
