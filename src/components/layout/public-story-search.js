"use client";

/**
 * Client search component that powers the NewsPub public story search experience.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import styled, { css } from "styled-components";

import AppIcon from "@/components/common/app-icon";
import { normalizePublicSearchQuery } from "@/features/public-site/search-utils";

const Form = styled.form`
  align-items: stretch;
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.98), rgba(255, 255, 255, 0.94)),
    radial-gradient(circle at top right, rgba(var(--theme-accent-rgb), 0.08), transparent 48%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.92);
  border-radius: var(--theme-radius-md);
  box-shadow: 0 8px 20px rgba(var(--theme-primary-rgb), 0.06);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  overflow: hidden;

  ${({ $condenseSubmit }) => (
    $condenseSubmit
      ? css`
          @media (max-width: 520px) {
            grid-template-columns: minmax(0, 1fr) 2.9rem;
          }
        `
      : ""
  )}

  &:focus-within {
    border-color: var(--theme-primary);
    box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.12);
  }
`;

const InputWrap = styled.label`
  align-items: center;
  display: flex;
  gap: 0.44rem;
  min-height: 36px;
  padding: 0 0.72rem;
`;

const InputIcon = styled.span`
  color: rgba(var(--theme-primary-rgb), 0.76);
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;

  svg {
    display: block;
    height: 0.96rem;
    width: 0.96rem;
  }
`;

const Input = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text);
  flex: 1 1 auto;
  font: inherit;
  min-height: 100%;
  padding: 0;
  width: 100%;

  &:focus {
    outline: none;
  }
`;

const Button = styled.button`
  align-items: center;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-story-accent) 100%);
  border: none;
  border-left: 1px solid rgba(var(--theme-primary-rgb), 0.16);
  box-shadow: none;
  color: white;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-weight: 700;
  gap: 0.38rem;
  justify-content: center;
  min-height: 36px;
  padding: 0 0.94rem;
  transition:
    filter 0.18s ease,
    background 0.18s ease;

  ${({ $condenseSubmit }) => (
    $condenseSubmit
      ? css`
          @media (max-width: 520px) {
            min-width: 2.9rem;
            padding: 0;
          }
        `
      : ""
  )}

  &:hover {
    filter: brightness(1.04);
  }

  &:focus-visible {
    outline: none;
  }

  svg {
    display: block;
    height: 0.9rem;
    width: 0.9rem;
  }
`;

const ButtonText = styled.span`
  ${({ $condenseSubmit }) => (
    $condenseSubmit
      ? css`
          @media (max-width: 520px) {
            display: none;
          }
        `
      : ""
  )}
`;

/**
 * Public story-search entry point for published NewsPub coverage.
 *
 * The component keeps the shell-level search interaction focused on the public
 * search route so locale-aware story discovery stays lightweight and predictable.
 */
export default function PublicStorySearch({
  autoFocus = false,
  condenseSubmit = true,
  country = "",
  initialQuery = "",
  onSubmitComplete,
  searchCopy = {},
  searchHref,
}) {
  const router = useRouter();
  const [query, setQuery] = useState(
    typeof initialQuery === "string" ? (normalizePublicSearchQuery(initialQuery) || initialQuery.trim()) : ""
  );

  function finishSubmit() {
    if (typeof onSubmitComplete === "function") {
      onSubmitComplete();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedQuery = normalizePublicSearchQuery(query);
    const normalizedCountry = typeof country === "string" ? country.trim().toLowerCase() : "";
    const searchParams = new URLSearchParams();

    if (normalizedQuery) {
      searchParams.set("q", normalizedQuery);
    }

    if (normalizedCountry) {
      searchParams.set("country", normalizedCountry);
    }

    const nextHref = searchParams.toString() ? `${searchHref}?${searchParams.toString()}` : searchHref;

    if (!normalizedQuery && !normalizedCountry) {
      router.push(searchHref);
      finishSubmit();
      return;
    }

    router.push(nextHref);
    finishSubmit();
  }

  return (
    <Form
      action={searchHref}
      method="get"
      onSubmit={handleSubmit}
      $condenseSubmit={condenseSubmit}
    >
      <InputWrap>
        <InputIcon aria-hidden="true">
          <AppIcon name="search" size={15} />
        </InputIcon>
        <Input
          aria-label={searchCopy.label || "Search published news"}
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchCopy.placeholder || "Search published stories"}
          type="search"
          value={query}
        />
      </InputWrap>
      <Button
        aria-label={searchCopy.submitAction || "Search"}
        type="submit"
        $condenseSubmit={condenseSubmit}
      >
        <AppIcon name="search" size={14} />
        <ButtonText $condenseSubmit={condenseSubmit}>
          {searchCopy.submitAction || "Search"}
        </ButtonText>
      </Button>
    </Form>
  );
}
