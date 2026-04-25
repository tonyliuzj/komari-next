const REGIONAL_INDICATOR_START = 0x1f1e6;
const ASCII_ALPHA_START = 0x41;

export const getCountryCodeFromFlagEmoji = (emoji: string): string | null => {
  const chars = Array.from(emoji);

  if (chars.length !== 2) {
    return null;
  }

  const codePoint1 = chars[0].codePointAt(0);
  const codePoint2 = chars[1].codePointAt(0);

  if (!codePoint1 || !codePoint2) {
    return null;
  }

  const isRegionalIndicator = (value: number) =>
    value >= REGIONAL_INDICATOR_START && value <= 0x1f1ff;

  if (!isRegionalIndicator(codePoint1) || !isRegionalIndicator(codePoint2)) {
    return null;
  }

  const letter1 = String.fromCodePoint(
    codePoint1 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START
  );
  const letter2 = String.fromCodePoint(
    codePoint2 - REGIONAL_INDICATOR_START + ASCII_ALPHA_START
  );

  return `${letter1}${letter2}`;
};

export const resolveFlagCode = (flag: string): string => {
  const countryCodeFromEmoji = getCountryCodeFromFlagEmoji(flag);

  if (countryCodeFromEmoji) {
    return countryCodeFromEmoji;
  }

  if (flag && flag.length === 2 && /^[a-zA-Z]{2}$/.test(flag)) {
    return flag.toUpperCase();
  }

  if (flag === "🇭🇦" || flag === "🌪") {
    return "UN";
  }

  return "UN";
};
