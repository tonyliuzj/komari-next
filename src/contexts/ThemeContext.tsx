"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useTheme as useNextTheme } from "next-themes";
import { updateSettings } from "@/lib/api";
import i18n, { detectClientLanguage, normalizeLanguage } from "@/i18n/config";

export type ColorTheme = "default" | "ocean" | "sunset" | "forest" | "midnight" | "rose";
export type CardLayout = "classic" | "modern" | "minimal" | "detailed" | "compact";
export type CardDesign = "default" | "quality-bars";
export type StatusDesign = "default" | "speed";
export type GraphDesign = "circle" | "progress" | "bar" | "minimal";
export type NodeViewMode = "grid" | "table";
export type BackgroundBlurType = "soft" | "glass";
export type CardBlurType = BackgroundBlurType;
export type Appearance = "light" | "dark" | "system";

export interface ThemeConfig {
  colorTheme: ColorTheme;
  cardLayout: CardLayout;
  cardDesign: CardDesign;
  statusDesign: StatusDesign;
  graphDesign: GraphDesign;
  showRamDiskTotal: boolean;
  backgroundImageUrl?: string;
  backgroundBlurEnabled: boolean;
  backgroundBlurType: BackgroundBlurType;
  backgroundBlurIntensity: number;
  backgroundMaskOpacity: number;
  cardBlurEnabled: boolean;
  cardBlurType: CardBlurType;
  // Persisted key kept for compatibility; this now drives card transparency.
  cardBlurIntensity: number;
  cardExtraBlurIntensity: number;
}

export type StatusCardsVisibility = {
  currentTime: boolean;
  currentOnline: boolean;
  regionOverview: boolean;
  trafficOverview: boolean;
  networkSpeed: boolean;
  mapView: boolean;
};

export interface ManagedThemeSettings extends Partial<ThemeConfig> {
  statusCardsVisibility?: Partial<StatusCardsVisibility>;
  nodeViewMode?: NodeViewMode;
  appearance?: Appearance;
  language?: string;
}

interface ThemeContextType {
  themeConfig: ThemeConfig;
  managedThemeSettings: ManagedThemeSettings;
  isThemeSettingsAdmin: boolean;
  isThemeLoaded: boolean;
  statusCardsVisibility: StatusCardsVisibility;
  nodeViewMode: NodeViewMode;
  appearance: Appearance;
  language: string;
  setColorTheme: (theme: ColorTheme) => void;
  setCardLayout: (layout: CardLayout) => void;
  setCardDesign: (design: CardDesign) => void;
  setStatusDesign: (design: StatusDesign) => void;
  setGraphDesign: (design: GraphDesign) => void;
  setShowRamDiskTotal: (show: boolean) => void;
  setBackgroundImageUrl: (url: string) => void;
  setBackgroundBlurEnabled: (enabled: boolean) => void;
  setBackgroundBlurType: (type: BackgroundBlurType) => void;
  setBackgroundBlurIntensity: (intensity: number) => void;
  setBackgroundMaskOpacity: (opacity: number) => void;
  setCardBlurEnabled: (enabled: boolean) => void;
  setCardBlurType: (type: CardBlurType) => void;
  setCardTransparentIntensity: (intensity: number) => void;
  setCardBlurIntensity: (intensity: number) => void;
  setCardExtraBlurIntensity: (intensity: number) => void;
  setStatusCardVisibility: (key: keyof StatusCardsVisibility, checked: boolean) => void;
  setNodeViewMode: (value: NodeViewMode) => void;
  setAppearance: (value: Appearance) => void;
  setLanguage: (value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LEGACY_THEME_STORAGE_KEY = "komari-theme-config";
const THEME_OVERRIDES_STORAGE_KEY = "komari-theme-config-overrides";
const STATUS_CARDS_STORAGE_KEY = "statusCardsVisibility";
const STATUS_CARDS_CHANGE_EVENT = "statusCardsVisibilityChange";
const NODE_VIEW_STORAGE_KEY = "nodeViewMode";
const NODE_VIEW_CHANGE_EVENT = "nodeViewModeChange";
const APPEARANCE_STORAGE_KEY = "komari-appearance";
const NEXT_THEMES_STORAGE_KEY = "theme";
const LANGUAGE_STORAGE_KEY = "komari-language";
const I18NEXT_STORAGE_KEY = "i18nextLng";
const LOCAL_OVERRIDE_BASE_SIGNATURE_KEY = "komari-theme-local-override-base";

const COLOR_THEMES: ColorTheme[] = ["default", "ocean", "sunset", "forest", "midnight", "rose"];
const CARD_LAYOUTS: CardLayout[] = ["classic", "modern", "minimal", "detailed", "compact"];
const CARD_DESIGNS: CardDesign[] = ["default", "quality-bars"];
const STATUS_DESIGNS: StatusDesign[] = ["default", "speed"];
const GRAPH_DESIGNS: GraphDesign[] = ["circle", "progress", "bar", "minimal"];
const NODE_VIEW_MODES: NodeViewMode[] = ["grid", "table"];
const APPEARANCES: Appearance[] = ["light", "dark", "system"];
const BACKGROUND_BLUR_TYPES: BackgroundBlurType[] = ["soft", "glass"];
const CARD_BLUR_STYLE_PROPERTIES = {
  filter: "--komari-card-backdrop-filter",
  backgroundAlpha: "--komari-card-background-alpha",
  borderAlpha: "--komari-card-border-alpha",
  glassStartAlpha: "--komari-card-glass-start-alpha",
  glassMiddleAlpha: "--komari-card-glass-middle-alpha",
  glassEndAlpha: "--komari-card-glass-end-alpha",
  glassHighlightMix: "--komari-card-glass-highlight-mix",
  glassDarkHighlightMix: "--komari-card-glass-dark-highlight-mix",
  glassBorderWhiteMix: "--komari-card-glass-border-white-mix",
  glassDarkBorderWhiteMix: "--komari-card-glass-dark-border-white-mix",
  glassOutlineAlpha: "--komari-card-glass-outline-alpha",
  glassDarkOutlineAlpha: "--komari-card-glass-dark-outline-alpha",
  glassShadowAlpha: "--komari-card-glass-shadow-alpha",
  glassSecondaryShadowAlpha: "--komari-card-glass-secondary-shadow-alpha",
  glassDarkShadowAlpha: "--komari-card-glass-dark-shadow-alpha",
  glassDarkSecondaryShadowAlpha: "--komari-card-glass-dark-secondary-shadow-alpha",
  glassInnerHighlightAlpha: "--komari-card-glass-inner-highlight-alpha",
  glassDarkInnerHighlightAlpha: "--komari-card-glass-dark-inner-highlight-alpha",
  glassInnerLowlightAlpha: "--komari-card-glass-inner-lowlight-alpha",
  glassDarkInnerLowlightAlpha: "--komari-card-glass-dark-inner-lowlight-alpha",
} as const;

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colorTheme: "default",
  cardLayout: "classic",
  cardDesign: "default",
  statusDesign: "default",
  graphDesign: "circle",
  showRamDiskTotal: false,
  backgroundImageUrl: "",
  backgroundBlurEnabled: false,
  backgroundBlurType: "soft",
  backgroundBlurIntensity: 35,
  backgroundMaskOpacity: 0,
  cardBlurEnabled: false,
  cardBlurType: "glass",
  cardBlurIntensity: 35,
  cardExtraBlurIntensity: 35,
};

export const DEFAULT_STATUS_CARDS_VISIBILITY: StatusCardsVisibility = {
  currentTime: true,
  currentOnline: true,
  regionOverview: true,
  trafficOverview: true,
  networkSpeed: true,
  mapView: true,
};

export const DEFAULT_NODE_VIEW_MODE: NodeViewMode = "grid";
export const DEFAULT_APPEARANCE: Appearance = "system";

type AdminState = "loading" | "yes" | "no";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJsonStorage(key: string): unknown {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    if (isRecord(value) && Object.keys(value).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }

    if (value === undefined || value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

function removeStorage(key: string) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(key);
}

function readStringStorage(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStringStorage(key: string, value: string) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(key, value);
}

function clearI18nLanguageCache() {
  removeStorage(I18NEXT_STORAGE_KEY);

  if (typeof document !== "undefined") {
    document.cookie = "i18next=; Max-Age=0; path=/";
  }
}

function writeThemeOverrides(value: Partial<ThemeConfig>) {
  writeJsonStorage(THEME_OVERRIDES_STORAGE_KEY, value);

  removeStorage(LEGACY_THEME_STORAGE_KEY);
}

function parseThemeSettings(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(input) ? input : {};
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function pickAppearance(value: unknown): Appearance | undefined {
  return pickEnum(value, APPEARANCES);
}

function pickManagedLanguage(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "auto") {
    return undefined;
  }

  return normalizeLanguage(value);
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pickBlurType(value: unknown): BackgroundBlurType | undefined {
  return pickEnum(value, BACKGROUND_BLUR_TYPES);
}

function pickNumber(value: unknown): number | undefined {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function clampBackgroundBlurIntensity(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function cssPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function cssAlpha(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function cssString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\A ")
    .replace(/\r/g, "\\D ")
    .replace(/\f/g, "\\C ");
}

function getBackgroundBlurPresentation(
  type: BackgroundBlurType,
  intensity: number,
  enabled: boolean
) {
  if (!enabled || intensity <= 0) {
    return {
      filter: "none",
      bleed: "0px",
    };
  }

  const normalized = clampBackgroundBlurIntensity(intensity);
  const blur = (multiplier: number) => Number((normalized * multiplier).toFixed(1));
  const amount = normalized / 100;

  const filterByType: Record<BackgroundBlurType, string> = {
    soft: `blur(${blur(0.1)}px) saturate(${(1 + amount * 0.04).toFixed(2)})`,
    glass: `blur(${blur(0.42)}px) saturate(${(1 + amount * 1.1).toFixed(2)}) brightness(${(1 + amount * 0.12).toFixed(2)}) contrast(${(1 - amount * 0.1).toFixed(2)})`,
  };

  return {
    filter: filterByType[type],
    bleed: `${Math.ceil(normalized * 0.28)}px`,
  };
}

function getCardBlurPresentation(
  type: CardBlurType,
  transparentIntensity: number,
  extraBlurIntensity: number,
  enabled: boolean
) {
  if (!enabled) {
    return {
      filter: "none",
      backgroundAlpha: "100%",
      borderAlpha: "100%",
      glassStartAlpha: "100%",
      glassMiddleAlpha: "100%",
      glassEndAlpha: "100%",
      glassHighlightMix: "0%",
      glassDarkHighlightMix: "0%",
      glassBorderWhiteMix: "0%",
      glassDarkBorderWhiteMix: "0%",
      glassOutlineAlpha: "0",
      glassDarkOutlineAlpha: "0",
      glassShadowAlpha: "0",
      glassSecondaryShadowAlpha: "0",
      glassDarkShadowAlpha: "0",
      glassDarkSecondaryShadowAlpha: "0",
      glassInnerHighlightAlpha: "0",
      glassDarkInnerHighlightAlpha: "0",
      glassInnerLowlightAlpha: "0",
      glassDarkInnerLowlightAlpha: "0",
    };
  }

  const transparentNormalized = clampBackgroundBlurIntensity(transparentIntensity);
  const extraBlurNormalized = clampBackgroundBlurIntensity(extraBlurIntensity);
  const blur = (multiplier: number) => Number((extraBlurNormalized * multiplier).toFixed(1));
  const transparentAmount = transparentNormalized / 100;
  const extraBlurAmount = extraBlurNormalized / 100;

  const filterByType: Record<CardBlurType, string> = {
    soft: `blur(${blur(0.08)}px) saturate(${(1 + extraBlurAmount * 0.06).toFixed(2)})`,
    glass: `blur(${blur(0.42)}px) saturate(${(1 + extraBlurAmount * 1.15).toFixed(2)}) brightness(${(1 + extraBlurAmount * 0.12).toFixed(2)}) contrast(${(1 - extraBlurAmount * 0.1).toFixed(2)})`,
  };

  const backgroundAlphaByType: Record<CardBlurType, number> = {
    soft: 100 - transparentAmount * 100,
    glass: 72 - transparentAmount * 36,
  };

  const borderAlphaByType: Record<CardBlurType, number> = {
    soft: 90 - transparentAmount * 60,
    glass: 80 + transparentAmount * 20,
  };

  return {
    filter: extraBlurNormalized > 0 ? filterByType[type] : "none",
    backgroundAlpha: `${Math.round(backgroundAlphaByType[type])}%`,
    borderAlpha: `${Math.round(borderAlphaByType[type])}%`,
    glassStartAlpha: cssPercent(72 - transparentAmount * 36),
    glassMiddleAlpha: cssPercent(46 - transparentAmount * 26),
    glassEndAlpha: cssPercent(34 - transparentAmount * 22),
    glassHighlightMix: cssPercent(8 + extraBlurAmount * 22),
    glassDarkHighlightMix: cssPercent(5 + extraBlurAmount * 14),
    glassBorderWhiteMix: cssPercent(28 + extraBlurAmount * 42),
    glassDarkBorderWhiteMix: cssPercent(14 + extraBlurAmount * 24),
    glassOutlineAlpha: cssAlpha(0.14 + extraBlurAmount * 0.28),
    glassDarkOutlineAlpha: cssAlpha(0.08 + extraBlurAmount * 0.18),
    glassShadowAlpha: cssAlpha(0.08 + extraBlurAmount * 0.2),
    glassSecondaryShadowAlpha: cssAlpha(0.05 + extraBlurAmount * 0.12),
    glassDarkShadowAlpha: cssAlpha(0.24 + extraBlurAmount * 0.28),
    glassDarkSecondaryShadowAlpha: cssAlpha(0.16 + extraBlurAmount * 0.18),
    glassInnerHighlightAlpha: cssAlpha(0.18 + extraBlurAmount * 0.42),
    glassDarkInnerHighlightAlpha: cssAlpha(0.1 + extraBlurAmount * 0.2),
    glassInnerLowlightAlpha: cssAlpha(0.06 + extraBlurAmount * 0.12),
    glassDarkInnerLowlightAlpha: cssAlpha(0.04 + extraBlurAmount * 0.08),
  };
}

function readDottedValue(input: Record<string, unknown>, dottedKey: string): unknown {
  const nestedValue = dottedKey.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[part];
  }, input);

  if (nestedValue !== undefined) {
    return nestedValue;
  }

  return input[dottedKey];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function getManagedSettingsSignature(input: Record<string, unknown>): string {
  return stableStringify(input);
}

function normalizeThemeConfig(config: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...config,
  };
}

function normalizeThemeConfigOverrides(input: unknown): Partial<ThemeConfig> {
  if (!isRecord(input)) {
    return {};
  }

  const result: Partial<ThemeConfig> = {};
  const colorTheme = pickEnum(input.colorTheme, COLOR_THEMES);
  const cardLayout = pickEnum(input.cardLayout, CARD_LAYOUTS);
  const cardDesign = pickEnum(input.cardDesign, CARD_DESIGNS);
  const statusDesign = pickEnum(input.statusDesign, STATUS_DESIGNS);
  const graphDesign = pickEnum(input.graphDesign, GRAPH_DESIGNS);
  const showRamDiskTotal = pickBoolean((input as any).showRamDiskTotal);
  const backgroundImageUrl = pickString(input.backgroundImageUrl);
  const backgroundBlurEnabled = pickBoolean(input.backgroundBlurEnabled);
  const backgroundBlurType = pickBlurType(input.backgroundBlurType);
  const backgroundBlurIntensity = pickNumber(input.backgroundBlurIntensity);
  const backgroundMaskOpacity = pickNumber(input.backgroundMaskOpacity);
  const cardBlurEnabled = pickBoolean(input.cardBlurEnabled);
  const cardBlurType = pickBlurType(input.cardBlurType);
  const cardBlurIntensity = pickNumber(input.cardBlurIntensity);
  const cardExtraBlurIntensity = pickNumber(input.cardExtraBlurIntensity);

  if (colorTheme) result.colorTheme = colorTheme;
  if (cardLayout) result.cardLayout = cardLayout;
  if (cardDesign) result.cardDesign = cardDesign;
  if (statusDesign) result.statusDesign = statusDesign;
  if (graphDesign) result.graphDesign = graphDesign;
  if (showRamDiskTotal !== undefined) result.showRamDiskTotal = showRamDiskTotal;
  if (backgroundImageUrl !== undefined) result.backgroundImageUrl = backgroundImageUrl;
  if (backgroundBlurEnabled !== undefined) result.backgroundBlurEnabled = backgroundBlurEnabled;
  if (backgroundBlurType) result.backgroundBlurType = backgroundBlurType;
  if (backgroundBlurIntensity !== undefined) {
    result.backgroundBlurIntensity = clampBackgroundBlurIntensity(backgroundBlurIntensity);
  }
  if (backgroundMaskOpacity !== undefined) {
    result.backgroundMaskOpacity = clampBackgroundBlurIntensity(backgroundMaskOpacity);
  }
  if (cardBlurEnabled !== undefined) result.cardBlurEnabled = cardBlurEnabled;
  if (cardBlurType) result.cardBlurType = cardBlurType;
  if (cardBlurIntensity !== undefined) {
    result.cardBlurIntensity = clampBackgroundBlurIntensity(cardBlurIntensity);
  }
  if (cardExtraBlurIntensity !== undefined) {
    result.cardExtraBlurIntensity = clampBackgroundBlurIntensity(cardExtraBlurIntensity);
  }

  return result;
}

function normalizeStatusCardsVisibilityOverrides(input: unknown): Partial<StatusCardsVisibility> {
  if (!isRecord(input)) {
    return {};
  }

  const result: Partial<StatusCardsVisibility> = {};
  (Object.keys(DEFAULT_STATUS_CARDS_VISIBILITY) as Array<keyof StatusCardsVisibility>).forEach((key) => {
    const value = pickBoolean(input[key]);
    if (value !== undefined) {
      result[key] = value;
    }
  });

  return result;
}

function normalizeManagedThemeSettings(input: unknown): ManagedThemeSettings {
  const source = parseThemeSettings(input);
  const result: ManagedThemeSettings = normalizeThemeConfigOverrides(source);
  const nodeViewMode = pickEnum(readDottedValue(source, "nodeViewMode"), NODE_VIEW_MODES);
  const appearance = pickAppearance(readDottedValue(source, "appearance"));
  const language = pickManagedLanguage(readDottedValue(source, "language"));
  const statusCardsVisibility: Partial<StatusCardsVisibility> = {};

  (Object.keys(DEFAULT_STATUS_CARDS_VISIBILITY) as Array<keyof StatusCardsVisibility>).forEach((key) => {
    const value = pickBoolean(readDottedValue(source, `statusCardsVisibility.${key}`));
    if (value !== undefined) {
      statusCardsVisibility[key] = value;
    }
  });

  if (Object.keys(statusCardsVisibility).length > 0) {
    result.statusCardsVisibility = statusCardsVisibility;
  }

  if (nodeViewMode) {
    result.nodeViewMode = nodeViewMode;
  }

  if (appearance) {
    result.appearance = appearance;
  }

  if (language) {
    result.language = language;
  }

  return result;
}

function extractLegacyThemeOverrides(input: unknown): Partial<ThemeConfig> {
  const config = normalizeThemeConfigOverrides(input);
  const result: Partial<ThemeConfig> = {};

  (Object.keys(config) as Array<keyof ThemeConfig>).forEach((key) => {
    if (config[key] !== DEFAULT_THEME_CONFIG[key]) {
      result[key] = config[key] as never;
    }
  });

  return result;
}

function readInitialThemeOverrides(): Partial<ThemeConfig> {
  const current = normalizeThemeConfigOverrides(readJsonStorage(THEME_OVERRIDES_STORAGE_KEY));
  if (Object.keys(current).length > 0) {
    return current;
  }

  return extractLegacyThemeOverrides(readJsonStorage(LEGACY_THEME_STORAGE_KEY));
}

function readInitialStatusCardsOverrides(): Partial<StatusCardsVisibility> {
  return normalizeStatusCardsVisibilityOverrides(readJsonStorage(STATUS_CARDS_STORAGE_KEY));
}

function readInitialNodeViewOverride(): NodeViewMode | undefined {
  return pickEnum(readJsonStorage(NODE_VIEW_STORAGE_KEY), NODE_VIEW_MODES);
}

function readInitialAppearanceOverride(): Appearance | undefined {
  return pickAppearance(readStringStorage(APPEARANCE_STORAGE_KEY));
}

function readInitialLanguageOverride(): string | undefined {
  return normalizeLanguage(readStringStorage(LANGUAGE_STORAGE_KEY));
}

function hasLocalOverrides() {
  return (
    Object.keys(normalizeThemeConfigOverrides(readJsonStorage(THEME_OVERRIDES_STORAGE_KEY))).length > 0 ||
    Object.keys(extractLegacyThemeOverrides(readJsonStorage(LEGACY_THEME_STORAGE_KEY))).length > 0 ||
    Object.keys(normalizeStatusCardsVisibilityOverrides(readJsonStorage(STATUS_CARDS_STORAGE_KEY))).length > 0 ||
    readInitialNodeViewOverride() !== undefined ||
    readInitialAppearanceOverride() !== undefined ||
    readInitialLanguageOverride() !== undefined
  );
}

function dispatchCustomEvent<T>(eventName: string, detail: T) {
  if (typeof window === "undefined") {
    return;
  }

  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

function removeKeys<T extends Record<string, unknown>, K extends keyof T>(
  source: Partial<T>,
  keys: K[]
): Partial<T> {
  const next = { ...source };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

function mergeManagedSettings(
  current: Partial<ManagedThemeSettings> | Record<string, unknown>,
  patch: ManagedThemeSettings
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current as Record<string, unknown>) };

  (
    [
      "colorTheme",
      "cardLayout",
      "cardDesign",
      "statusDesign",
      "graphDesign",
      "showRamDiskTotal",
      "backgroundImageUrl",
      "backgroundBlurEnabled",
      "backgroundBlurType",
      "backgroundBlurIntensity",
      "backgroundMaskOpacity",
      "cardBlurEnabled",
      "cardBlurType",
      "cardBlurIntensity",
      "cardExtraBlurIntensity",
      "appearance",
      "language",
    ] as const
  ).forEach((key) => {
    if (patch[key] !== undefined) {
      next[key] = patch[key];
    }
  });

  if (patch.nodeViewMode !== undefined) {
    next.nodeViewMode = patch.nodeViewMode;
  }

  if (patch.statusCardsVisibility) {
    Object.keys(patch.statusCardsVisibility).forEach((key) => {
      delete next[`statusCardsVisibility.${key}`];
    });

    next.statusCardsVisibility = {
      ...(isRecord(next.statusCardsVisibility) ? next.statusCardsVisibility : {}),
      ...patch.statusCardsVisibility,
    };
  }

  return next;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setTheme: setNextTheme } = useNextTheme();
  const [localThemeOverrides, setLocalThemeOverrides] = useState<Partial<ThemeConfig>>(readInitialThemeOverrides);
  const [localStatusCardsOverrides, setLocalStatusCardsOverrides] =
    useState<Partial<StatusCardsVisibility>>(readInitialStatusCardsOverrides);
  const [localNodeViewOverride, setLocalNodeViewOverride] =
    useState<NodeViewMode | undefined>(readInitialNodeViewOverride);
  const [localAppearanceOverride, setLocalAppearanceOverride] =
    useState<Appearance | undefined>(readInitialAppearanceOverride);
  const [localLanguageOverride, setLocalLanguageOverride] =
    useState<string | undefined>(readInitialLanguageOverride);
  const [managedThemeSettings, setManagedThemeSettings] = useState<ManagedThemeSettings>({});
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [managedSettingsSignature, setManagedSettingsSignature] = useState(
    getManagedSettingsSignature({})
  );
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const rawManagedSettingsRef = useRef<Record<string, unknown>>({});
  const pendingAdminPatchRef = useRef<ManagedThemeSettings>({});
  const queuedSaveRef = useRef<Record<string, unknown> | null>(null);
  const savingRef = useRef(false);

  const themeConfig = useMemo(
    () =>
      normalizeThemeConfig({
        ...managedThemeSettings,
        ...localThemeOverrides,
      }),
    [localThemeOverrides, managedThemeSettings]
  );

  const statusCardsVisibility = useMemo<StatusCardsVisibility>(
    () => ({
      ...DEFAULT_STATUS_CARDS_VISIBILITY,
      ...(managedThemeSettings.statusCardsVisibility || {}),
      ...localStatusCardsOverrides,
    }),
    [localStatusCardsOverrides, managedThemeSettings.statusCardsVisibility]
  );

  const nodeViewMode =
    localNodeViewOverride ||
    managedThemeSettings.nodeViewMode ||
    DEFAULT_NODE_VIEW_MODE;

  const appearance =
    localAppearanceOverride ||
    managedThemeSettings.appearance ||
    DEFAULT_APPEARANCE;

  const language = useMemo(
    () =>
      localLanguageOverride ||
      managedThemeSettings.language ||
      normalizeLanguage(detectClientLanguage()) ||
      "en",
    [localLanguageOverride, managedThemeSettings.language]
  );

  const clearLocalOverrides = useCallback(() => {
    setLocalThemeOverrides({});
    setLocalStatusCardsOverrides({});
    setLocalNodeViewOverride(undefined);
    setLocalAppearanceOverride(undefined);
    setLocalLanguageOverride(undefined);

    writeThemeOverrides({});
    writeJsonStorage(STATUS_CARDS_STORAGE_KEY, {});
    writeJsonStorage(NODE_VIEW_STORAGE_KEY, undefined);
    removeStorage(APPEARANCE_STORAGE_KEY);
    removeStorage(NEXT_THEMES_STORAGE_KEY);
    removeStorage(LANGUAGE_STORAGE_KEY);
    clearI18nLanguageCache();
    removeStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY);
  }, []);

  const applyManagedSettings = useCallback((rawSettings: Record<string, unknown>) => {
    const nextSignature = getManagedSettingsSignature(rawSettings);
    const localBaseSignature = readStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY);
    const shouldClearLocalOverrides =
      Object.keys(rawSettings).length > 0 &&
      hasLocalOverrides() &&
      localBaseSignature !== nextSignature;

    rawManagedSettingsRef.current = rawSettings;
    setManagedThemeSettings(normalizeManagedThemeSettings(rawSettings));
    setManagedSettingsSignature(nextSignature);

    if (shouldClearLocalOverrides) {
      clearLocalOverrides();
    }
  }, [clearLocalOverrides]);

  const persistManagedSettings = useCallback((patch: ManagedThemeSettings) => {
    const nextRaw = mergeManagedSettings(rawManagedSettingsRef.current, patch);
    rawManagedSettingsRef.current = nextRaw;
    setManagedThemeSettings(normalizeManagedThemeSettings(nextRaw));
    setManagedSettingsSignature(getManagedSettingsSignature(nextRaw));
    clearLocalOverrides();
    queuedSaveRef.current = nextRaw;

    if (savingRef.current) {
      return;
    }

    const run = async () => {
      savingRef.current = true;
      while (queuedSaveRef.current) {
        const value = queuedSaveRef.current;
        queuedSaveRef.current = null;

        try {
          await updateSettings({ theme_settings: value });
        } catch (error) {
          console.warn("Failed to save theme settings:", error);
        }
      }
      savingRef.current = false;
    };

    void run();
  }, [clearLocalOverrides]);

  const applyAdminOrLocalPatch = useCallback(
    (patch: ManagedThemeSettings) => {
      if (adminState === "yes") {
        persistManagedSettings(patch);
        return true;
      }

      if (adminState === "loading") {
        pendingAdminPatchRef.current = mergeManagedSettings(pendingAdminPatchRef.current, patch);
      }

      return false;
    },
    [adminState, persistManagedSettings]
  );

  const setLocalThemePatch = useCallback(
    (patch: Partial<ThemeConfig>) => {
      const isAdminPatch = applyAdminOrLocalPatch(patch);
      const keys = Object.keys(patch) as Array<keyof ThemeConfig>;

      setLocalThemeOverrides((prev) => {
        const next = isAdminPatch ? removeKeys(prev, keys) : { ...prev, ...patch };
        writeThemeOverrides(next);
        if (!isAdminPatch) {
          writeStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY, managedSettingsSignature);
        }
        return next;
      });
    },
    [applyAdminOrLocalPatch, managedSettingsSignature]
  );

  const setLocalStatusCardsPatch = useCallback(
    (patch: Partial<StatusCardsVisibility>) => {
      const isAdminPatch = applyAdminOrLocalPatch({ statusCardsVisibility: patch });
      const keys = Object.keys(patch) as Array<keyof StatusCardsVisibility>;

      setLocalStatusCardsOverrides((prev) => {
        const next = isAdminPatch ? removeKeys(prev, keys) : { ...prev, ...patch };
        writeJsonStorage(STATUS_CARDS_STORAGE_KEY, next);
        if (!isAdminPatch) {
          writeStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY, managedSettingsSignature);
        }
        dispatchCustomEvent(STATUS_CARDS_CHANGE_EVENT, {
          ...DEFAULT_STATUS_CARDS_VISIBILITY,
          ...(managedThemeSettings.statusCardsVisibility || {}),
          ...next,
        });
        return next;
      });
    },
    [applyAdminOrLocalPatch, managedSettingsSignature, managedThemeSettings.statusCardsVisibility]
  );

  const setNodeViewModeValue = useCallback(
    (value: NodeViewMode) => {
      const isAdminPatch = applyAdminOrLocalPatch({ nodeViewMode: value });
      const nextLocalValue = isAdminPatch ? undefined : value;

      setLocalNodeViewOverride(nextLocalValue);
      writeJsonStorage(NODE_VIEW_STORAGE_KEY, nextLocalValue);
      if (!isAdminPatch) {
        writeStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY, managedSettingsSignature);
      }
      dispatchCustomEvent(NODE_VIEW_CHANGE_EVENT, value);
    },
    [applyAdminOrLocalPatch, managedSettingsSignature]
  );

  const setAppearanceValue = useCallback(
    (value: Appearance) => {
      const isAdminPatch = applyAdminOrLocalPatch({ appearance: value });
      const nextLocalValue = isAdminPatch ? undefined : value;

      setLocalAppearanceOverride(nextLocalValue);
      if (nextLocalValue) {
        writeStringStorage(APPEARANCE_STORAGE_KEY, nextLocalValue);
      } else {
        removeStorage(APPEARANCE_STORAGE_KEY);
      }
      if (!isAdminPatch) {
        writeStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY, managedSettingsSignature);
      }
    },
    [applyAdminOrLocalPatch, managedSettingsSignature]
  );

  const setLanguageValue = useCallback(
    (value: string) => {
      const nextLanguage = normalizeLanguage(value);
      if (!nextLanguage) {
        return;
      }

      const isAdminPatch = applyAdminOrLocalPatch({ language: nextLanguage });
      const nextLocalValue = isAdminPatch ? undefined : nextLanguage;

      setLocalLanguageOverride(nextLocalValue);
      if (nextLocalValue) {
        writeStringStorage(LANGUAGE_STORAGE_KEY, nextLocalValue);
      } else {
        removeStorage(LANGUAGE_STORAGE_KEY);
      }
      if (!isAdminPatch) {
        writeStringStorage(LOCAL_OVERRIDE_BASE_SIGNATURE_KEY, managedSettingsSignature);
      }
    },
    [applyAdminOrLocalPatch, managedSettingsSignature]
  );

  useEffect(() => {
    let mounted = true;

    fetch("/api/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((resp) => {
        if (!mounted) return;
        const rawSettings = parseThemeSettings(resp?.data?.theme_settings);
        applyManagedSettings(rawSettings);
        setIsThemeLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        applyManagedSettings({});
        setIsThemeLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [applyManagedSettings]);

  useEffect(() => {
    let mounted = true;

    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted) {
          setAdminState(data?.logged_in ? "yes" : "no");
        }
      })
      .catch(() => {
        if (mounted) {
          setAdminState("no");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (adminState === "loading") {
      return;
    }

    const pendingPatch = pendingAdminPatchRef.current;
    pendingAdminPatchRef.current = {};

    if (adminState !== "yes" || Object.keys(pendingPatch).length === 0) {
      return;
    }

    persistManagedSettings(pendingPatch);

    setLocalThemeOverrides((prev) => {
      const keys = Object.keys(pendingPatch).filter((key): key is keyof ThemeConfig =>
        key in DEFAULT_THEME_CONFIG
      );
      const next = removeKeys(prev, keys);
      writeThemeOverrides(next);
      return next;
    });

    if (pendingPatch.statusCardsVisibility) {
      setLocalStatusCardsOverrides((prev) => {
        const keys = Object.keys(pendingPatch.statusCardsVisibility || {}) as Array<keyof StatusCardsVisibility>;
        const next = removeKeys(prev, keys);
        writeJsonStorage(STATUS_CARDS_STORAGE_KEY, next);
        return next;
      });
    }

    if (pendingPatch.nodeViewMode !== undefined) {
      setLocalNodeViewOverride(undefined);
      writeJsonStorage(NODE_VIEW_STORAGE_KEY, undefined);
    }

    if (pendingPatch.appearance !== undefined) {
      setLocalAppearanceOverride(undefined);
      removeStorage(APPEARANCE_STORAGE_KEY);
    }

    if (pendingPatch.language !== undefined) {
      setLocalLanguageOverride(undefined);
      removeStorage(LANGUAGE_STORAGE_KEY);
    }
  }, [adminState, persistManagedSettings]);

  useEffect(() => {
    setNextTheme(appearance);
  }, [appearance, setNextTheme]);

  useEffect(() => {
    const nextLanguage = normalizeLanguage(language) || "en";
    if (i18n.language !== nextLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLanguage.replace("_", "-");
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-color-theme", themeConfig.colorTheme);
  }, [themeConfig.colorTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "";

    // 清理上一个 preload link（如果有）
    const prevPreload = document.head.querySelector("link[data-komari-bg-preload]");
    if (prevPreload) prevPreload.remove();

    if (!themeConfig.backgroundImageUrl) {
      delete document.body.dataset.customBackground;
      document.body.style.removeProperty("--komari-custom-background-image");
      document.body.style.removeProperty("--komari-custom-background-filter");
      document.body.style.removeProperty("--komari-custom-background-inset");
      document.body.style.removeProperty("--komari-custom-background-bleed");
      document.body.style.removeProperty("--komari-custom-background-scale");
      document.body.style.removeProperty("--komari-custom-background-mask-opacity");
      return;
    }

    // 注入 preload，让浏览器以最高优先级提前下载背景图
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = themeConfig.backgroundImageUrl;
    preload.setAttribute("data-komari-bg-preload", "true");
    // 插到 <head> 最前面，优先级最高
    document.head.insertBefore(preload, document.head.firstChild);

    const { filter, bleed } = getBackgroundBlurPresentation(
      themeConfig.backgroundBlurType,
      themeConfig.backgroundBlurIntensity,
      themeConfig.backgroundBlurEnabled
    );

    document.body.dataset.customBackground = "true";
    document.body.style.setProperty(
      "--komari-custom-background-image",
      `url("${cssString(themeConfig.backgroundImageUrl)}")`
    );
    document.body.style.setProperty("--komari-custom-background-filter", filter);
    document.body.style.setProperty("--komari-custom-background-bleed", bleed);
    document.body.style.setProperty(
      "--komari-custom-background-mask-opacity",
      cssAlpha(themeConfig.backgroundMaskOpacity / 100)
    );
    document.body.style.removeProperty("--komari-custom-background-inset");
    document.body.style.removeProperty("--komari-custom-background-scale");
  }, [
    themeConfig.backgroundBlurEnabled,
    themeConfig.backgroundBlurIntensity,
    themeConfig.backgroundBlurType,
    themeConfig.backgroundImageUrl,
    themeConfig.backgroundMaskOpacity,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!themeConfig.cardBlurEnabled) {
      delete document.body.dataset.cardBlur;
      delete document.body.dataset.cardBlurType;
      Object.values(CARD_BLUR_STYLE_PROPERTIES).forEach((property) => {
        document.body.style.removeProperty(property);
      });
      return;
    }

    const presentation = getCardBlurPresentation(
      themeConfig.cardBlurType,
      themeConfig.cardBlurIntensity,
      themeConfig.cardExtraBlurIntensity,
      themeConfig.cardBlurEnabled
    );

    document.body.dataset.cardBlur = "true";
    document.body.dataset.cardBlurType = themeConfig.cardBlurType;
    Object.entries(CARD_BLUR_STYLE_PROPERTIES).forEach(([key, property]) => {
      document.body.style.setProperty(
        property,
        presentation[key as keyof typeof presentation]
      );
    });
  }, [
    themeConfig.cardBlurEnabled,
    themeConfig.cardBlurIntensity,
    themeConfig.cardExtraBlurIntensity,
    themeConfig.cardBlurType,
  ]);

  const setColorTheme = useCallback(
    (theme: ColorTheme) => setLocalThemePatch({ colorTheme: theme }),
    [setLocalThemePatch]
  );
  const setCardLayout = useCallback(
    (layout: CardLayout) => setLocalThemePatch({ cardLayout: layout }),
    [setLocalThemePatch]
  );
  const setCardDesign = useCallback(
    (design: CardDesign) => setLocalThemePatch({ cardDesign: design }),
    [setLocalThemePatch]
  );
  const setStatusDesign = useCallback(
    (design: StatusDesign) => setLocalThemePatch({ statusDesign: design }),
    [setLocalThemePatch]
  );
  const setGraphDesign = useCallback(
    (design: GraphDesign) => setLocalThemePatch({ graphDesign: design }),
    [setLocalThemePatch]
  );
  const setShowRamDiskTotal = useCallback(
    (show: boolean) => setLocalThemePatch({ showRamDiskTotal: show }),
    [setLocalThemePatch]
  );
  const setBackgroundImageUrl = useCallback(
    (url: string) => setLocalThemePatch({ backgroundImageUrl: url }),
    [setLocalThemePatch]
  );
  const setBackgroundBlurEnabled = useCallback(
    (enabled: boolean) => setLocalThemePatch({ backgroundBlurEnabled: enabled }),
    [setLocalThemePatch]
  );
  const setBackgroundBlurType = useCallback(
    (type: BackgroundBlurType) => setLocalThemePatch({ backgroundBlurType: type }),
    [setLocalThemePatch]
  );
  const setBackgroundBlurIntensity = useCallback(
    (intensity: number) =>
      setLocalThemePatch({ backgroundBlurIntensity: clampBackgroundBlurIntensity(intensity) }),
    [setLocalThemePatch]
  );
  const setBackgroundMaskOpacity = useCallback(
    (opacity: number) =>
      setLocalThemePatch({ backgroundMaskOpacity: clampBackgroundBlurIntensity(opacity) }),
    [setLocalThemePatch]
  );
  const setCardBlurEnabled = useCallback(
    (enabled: boolean) => setLocalThemePatch({ cardBlurEnabled: enabled }),
    [setLocalThemePatch]
  );
  const setCardBlurType = useCallback(
    (type: CardBlurType) => setLocalThemePatch({ cardBlurType: type }),
    [setLocalThemePatch]
  );
  const setCardTransparentIntensity = useCallback(
    (intensity: number) =>
      setLocalThemePatch({ cardBlurIntensity: clampBackgroundBlurIntensity(intensity) }),
    [setLocalThemePatch]
  );
  const setCardBlurIntensity = setCardTransparentIntensity;
  const setCardExtraBlurIntensity = useCallback(
    (intensity: number) =>
      setLocalThemePatch({ cardExtraBlurIntensity: clampBackgroundBlurIntensity(intensity) }),
    [setLocalThemePatch]
  );
  const setStatusCardVisibility = useCallback(
    (key: keyof StatusCardsVisibility, checked: boolean) =>
      setLocalStatusCardsPatch({ [key]: checked }),
    [setLocalStatusCardsPatch]
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      themeConfig,
      managedThemeSettings,
      isThemeSettingsAdmin: adminState === "yes",
      isThemeLoaded,
      statusCardsVisibility,
      nodeViewMode,
      appearance,
      language,
      setColorTheme,
      setCardLayout,
      setCardDesign,
      setStatusDesign,
      setGraphDesign,
      setShowRamDiskTotal,
      setBackgroundImageUrl,
      setBackgroundBlurEnabled,
      setBackgroundBlurType,
      setBackgroundBlurIntensity,
      setBackgroundMaskOpacity,
      setCardBlurEnabled,
      setCardBlurType,
      setCardTransparentIntensity,
      setCardBlurIntensity,
      setCardExtraBlurIntensity,
      setStatusCardVisibility,
      setNodeViewMode: setNodeViewModeValue,
      setAppearance: setAppearanceValue,
      setLanguage: setLanguageValue,
    }),
    [
      appearance,
      adminState,
      isThemeLoaded,
      language,
      managedThemeSettings,
      nodeViewMode,
      setBackgroundBlurEnabled,
      setBackgroundBlurIntensity,
      setBackgroundBlurType,
      setBackgroundImageUrl,
      setBackgroundMaskOpacity,
      setAppearanceValue,
      setCardBlurEnabled,
      setCardBlurIntensity,
      setCardBlurType,
      setCardDesign,
      setCardExtraBlurIntensity,
      setCardLayout,
      setCardTransparentIntensity,
      setColorTheme,
      setGraphDesign,
      setShowRamDiskTotal,
      setLanguageValue,
      setNodeViewModeValue,
      setStatusCardVisibility,
      setStatusDesign,
      statusCardsVisibility,
      themeConfig,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
