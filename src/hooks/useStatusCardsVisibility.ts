import {
  DEFAULT_STATUS_CARDS_VISIBILITY,
  type StatusCardsVisibility,
  useTheme,
} from "@/contexts/ThemeContext";

export { DEFAULT_STATUS_CARDS_VISIBILITY };
export type { StatusCardsVisibility };

export function useStatusCardsVisibility() {
  const { statusCardsVisibility, setStatusCardVisibility } = useTheme();

  return [statusCardsVisibility, setStatusCardVisibility] as const;
}
