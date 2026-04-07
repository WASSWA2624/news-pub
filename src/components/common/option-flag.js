import styled from "styled-components";

import ResponsiveImage from "@/components/common/responsive-image";

const FlagWrap = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  line-height: 1;
`;

const FlagImage = styled(ResponsiveImage)`
  border: 1px solid rgba(24, 39, 66, 0.08);
  border-radius: var(--theme-radius-lg, 2px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  display: block;
  height: ${({ $size }) => ($size === "compact" ? "0.72rem" : "0.84rem")};
  width: auto;
`;

const FlagEmoji = styled.span`
  display: inline-block;
  font-size: ${({ $size }) => ($size === "compact" ? "0.82rem" : "0.94rem")};
  line-height: 1;
`;

/**
 * Displays either a flag image or emoji for locale and country selectors.
 *
 * @param {object} props - Component props.
 * @param {string} [props.flagEmoji] - Emoji fallback shown when no image URL is available.
 * @param {string} [props.flagImageUrl] - Remote or local flag image URL.
 * @param {"compact"|"regular"} [props.size="regular"] - Visual size variant.
 * @returns {JSX.Element|null} The rendered flag marker or `null` when no flag data exists.
 */
export default function OptionFlag({
  flagEmoji = "",
  flagImageUrl = "",
  size = "regular",
}) {
  if (!flagEmoji && !flagImageUrl) {
    return null;
  }

  const shouldShowImage = Boolean(flagImageUrl);

  return (
    <FlagWrap aria-hidden="true">
      {shouldShowImage ? (
        <FlagImage
          $size={size}
          alt=""
          height={size === "compact" ? 14 : 17}
          src={flagImageUrl}
          width={size === "compact" ? 20 : 24}
        />
      ) : (
        <FlagEmoji $size={size}>{flagEmoji}</FlagEmoji>
      )}
    </FlagWrap>
  );
}
