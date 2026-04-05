"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styled from "styled-components";

const minimumSearchCharacters = 2;

function createSearchHref(pathname, query) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  const serializedQuery = params.toString();

  return serializedQuery ? `${pathname}?${serializedQuery}` : pathname;
}

function getSearchCopy(copy = {}) {
  return {
    empty: copy.empty || "No published equipment matched yet.",
    error: copy.error || "Unable to load equipment suggestions right now.",
    label: copy.label || "Global equipment search",
    loading: copy.loading || "Searching equipment...",
    placeholder: copy.placeholder || "Search equipment, device family, or alias",
    resultTypeLabel: copy.resultTypeLabel || "Equipment page",
    submitAction: copy.submitAction || "Go",
    viewAllResultsAction: copy.viewAllResultsAction || "Search all published guides",
  };
}

const SearchShell = styled.div`
  position: relative;
  width: 100%;
`;

const SearchForm = styled.form`
  margin: 0;
`;

const SearchInputWrap = styled.div`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(var(--theme-surface-rgb), 0.99), rgba(var(--theme-bg-rgb), 0.97));
  border: 1px solid rgba(var(--theme-border-rgb), 0.96);
  border-radius: 999px;
  box-shadow:
    0 10px 22px rgba(var(--theme-primary-rgb), 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  display: flex;
  gap: 0.55rem;
  min-height: 42px;
  padding: 0 0.42rem 0 0.8rem;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:focus-within {
    border-color: rgba(var(--theme-primary-rgb), 0.46);
    box-shadow:
      0 14px 30px rgba(var(--theme-primary-rgb), 0.09),
      0 0 0 3px rgba(var(--theme-primary-rgb), 0.12);
    transform: translateY(-1px);
  }
`;

const SearchIcon = styled.span`
  border: 2px solid rgba(var(--theme-muted-rgb), 0.72);
  border-radius: 999px;
  display: inline-block;
  flex: 0 0 auto;
  height: 0.82rem;
  position: relative;
  width: 0.82rem;

  &::after {
    background: rgba(var(--theme-muted-rgb), 0.72);
    border-radius: 999px;
    content: "";
    height: 2px;
    position: absolute;
    right: -0.22rem;
    bottom: -0.08rem;
    transform: rotate(45deg);
    width: 0.42rem;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text);
  flex: 1 1 auto;
  font-size: 0.92rem;
  min-width: 0;
  outline: none;
  padding: 0;

  &::placeholder {
    color: rgba(var(--theme-muted-rgb), 0.8);
  }
`;

const SearchSubmitButton = styled.button`
  background: linear-gradient(180deg, #255ca3, #194882);
  border: 1px solid rgba(17, 51, 92, 0.18);
  border-radius: 999px;
  color: #fff;
  box-shadow:
    0 8px 18px rgba(var(--theme-primary-rgb), 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 800;
  min-height: 32px;
  min-width: 52px;
  padding: 0 0.82rem;
  transition: filter 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    filter: brightness(1.04);
    box-shadow:
      0 10px 22px rgba(var(--theme-primary-rgb), 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
`;

const SearchDropdown = styled.div`
  background:
    linear-gradient(180deg, rgba(var(--theme-bg-rgb), 0.99), rgba(var(--theme-surface-rgb), 0.98)),
    radial-gradient(circle at top right, rgba(var(--theme-primary-rgb), 0.08), transparent 55%);
  border: 1px solid rgba(var(--theme-border-rgb), 0.7);
  border-radius: 18px;
  box-shadow:
    0 26px 52px rgba(var(--theme-primary-rgb), 0.14),
    0 2px 8px rgba(var(--theme-text-rgb), 0.05);
  display: grid;
  gap: 0.55rem;
  left: 0;
  padding: 0.65rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  z-index: 45;
`;

const SearchState = styled.div`
  color: rgba(var(--theme-muted-rgb), 0.92);
  font-size: 0.84rem;
  line-height: 1.5;
  padding: 0.5rem 0.55rem;
`;

const SearchResultList = styled.div`
  display: grid;
  gap: 0.28rem;
`;

const SearchResultButton = styled.button`
  align-items: start;
  background: ${({ $active }) =>
    $active ? "rgba(var(--theme-primary-rgb), 0.1)" : "transparent"};
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(var(--theme-primary-rgb), 0.18)" : "transparent")};
  border-radius: 14px;
  color: var(--theme-text);
  cursor: pointer;
  display: grid;
  gap: 0.16rem;
  justify-items: start;
  min-height: 54px;
  padding: 0.72rem 0.8rem;
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.08);
    border-color: rgba(var(--theme-primary-rgb), 0.14);
    transform: translateY(-1px);
  }
`;

const SearchResultTitleRow = styled.div`
  align-items: center;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  width: 100%;
`;

const SearchResultTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const SearchResultBadge = styled.span`
  background: rgba(var(--theme-primary-rgb), 0.08);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.12);
  border-radius: 999px;
  color: var(--theme-primary);
  flex: 0 0 auto;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.22rem 0.5rem;
  text-transform: uppercase;
`;

const SearchResultDescription = styled.span`
  color: rgba(var(--theme-muted-rgb), 0.92);
  font-size: 0.8rem;
  line-height: 1.45;
`;

const SearchFooterButton = styled.button`
  align-items: center;
  background: rgba(var(--theme-primary-rgb), 0.06);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.1);
  border-radius: 14px;
  color: var(--theme-primary);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 800;
  justify-content: center;
  min-height: 44px;
  padding: 0.72rem 0.9rem;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;

  &:hover {
    background: rgba(var(--theme-primary-rgb), 0.1);
    border-color: rgba(var(--theme-primary-rgb), 0.16);
    transform: translateY(-1px);
  }
`;

export default function PublicEquipmentSearch({ locale, searchHref, searchCopy }) {
  const copy = getSearchCopy(searchCopy);
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const dropdownVisible = isOpen && trimmedQuery.length >= minimumSearchCharacters;

  useEffect(() => {
    setQuery("");
    setSuggestions([]);
    setStatus("idle");
    setIsOpen(false);
    setActiveIndex(-1);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (deferredQuery.length < minimumSearchCharacters) {
      setSuggestions([]);
      setStatus("idle");
      setActiveIndex(-1);
      return undefined;
    }

    const abortController = new AbortController();

    async function loadSuggestions() {
      try {
        setStatus("loading");
        const response = await fetch(
          `/api/equipment-search?${new URLSearchParams({
            locale,
            q: deferredQuery,
          }).toString()}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Equipment suggestion request failed with ${response.status}.`);
        }

        const payload = await response.json();

        if (abortController.signal.aborted) {
          return;
        }

        setSuggestions(Array.isArray(payload.data) ? payload.data : []);
        setStatus("success");
        setActiveIndex(-1);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setSuggestions([]);
        setStatus("error");
      }
    }

    void loadSuggestions();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, locale]);

  function handleSelect(path) {
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(path);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!trimmedQuery) {
      return;
    }

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex].path);
      return;
    }

    setIsOpen(false);
    setActiveIndex(-1);
    router.push(createSearchHref(searchHref, trimmedQuery));
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!dropdownVisible || !suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentValue) => (currentValue + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentValue) =>
        currentValue <= 0 ? suggestions.length - 1 : currentValue - 1,
      );
    }
  }

  return (
    <SearchShell ref={containerRef}>
      <SearchForm onSubmit={handleSubmit} role="search">
        <SearchInputWrap>
          <SearchIcon aria-hidden="true" />
          <SearchInput
            aria-autocomplete="list"
            aria-controls="global-equipment-search-results"
            aria-expanded={dropdownVisible}
            aria-label={copy.label}
            autoComplete="off"
            onChange={(event) => {
              const nextValue = event.target.value;

              setQuery(nextValue);
              setActiveIndex(-1);
              setIsOpen(nextValue.trim().length >= minimumSearchCharacters);
            }}
            onFocus={() => {
              if (trimmedQuery.length >= minimumSearchCharacters) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={copy.placeholder}
            ref={inputRef}
            role="combobox"
            type="search"
            value={query}
          />
          <SearchSubmitButton type="submit">{copy.submitAction}</SearchSubmitButton>
        </SearchInputWrap>
      </SearchForm>

      {dropdownVisible ? (
        <SearchDropdown id="global-equipment-search-results" role="listbox">
          {status === "loading" ? <SearchState>{copy.loading}</SearchState> : null}
          {status === "error" ? <SearchState>{copy.error}</SearchState> : null}
          {status === "success" && suggestions.length ? (
            <SearchResultList>
              {suggestions.map((suggestion, index) => (
                <SearchResultButton
                  aria-selected={activeIndex === index}
                  key={suggestion.path}
                  onClick={() => handleSelect(suggestion.path)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  type="button"
                  $active={activeIndex === index}
                >
                  <SearchResultTitleRow>
                    <SearchResultTitle>{suggestion.name}</SearchResultTitle>
                    <SearchResultBadge>{copy.resultTypeLabel}</SearchResultBadge>
                  </SearchResultTitleRow>
                  <SearchResultDescription>{suggestion.description}</SearchResultDescription>
                </SearchResultButton>
              ))}
            </SearchResultList>
          ) : null}
          {status === "success" && !suggestions.length ? <SearchState>{copy.empty}</SearchState> : null}
          {trimmedQuery ? (
            <SearchFooterButton
              onClick={() => handleSelect(createSearchHref(searchHref, trimmedQuery))}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              {copy.viewAllResultsAction}
            </SearchFooterButton>
          ) : null}
        </SearchDropdown>
      ) : null}
    </SearchShell>
  );
}
