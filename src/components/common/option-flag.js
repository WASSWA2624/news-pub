import styled from "styled-components";

const FlagWrap = styled.span`
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  line-height: 1;
`;

const FlagImage = styled.img`
  border: 1px solid rgba(24, 39, 66, 0.08);
  border-radius: ${({ $size }) => ($size === "compact" ? "3px" : "4px")};
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
        <FlagImage $size={size} alt="" src={flagImageUrl} />
      ) : (
        <FlagEmoji $size={size}>{flagEmoji}</FlagEmoji>
      )}
    </FlagWrap>
  );
}
