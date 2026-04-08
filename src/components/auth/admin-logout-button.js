"use client";

/**
 * Client logout control for ending NewsPub admin sessions from shared shell surfaces.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";

const Button = styled.button`
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--theme-radius-lg, 2px);
  color: white;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.38rem;
  justify-content: center;
  min-height: 34px;
  padding: 0.46rem 0.78rem;
  transition:
    transform 160ms ease,
    background 160ms ease,
    border-color 160ms ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  svg {
    display: block;
    height: 0.88rem;
    width: 0.88rem;
  }
`;

/**
 * Renders the NewsPub admin logout control and pending-state feedback.
 */
export default function AdminLogoutButton({ className }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startNavigation] = useTransition();

  async function handleLogout() {
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setError("Could not sign out.");
        return;
      }

      startNavigation(() => {
        router.replace("/admin/login");
        router.refresh();
      });
    } catch {
      setError("Could not sign out.");
    }
  }

  return (
    <Button
      aria-label={error || "Sign out of the admin area"}
      className={className}
      disabled={isPending}
      onClick={handleLogout}
      type="button"
    >
      <AppIcon name="log-out" size={14} />
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
