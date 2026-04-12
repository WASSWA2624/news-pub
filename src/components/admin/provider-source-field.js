"use client";

/**
 * Text field with provider-backed source catalog suggestions.
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import AppIcon from "@/components/common/app-icon";
import {
  FieldHint,
  Input,
  SmallText,
} from "@/components/admin/news-admin-ui";

const SourceCatalogPanel = styled.div`
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid rgba(16, 32, 51, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.7rem;
`;

const SourceCatalogHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
`;

const SourceCatalogTitle = styled.strong`
  align-items: center;
  color: #162744;
  display: inline-flex;
  font-size: 0.78rem;
  gap: 0.36rem;
`;

const SourceCatalogGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const SourceOptionButton = styled.button`
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #244b73;
  cursor: pointer;
  display: inline-grid;
  font-size: 0.74rem;
  font-weight: 800;
  gap: 0.08rem;
  min-height: 34px;
  padding: 0.38rem 0.58rem;
  text-align: left;

  &:hover {
    border-color: rgba(15, 111, 141, 0.28);
  }
`;

const SourceOptionMeta = styled.span`
  color: rgba(72, 85, 108, 0.82);
  font-size: 0.66rem;
  font-weight: 700;
`;

function normalizeText(value) {
  return `${value ?? ""}`.trim();
}

function readDelimitedSources(value) {
  const rawValues = Array.isArray(value) ? value : normalizeText(value) ? [value] : [];

  return [...new Set(
    rawValues
      .flatMap((entry) => `${entry || ""}`.split(","))
      .map((entry) => normalizeText(entry).replace(/^-+/, "").toLowerCase())
      .filter(Boolean),
  )];
}

function readLastSourceToken(value) {
  const parts = `${value || ""}`.split(",");

  return normalizeText(parts[parts.length - 1] || "").replace(/^-+/, "").toLowerCase();
}

/**
 * Renders an editable source-id input with provider catalog suggestions.
 */
export default function ProviderSourceField({
  defaultValue = "",
  field,
  name,
  onValueChange = null,
  provider_key,
  scope,
  values = {},
}) {
  const [inputValue, setInputValue] = useState(() => normalizeText(defaultValue));
  const [catalogState, setCatalogState] = useState({
    error: "",
    loading: false,
    options: [],
    requiresQuery: false,
  });
  const sourceCatalog = field.sourceCatalog || null;
  const sourceQuery = readLastSourceToken(inputValue);
  const deferredSourceQuery = useDeferredValue(sourceQuery);
  const serializedValues = useMemo(() => JSON.stringify(values || {}), [values]);
  const selectedSourceValues = useMemo(() => readDelimitedSources(inputValue), [inputValue]);

  useEffect(() => {
    setInputValue(normalizeText(defaultValue));
  }, [defaultValue]);

  useEffect(() => {
    if (!sourceCatalog?.available) {
      return;
    }

    const minimumQueryLength = Number.parseInt(`${sourceCatalog.minimumQueryLength ?? 0}`, 10) || 0;

    if (sourceCatalog.mode === "remote_search" && deferredSourceQuery.length < minimumQueryLength) {
      setCatalogState({
        error: "",
        loading: false,
        options: [],
        requiresQuery: true,
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      provider_key,
      query: deferredSourceQuery,
      scope,
      values: serializedValues,
    });

    setCatalogState((currentState) => ({
      ...currentState,
      error: "",
      loading: true,
      requiresQuery: false,
    }));

    fetch(`/api/providers/source-catalog?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.message || "Unable to load source catalog.");
        }

        setCatalogState({
          error: "",
          loading: false,
          options: payload?.data?.options || [],
          requiresQuery: Boolean(payload?.data?.requires_query),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setCatalogState({
          error: error instanceof Error ? error.message : "Unable to load source catalog.",
          loading: false,
          options: [],
          requiresQuery: false,
        });
      });

    return () => controller.abort();
  }, [
    deferredSourceQuery,
    provider_key,
    scope,
    serializedValues,
    sourceCatalog?.available,
    sourceCatalog?.minimumQueryLength,
    sourceCatalog?.mode,
  ]);

  function updateInputValue(nextValue) {
    setInputValue(nextValue);
    onValueChange?.(nextValue);
  }

  function toggleSource(sourceValue) {
    const normalizedSourceValue = normalizeText(sourceValue).toLowerCase();
    const tokens = `${inputValue || ""}`
      .split(",")
      .map((entry) => normalizeText(entry).replace(/^-+/, "").toLowerCase())
      .filter(Boolean);
    const activeToken = readLastSourceToken(inputValue);
    const committedTokens =
      activeToken && tokens[tokens.length - 1] === activeToken ? tokens.slice(0, -1) : tokens;
    const nextValues = new Set(committedTokens);

    if (selectedSourceValues.includes(normalizedSourceValue)) {
      nextValues.delete(normalizedSourceValue);
    } else if (normalizedSourceValue) {
      nextValues.add(normalizedSourceValue);
    }

    updateInputValue([...nextValues].join(","));
  }

  return (
    <>
      <Input
        name={name}
        onChange={(event) => updateInputValue(event.target.value)}
        placeholder={field.placeholder || ""}
        type="text"
        value={inputValue}
      />
      {sourceCatalog?.available ? (
        <SourceCatalogPanel>
          <SourceCatalogHeader>
            <SourceCatalogTitle>
              <AppIcon name="search" size={13} />
              Source catalog
            </SourceCatalogTitle>
            <SmallText>{catalogState.loading ? "Loading..." : `${catalogState.options.length} suggestion${catalogState.options.length === 1 ? "" : "s"}`}</SmallText>
          </SourceCatalogHeader>
          <FieldHint>{sourceCatalog.summary}</FieldHint>
          {catalogState.requiresQuery ? (
            <SmallText>
              Type at least {sourceCatalog.minimumQueryLength} characters to search this provider catalog.
            </SmallText>
          ) : null}
          {catalogState.error ? <SmallText>{catalogState.error}</SmallText> : null}
          {catalogState.options.length ? (
            <SourceCatalogGrid>
              {catalogState.options.slice(0, 12).map((option) => (
                <SourceOptionButton
                  key={option.value}
                  onClick={() => toggleSource(option.value)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <SourceOptionMeta>{option.value}</SourceOptionMeta>
                </SourceOptionButton>
              ))}
            </SourceCatalogGrid>
          ) : null}
        </SourceCatalogPanel>
      ) : null}
    </>
  );
}
