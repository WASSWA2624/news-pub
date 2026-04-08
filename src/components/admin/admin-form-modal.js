"use client";

/**
 * Shared admin modal primitives for long-form editing flows.
 */

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";

import {
  ActionIcon,
  ButtonIcon,
  PrimaryButton,
  SecondaryButton,
} from "@/components/admin/news-admin-ui";

const FooterPortalContext = createContext(null);

function subscribeToHydrationState() {
  return () => {};
}

const modalSizeStyles = {
  compact: css`
    width: min(92vw, 42rem);
  `,
  wide: css`
    width: min(94vw, 68rem);
  `,
  full: css`
    height: min(94dvh, 72rem);
    width: min(96vw, 96rem);
  `,
};

const Dialog = styled.dialog`
  background: transparent;
  border: none;
  margin: auto;
  max-height: calc(100dvh - 0.75rem);
  max-width: calc(100vw - 0.75rem);
  overflow: visible;
  padding: 0;
  ${({ $size }) => modalSizeStyles[$size] || modalSizeStyles.wide}

  &::backdrop {
    backdrop-filter: blur(8px);
    background:
      linear-gradient(180deg, rgba(11, 17, 28, 0.54), rgba(11, 17, 28, 0.64)),
      radial-gradient(circle at top, rgba(15, 111, 141, 0.12), transparent 42%);
  }
`;

const Surface = styled.section`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.996), rgba(246, 250, 255, 0.99)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.1), transparent 34%);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow:
    0 32px 72px rgba(11, 18, 30, 0.24),
    0 12px 28px rgba(16, 32, 51, 0.1);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: calc(100dvh - 0.75rem);
  min-height: ${({ $size }) => ($size === "full" ? "min(94dvh, 72rem)" : "auto")};
  overflow: hidden;

  @media (max-width: 639px) {
    border-radius: var(--theme-radius-lg, 2px);
    min-height: ${({ $size }) => ($size === "full" ? "calc(100dvh - 0.75rem)" : "auto")};
  }
`;

const Header = styled.div`
  align-items: start;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92)),
    radial-gradient(circle at top right, rgba(15, 111, 141, 0.08), transparent 48%);
  border-bottom: 1px solid rgba(16, 32, 51, 0.08);
  display: grid;
  gap: 0.55rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: clamp(0.75rem, 1.7vw, 0.95rem);
`;

const HeaderCopy = styled.div`
  display: grid;
  gap: 0.2rem;
  min-width: 0;
`;

const Title = styled.h2`
  color: #162744;
  font-size: clamp(1rem, 2vw, 1.28rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
`;

const Description = styled.p`
  color: rgba(72, 85, 108, 0.92);
  font-size: 0.84rem;
  line-height: 1.5;
  margin: 0;
  max-width: 70ch;
`;

const CloseButton = styled.button`
  align-items: center;
  background: rgba(16, 32, 51, 0.05);
  border: 1px solid rgba(16, 32, 51, 0.09);
  border-radius: var(--theme-radius-lg, 2px);
  color: #22344f;
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 1.1rem;
  height: var(--admin-icon-button-size);
  justify-content: center;
  line-height: 1;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: var(--admin-icon-button-size);

  &:hover {
    border-color: rgba(15, 111, 141, 0.18);
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 4px rgba(15, 111, 141, 0.12);
    outline: none;
  }
`;

const Body = styled.div`
  min-height: 0;
  overscroll-behavior: contain;
  overflow-y: auto;
  padding: clamp(0.75rem, 1.7vw, 0.95rem);
  scroll-padding-block-end: 7rem;
  scrollbar-gutter: stable;
  scrollbar-color: rgba(36, 75, 115, 0.26) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(36, 75, 115, 0.26);
    border: 3px solid transparent;
    border-radius: var(--theme-radius-lg, 2px);
    background-clip: padding-box;
  }
`;

const Footer = styled.div`
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.98)),
    radial-gradient(circle at top left, rgba(15, 111, 141, 0.06), transparent 42%);
  border-top: 1px solid rgba(16, 32, 51, 0.08);
  padding: clamp(0.68rem, 1.7vw, 0.86rem) clamp(0.75rem, 1.7vw, 0.95rem);
`;

const FooterRow = styled.div`
  align-items: center;
  display: flex;
  gap: 0.48rem;
  justify-content: space-between;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column-reverse;
  }
`;

const FooterCancelGroup = styled.div`
  display: flex;
  flex: 0 0 auto;

  @media (max-width: 640px) {
    width: 100%;

    > button {
      width: 100%;
    }
  }
`;

const FooterActionsMount = styled.div`
  display: flex;
  flex: 1 1 auto;
  justify-content: flex-end;
  min-width: 0;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const FooterActionGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.36rem;
  justify-content: flex-end;

  > form {
    display: inline-flex;
  }

  @media (max-width: 640px) {
    width: 100%;

    > button,
    > a,
    > form {
      width: 100%;
    }

    > form > button {
      width: 100%;
    }
  }
`;

const TriggerPrimary = styled(PrimaryButton)`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "fit-content")};
`;

const TriggerSecondary = styled(SecondaryButton)`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "fit-content")};
`;

/**
 * Wraps long-form admin workflows in a consistent modal shell with stable
 * header context and footer-mounted actions.
 *
 * @param {object} props - Modal content, trigger, and layout props.
 * @returns {JSX.Element} Modal trigger plus the portal-backed dialog surface.
 */
export default function AdminFormModal({
  autoOpen = false,
  cancelLabel = "Cancel",
  children,
  className,
  description,
  mountOnOpen = false,
  onOpenChange = null,
  open = undefined,
  renderTrigger = null,
  size = "wide",
  showTrigger = true,
  title,
  triggerFullWidth = false,
  triggerIcon,
  triggerLabel = "Open form",
  triggerTone = "secondary",
}) {
  const dialogRef = useRef(null);
  const [footerPortalTarget, setFooterPortalTarget] = useState(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(autoOpen);
  const canRenderDialog = useSyncExternalStore(subscribeToHydrationState, () => true, () => false);
  const titleId = useId();
  const descriptionId = useId();
  const TriggerButton = triggerTone === "primary" ? TriggerPrimary : TriggerSecondary;
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setDialogOpen = useCallback(
    (nextOpen) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, [setDialogOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    function handleCancel(event) {
      event.preventDefault();
      closeDialog();
    }

    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [closeDialog]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen) {
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <>
      {typeof renderTrigger === "function" ? (
        showTrigger
          ? renderTrigger({
              isOpen,
              openDialog,
            })
          : null
      ) : showTrigger ? (
        <TriggerButton
          $fullWidth={triggerFullWidth}
          className={className}
          onClick={openDialog}
          type="button"
        >
          {triggerIcon ? (
            <ButtonIcon>
              <ActionIcon name={triggerIcon} />
            </ButtonIcon>
          ) : null}
          {triggerLabel}
        </TriggerButton>
      ) : null}
      {canRenderDialog
        ? createPortal(
            <Dialog
              $size={size}
              aria-describedby={description ? descriptionId : undefined}
              aria-labelledby={titleId}
              data-floating-root
              onClose={() => setDialogOpen(false)}
              onClick={(event) => {
                if (event.target === dialogRef.current) {
                  closeDialog();
                }
              }}
              ref={dialogRef}
            >
              <FooterPortalContext.Provider value={footerPortalTarget}>
                <Surface $size={size}>
                  <Header>
                    <HeaderCopy>
                      <Title id={titleId}>{title}</Title>
                      {description ? <Description id={descriptionId}>{description}</Description> : null}
                    </HeaderCopy>
                    <CloseButton aria-label="Close modal" onClick={closeDialog} type="button">
                      X
                    </CloseButton>
                  </Header>
                  <Body>{!mountOnOpen || isOpen ? children : null}</Body>
                  <Footer>
                    <FooterRow>
                      <FooterCancelGroup>
                        <SecondaryButton onClick={closeDialog} type="button">
                          <ButtonIcon>
                            <ActionIcon name="close" />
                          </ButtonIcon>
                          {cancelLabel}
                        </SecondaryButton>
                      </FooterCancelGroup>
                      <FooterActionsMount ref={setFooterPortalTarget} />
                    </FooterRow>
                  </Footer>
                </Surface>
              </FooterPortalContext.Provider>
            </Dialog>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Mounts form actions into the persistent modal footer so long forms keep their
 * primary actions visible without duplicating button rows inside the body.
 *
 * @param {object} props - Portal content props.
 * @returns {React.ReactPortal|null} Footer-mounted action content.
 */
export function AdminModalFooterActions({ children }) {
  const target = useContext(FooterPortalContext);

  if (!target) {
    return null;
  }

  return createPortal(<FooterActionGroup>{children}</FooterActionGroup>, target);
}
