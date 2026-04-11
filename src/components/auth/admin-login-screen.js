"use client";

/**
 * Client login screen for NewsPub admin authentication, redirect recovery, and inline form feedback.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";

const Shell = styled.main`
  align-items: center;
  background: #f6f8fb;
  color: var(--theme-text, #152844);
  display: grid;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const FormCard = styled.section`
  background: white;
  border: 1px solid var(--theme-border, #d7dee8);
  border-radius: 8px;
  box-shadow: 0 18px 48px rgba(16, 32, 51, 0.08);
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0 auto;
  max-width: 420px;
  padding: 1.5rem;
  width: 100%;
`;

const BrandMark = styled.span`
  align-items: center;
  background: rgba(0, 95, 115, 0.08);
  border: 1px solid rgba(0, 95, 115, 0.14);
  border-radius: 8px;
  color: var(--theme-primary, #1b4f93);
  display: inline-flex;
  height: 2.4rem;
  justify-content: center;
  width: 2.4rem;

  svg {
    display: block;
    height: 1.1rem;
    width: 1.1rem;
  }
`;

const FormHeader = styled.div`
  display: grid;
  gap: 0.32rem;
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  line-height: 1.2;
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
  background: #fbfcfe;
  border: 1px solid var(--theme-border, #b8c8de);
  border-radius: 6px;
  display: flex;
  min-height: 44px;
  padding: 0 0.8rem;

  &:focus-within {
    border-color: var(--theme-primary, #1b4f93);
    box-shadow: 0 0 0 4px rgba(0, 95, 115, 0.12);
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
  border-radius: 6px;
  color: var(--theme-danger, #b42318);
  margin: 0;
  padding: 0.66rem 0.76rem;
`;

const SubmitButton = styled.button`
  align-items: center;
  background: var(--theme-primary, #1b4f93);
  border: none;
  border-radius: 6px;
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

/**
 * Renders the NewsPub admin login form with redirect recovery and inline validation feedback.
 */
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
        setError(payload?.message || "The email or password is incorrect.");
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
      <FormCard>
        <BrandMark aria-hidden="true">
          <AppIcon name="shield" size={18} />
        </BrandMark>
        <FormHeader>
          <FormTitle>Admin sign in</FormTitle>
          <FormDescription>Use your seeded admin account.</FormDescription>
        </FormHeader>
        <Form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>Email address</FieldLabel>
            <FieldControl>
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
      </FormCard>
    </Shell>
  );
}
