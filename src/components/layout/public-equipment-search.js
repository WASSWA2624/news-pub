"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";

const Form = styled.form`
  display: grid;
  gap: 0.45rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(var(--theme-border-rgb), 0.92);
  border-radius: 999px;
  color: var(--theme-text);
  font: inherit;
  min-height: 44px;
  padding: 0 0.95rem;
  width: 100%;

  &:focus {
    border-color: var(--theme-primary);
    box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.12);
    outline: none;
  }
`;

const Button = styled.button`
  background: var(--theme-primary);
  border: none;
  border-radius: 999px;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 44px;
  padding: 0 1rem;
`;

export default function PublicEquipmentSearch({ searchCopy = {}, searchHref }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push(searchHref);
      return;
    }

    router.push(`${searchHref}?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <Form action={searchHref} method="get" onSubmit={handleSubmit}>
      <Input
        aria-label={searchCopy.label || "Search published news"}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchCopy.placeholder || "Search published stories"}
        value={query}
      />
      <Button type="submit">{searchCopy.submitAction || "Search"}</Button>
    </Form>
  );
}
