"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";

const Shell = styled.main`
  align-items: center;
  display: grid;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Panel = styled.section`
  background:
    radial-gradient(circle at top left, rgba(201, 123, 42, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(0, 95, 115, 0.96), rgba(16, 32, 51, 0.98));
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 30px 90px rgba(16, 32, 51, 0.22);
  color: white;
  display: grid;
  margin: 0 auto;
  max-width: 1040px;
  overflow: hidden;
  width: 100%;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.1fr) minmax(360px, 460px);
  }
`;

const Narrative = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: clamp(2rem, 4vw, 3.5rem);
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
  font-size: clamp(2.4rem, 4vw, 4.6rem);
  line-height: 0.98;
  margin: 0;
  max-width: 10ch;
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.02rem;
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
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  gap: 0.4rem;
  padding: ${({ theme }) => theme.spacing.lg};
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
  color: ${({ theme }) => theme.colors.text};
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: clamp(1.6rem, 3vw, 2.5rem);
`;

const FormHeader = styled.div`
  display: grid;
  gap: 0.45rem;
`;

const FormTitle = styled.h2`
  font-size: 1.6rem;
  margin: 0;
`;

const FormDescription = styled.p`
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.6;
  margin: 0;
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Field = styled.label`
  display: grid;
  gap: 0.45rem;
`;

const FieldLabel = styled.span`
  font-size: 0.92rem;
  font-weight: 700;
`;

const PasswordField = styled.div`
  position: relative;
`;

const Input = styled.input`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  min-height: 48px;
  padding: 0.8rem 0.9rem;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
    outline: none;
  }
`;

const PasswordInput = styled(Input)`
  padding-right: 4.8rem;
`;

const PasswordToggle = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  font-weight: 700;
  inset: 0 0 0 auto;
  justify-content: center;
  min-width: 4.25rem;
  padding: 0 0.85rem;
  position: absolute;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

const ErrorNotice = styled.p`
  background: rgba(180, 35, 24, 0.08);
  border: 1px solid rgba(180, 35, 24, 0.2);
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.danger};
  margin: 0;
  padding: 0.8rem 0.9rem;
`;

const SubmitButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  min-height: 50px;
  padding: 0.85rem 1.2rem;
  transition: transform 120ms ease, opacity 120ms ease;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
`;

const FinePrint = styled.p`
  color: ${({ theme }) => theme.colors.muted};
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
          <div>
            <Eyebrow>Admin Access</Eyebrow>
            <Title>Source-grounded publishing starts here.</Title>
          </div>
          <Description>
            Release 1 keeps the public site open while the editorial workspace stays behind
            authenticated admin sessions. Sign in with the seeded admin account to continue.
          </Description>
          <InsightGrid>
            <InsightCard>
              <InsightTitle>Email and password</InsightTitle>
              <InsightBody>
                The admin workflow uses credential auth first, matching the Release 1 access rules.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitle>Protected sessions</InsightTitle>
              <InsightBody>
                Session cookies are validated server-side so expired or tampered access is rejected.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitle>Audit trail ready</InsightTitle>
              <InsightBody>
                Login and logout events are recorded to support future editorial accountability work.
              </InsightBody>
            </InsightCard>
            <InsightCard>
              <InsightTitle>RBAC next</InsightTitle>
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
              <Input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                type="email"
                value={email}
              />
            </Field>
            <Field>
              <FieldLabel>Password</FieldLabel>
              <PasswordField>
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
                  {isPasswordVisible ? "Hide" : "Show"}
                </PasswordToggle>
              </PasswordField>
            </Field>
            {error ? <ErrorNotice aria-live="polite">{error}</ErrorNotice> : null}
            <SubmitButton disabled={isSubmitting || isNavigating} type="submit">
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
