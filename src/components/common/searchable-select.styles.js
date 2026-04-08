/**
 * styled-components primitives for the reusable searchable select control used across NewsPub admin forms.
 */

import styled, { keyframes } from "styled-components";

import OptionFlag from "@/components/common/option-flag";
import { controlSurfaceCss, elevatedSurfaceCss, focusRingCss } from "@/components/common/ui-surface";

import {
  BASE_DROPDOWN_WIDTH,
  DEFAULT_DROPDOWN_HEIGHT,
  getDropdownTransformOrigin,
} from "./searchable-select.utils";

const dropdownEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const SelectRoot = styled.div`
  container-type: inline-size;
  min-width: 0;
  width: 100%;
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const TriggerButton = styled.button`
  align-items: center;
  ${controlSurfaceCss}
  border: 1px solid
    ${({ $invalid, $open }) =>
      $invalid
        ? "var(--theme-danger, #b42318)"
        : $open
          ? "rgba(15, 111, 141, 0.3)"
          : "var(--theme-border, #b8c8de)"};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    ${({ $open, $invalid }) =>
      $open
        ? $invalid
          ? "0 18px 32px rgba(176, 46, 34, 0.1), 0 0 0 4px rgba(176, 46, 34, 0.09)"
          : "0 18px 32px rgba(15, 96, 121, 0.11), 0 0 0 4px rgba(15, 111, 141, 0.09)"
        : "0 10px 24px rgba(16, 32, 51, 0.05)"};
  color: var(--theme-text, #152844);
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: flex;
  gap: var(--admin-control-gap);
  justify-content: space-between;
  min-height: var(--admin-control-min-height);
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  padding: var(--admin-control-padding-block) var(--admin-control-padding-inline);
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &:hover {
    border-color: ${({ disabled, $invalid, $open }) =>
      disabled
        ? "var(--theme-border, #b8c8de)"
        : $invalid
          ? "var(--theme-danger, #b42318)"
          : $open
            ? "rgba(15, 111, 141, 0.34)"
            : "rgba(36, 75, 115, 0.24)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }

  &:focus-visible {
    border-color: ${({ $invalid }) => ($invalid ? "var(--theme-danger, #b42318)" : "var(--theme-primary, #1b4f93)")};
    box-shadow:
      0 16px 30px rgba(16, 32, 51, 0.08),
      0 0 0 4px
        ${({ $invalid }) => ($invalid ? "rgba(180, 35, 24, 0.14)" : "rgba(0, 95, 115, 0.14)")};
    outline: none;
  }
`;

export const CompactTriggerButton = styled(TriggerButton)`
  @container (max-width: 220px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
`;

export const TriggerValue = styled.span`
  display: grid;
  flex: 1 1 auto;
  gap: 0.18rem;
  min-width: 0;

  @container (max-width: 220px) {
    flex-basis: 100%;
  }
`;

export const LabelContent = styled.span`
  align-items: center;
  display: inline-flex;
  gap: 0.38rem;
  max-width: 100%;
  min-width: 0;
`;

export const TriggerLabel = styled(LabelContent)`
  font-size: 0.88rem;
  font-weight: 600;
`;

export const TriggerLabelText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PlaceholderText = styled(TriggerLabel)`
  color: var(--theme-muted, #54657f);
  font-weight: 500;
`;

export const TriggerDescription = styled.span`
  color: var(--theme-muted, #54657f);
  font-size: 0.67rem;
  line-height: 1.28;
  overflow-wrap: break-word;
  word-break: normal;
`;

export const TriggerChipRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;
`;

export const TriggerChip = styled.span`
  align-items: center;
  background: ${({ $muted }) =>
    $muted ? "rgba(16, 32, 51, 0.05)" : "rgba(36, 75, 115, 0.08)"};
  border: 1px solid
    ${({ $muted }) =>
      $muted ? "rgba(16, 32, 51, 0.08)" : "rgba(36, 75, 115, 0.12)"};
  border-radius: var(--theme-radius-lg, 2px);
  color: ${({ $muted }) => ($muted ? "rgba(61, 76, 102, 0.9)" : "#244b73")};
  display: inline-flex;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  max-width: 100%;
  min-height: 19px;
  overflow: hidden;
  padding: 0 0.34rem;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const TriggerAdornment = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.3rem;

  @container (max-width: 220px) {
    margin-left: auto;
  }
`;

export const TriggerBadge = styled.span`
  background: rgba(15, 111, 141, 0.08);
  border: 1px solid rgba(15, 111, 141, 0.14);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0f5f79;
  display: inline-flex;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 6.8rem;
  overflow: hidden;
  padding: 0.14rem 0.32rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const Caret = styled.span`
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(56, 76, 103, 0.88);
  flex: 0 0 auto;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "none")};
  transition: transform 160ms ease;
`;

export const DropdownSurface = styled.div`
  ${elevatedSurfaceCss}
  animation: ${dropdownEnter} 180ms cubic-bezier(0.22, 1, 0.36, 1);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(24, 39, 66, 0.1);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 28px 54px rgba(16, 32, 51, 0.14),
    0 6px 16px rgba(16, 32, 51, 0.05);
  display: grid;
  gap: 0.36rem;
  grid-template-rows: auto minmax(0, 1fr);
  left: ${({ $layout }) => `${$layout?.left || 0}px`};
  max-height: ${({ $layout }) => `${$layout?.maxHeight || DEFAULT_DROPDOWN_HEIGHT}px`};
  overflow: hidden;
  padding: 0.4rem;
  position: fixed;
  top: ${({ $layout }) => `${$layout?.top || 0}px`};
  transform-origin: ${({ $layout }) => getDropdownTransformOrigin($layout)};
  width: ${({ $layout }) => `${$layout?.width || BASE_DROPDOWN_WIDTH}px`};
  z-index: 9999;
`;

export const DropdownTop = styled.div`
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(245, 249, 255, 0.96)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.06), transparent 55%);
  border: 1px solid rgba(24, 39, 66, 0.06);
  border-radius: var(--theme-radius-md, 1px);
  display: grid;
  gap: 0.3rem;
  padding: 0.4rem;
`;

export const DropdownHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
`;

export const DropdownEyebrow = styled.span`
  color: rgba(32, 51, 78, 0.94);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const DropdownMeta = styled.span`
  align-items: center;
  background: rgba(15, 111, 141, 0.08);
  border: 1px solid rgba(15, 111, 141, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #0f5f79;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  min-height: 19px;
  padding: 0 0.34rem;
  text-transform: uppercase;
`;

export const SearchWrap = styled.div`
  align-items: center;
  ${controlSurfaceCss}
  ${focusRingCss}
  border-radius: var(--theme-radius-lg, 2px);
  display: flex;
  flex: 0 0 auto;
  gap: 0.32rem;
  min-height: calc(var(--admin-control-min-height) - 8px);
  padding: 0 0.48rem;
`;

export const SearchIcon = styled.span`
  border: 2px solid rgba(74, 90, 117, 0.74);
  border-radius: var(--theme-radius-lg, 2px);
  display: inline-block;
  flex: 0 0 auto;
  height: 0.78rem;
  position: relative;
  width: 0.78rem;

  &::after {
    background: rgba(74, 90, 117, 0.74);
    border-radius: var(--theme-radius-lg, 2px);
    bottom: -0.08rem;
    content: "";
    height: 2px;
    position: absolute;
    right: -0.2rem;
    transform: rotate(45deg);
    width: 0.38rem;
  }
`;

export const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: var(--theme-text, #152844);
  flex: 1 1 auto;
  font-size: 0.8rem;
  min-width: 0;
  outline: none;
  padding: 0;

  &::placeholder {
    color: var(--theme-muted, #54657f);
  }
`;

export const OptionList = styled.div`
  align-items: stretch;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.22rem;
  max-height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 0.12rem;
  scrollbar-color: rgba(36, 75, 115, 0.24) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.24);
    background-clip: padding-box;
    border: 3px solid transparent;
    border-radius: var(--theme-radius-lg, 2px);
  }
`;

export const OptionButton = styled.button`
  position: relative;
  background: ${({ $active, $selected }) =>
    $selected
      ? "linear-gradient(180deg, rgba(15, 111, 141, 0.12), rgba(15, 111, 141, 0.08))"
      : $active
        ? "rgba(36, 75, 115, 0.08)"
        : "rgba(255, 255, 255, 0.72)"};
  border: 1px solid
    ${({ $active, $selected }) =>
      $selected
        ? "rgba(15, 111, 141, 0.2)"
        : $active
          ? "rgba(36, 75, 115, 0.14)"
          : "rgba(24, 39, 66, 0.04)"};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: ${({ $selected }) =>
    $selected ? "0 10px 22px rgba(15, 96, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.72)" : "none"};
  color: var(--theme-text, #152844);
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  display: grid;
  flex: 0 0 auto;
  gap: 0.18rem;
  height: auto;
  min-height: 38px;
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  overflow: hidden;
  padding: 0.46rem 0.56rem 0.46rem 0.64rem;
  text-align: left;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 100%;

  &::before {
    background: ${({ $active, $selected }) =>
      $selected
        ? "linear-gradient(180deg, rgba(15, 111, 141, 0.9), rgba(13, 95, 121, 0.88))"
        : $active
          ? "rgba(36, 75, 115, 0.32)"
          : "transparent"};
    border-radius: var(--theme-radius-lg, 2px);
    bottom: 0.48rem;
    content: "";
    left: 0.26rem;
    position: absolute;
    top: 0.48rem;
    width: 3px;
  }

  &:hover {
    background: ${({ disabled, $selected }) =>
      disabled
        ? "rgba(255, 255, 255, 0.72)"
        : $selected
          ? "linear-gradient(180deg, rgba(15, 111, 141, 0.14), rgba(15, 111, 141, 0.09))"
          : "rgba(36, 75, 115, 0.08)"};
    border-color: ${({ disabled, $selected }) =>
      disabled
        ? "rgba(24, 39, 66, 0.04)"
        : $selected
          ? "rgba(15, 111, 141, 0.22)"
          : "rgba(36, 75, 115, 0.14)"};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

export const OptionHeader = styled.div`
  align-items: start;
  display: grid;
  gap: 0.28rem;
  grid-template-columns: minmax(0, 1fr) auto;
`;

export const OptionLabel = styled(LabelContent)`
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.22;
`;

export const OptionLabelText = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const OptionDescription = styled.div`
  color: var(--theme-muted, #54657f);
  font-size: 0.68rem;
  line-height: 1.32;
  overflow-wrap: anywhere;
`;

export const OptionMeta = styled.div`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.2rem;
  justify-self: end;
  padding-top: 0.04rem;
`;

export const OptionBadge = styled.span`
  background: rgba(36, 75, 115, 0.08);
  border: 1px solid rgba(36, 75, 115, 0.12);
  border-radius: var(--theme-radius-lg, 2px);
  color: #244b73;
  display: inline-flex;
  flex: 0 1 auto;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: 8rem;
  overflow: hidden;
  padding: 0.12rem 0.28rem;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const OptionIndicator = styled.span`
  align-items: center;
  background: ${({ $selected }) => ($selected ? "rgba(15, 111, 141, 0.92)" : "rgba(255, 255, 255, 0.92)")};
  border: 1px solid ${({ $selected }) => ($selected ? "rgba(15, 111, 141, 0.92)" : "rgba(74, 90, 117, 0.18)")};
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: ${({ $selected }) => ($selected ? "0 0 0 4px rgba(15, 111, 141, 0.12)" : "none")};
  display: inline-flex;
  flex: 0 0 auto;
  height: 1rem;
  justify-content: center;
  position: relative;
  width: 1rem;

  &::after {
    border-bottom: 2px solid white;
    border-right: 2px solid white;
    content: "";
    height: 0.42rem;
    left: 0.32rem;
    opacity: ${({ $selected }) => ($selected ? 1 : 0)};
    position: absolute;
    top: 0.18rem;
    transform: rotate(45deg) scale(${({ $selected }) => ($selected ? 1 : 0.7)});
    transition:
      opacity 160ms ease,
      transform 160ms ease;
    width: 0.22rem;
  }
`;

export const StateMessage = styled.div`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(249, 252, 255, 0.98), rgba(245, 249, 255, 0.96)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.05), transparent 58%);
  border: 1px dashed rgba(36, 75, 115, 0.14);
  border-radius: var(--theme-radius-md, 1px);
  color: var(--theme-muted, #54657f);
  display: grid;
  font-size: 0.76rem;
  justify-items: center;
  line-height: 1.55;
  min-height: 68px;
  padding: 0.68rem 0.58rem;
  text-align: center;
`;

export { OptionFlag };
