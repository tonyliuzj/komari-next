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
import { updateSettings } from "@/lib/api";

export type ColorTheme = "default" | "ocean" | "sunset" | "forest" | "midnight" | "rose";
export type CardLayout = "classic" | "modern" | "minimal" | "detailed";
export type CardDesign = "default" | "quality-bars";
export type StatusDesign = "default" | "speed";
export type GraphDesign = "circle" | "progress" | "bar" | "minimal";
export type NodeViewMode = "grid" | "table";

export interface ThemeConfig {
  colorTheme: ColorTheme;
  cardLayout: CardLayout;
  cardDesign: CardDesign;
  statusDesign: StatusDesign;
  graphDesign: GraphDesign;
  backgroundImageUrl?: string;
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
}

interface ThemeContextType {
  themeConfig: ThemeConfig;
  managedThemeSettings: ManagedThemeSettings;
  isThemeSettingsAdmin: boolean;
  statusCardsVisibility: StatusCardsVisibility;
  nodeViewMode: NodeViewMode;
  setColorTheme: (theme: ColorTheme) => void;
  setCardLayout: (layout: CardLayout) => void;
  setCardDesign: (design: CardDesign) => void;
  setStatusDesign: (design: StatusDesign) => void;
  setGraphDesign: (design: GraphDesign) => void;
  setBackgroundImageUrl: (url: string) => void;
  setStatusCardVisibility: (key: keyof StatusCardsVisibility, checked: boolean) => void;
  setNodeViewMode: (value: NodeViewMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LEGACY_THEME_STORAGE_KEY = "komari-theme-config";
const THEME_OVERRIDES_STORAGE_KEY = "komari-theme-config-overrides";
const STATUS_CARDS_STORAGE_KEY = "statusCardsVisibility";
const STATUS_CARDS_CHANGE_EVENT = "statusCardsVisibilityChange";
const NODE_VIEW_STORAGE_KEY = "nodeViewMode";
const NODE_VIEW_CHANGE_EVENT = "nodeViewModeChange";
const LOCAL_OVERRIDE_BASE_SIGNATURE_KEY = "komari-theme-local-override-base";

const COLOR_THEMES: ColorTheme[] = ["default", "ocean", "sunset", "forest", "midnight", "rose"];
const CARD_LAYOUTS: CardLayout[] = ["classic", "modern", "minimal", "detailed"];
const CARD_DESIGNS: CardDesign[] = ["default", "quality-bars"];
const STATUS_DESIGNS: StatusDesign[] = ["default", "speed"];
const GRAPH_DESIGNS: GraphDesign[] = ["circle", "progress", "bar", "minimal"];
const NODE_VIEW_MODES: NodeViewMode[] = ["grid", "table"];

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  colorTheme: "default",
  cardLayout: "classic",
  cardDesign: "default",
  statusDesign: "default",
  graphDesign: "circle",
  backgroundImageUrl: "",
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

function pickString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
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
  const backgroundImageUrl = pickString(input.backgroundImageUrl);

  if (colorTheme) result.colorTheme = colorTheme;
  if (cardLayout) result.cardLayout = cardLayout;
  if (cardDesign) result.cardDesign = cardDesign;
  if (statusDesign) result.statusDesign = statusDesign;
  if (graphDesign) result.graphDesign = graphDesign;
  if (backgroundImageUrl !== undefined) result.backgroundImageUrl = backgroundImageUrl;

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

function hasLocalOverrides() {
  return (
    Object.keys(normalizeThemeConfigOverrides(readJsonStorage(THEME_OVERRIDES_STORAGE_KEY))).length > 0 ||
    Object.keys(extractLegacyThemeOverrides(readJsonStorage(LEGACY_THEME_STORAGE_KEY))).length > 0 ||
    Object.keys(normalizeStatusCardsVisibilityOverrides(readJsonStorage(STATUS_CARDS_STORAGE_KEY))).length > 0 ||
    readInitialNodeViewOverride() !== undefined
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

  (["colorTheme", "cardLayout", "cardDesign", "statusDesign", "graphDesign", "backgroundImageUrl"] as const).forEach((key) => {
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
  const [localThemeOverrides, setLocalThemeOverrides] = useState<Partial<ThemeConfig>>(readInitialThemeOverrides);
  const [localStatusCardsOverrides, setLocalStatusCardsOverrides] =
    useState<Partial<StatusCardsVisibility>>(readInitialStatusCardsOverrides);
  const [localNodeViewOverride, setLocalNodeViewOverride] =
    useState<NodeViewMode | undefined>(readInitialNodeViewOverride);
  const [managedThemeSettings, setManagedThemeSettings] = useState<ManagedThemeSettings>({});
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

  const clearLocalOverrides = useCallback(() => {
    setLocalThemeOverrides({});
    setLocalStatusCardsOverrides({});
    setLocalNodeViewOverride(undefined);

    writeThemeOverrides({});
    writeJsonStorage(STATUS_CARDS_STORAGE_KEY, {});
    writeJsonStorage(NODE_VIEW_STORAGE_KEY, undefined);
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

  useEffect(() => {
    let mounted = true;

    fetch("/api/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((resp) => {
        if (!mounted) return;
        const rawSettings = parseThemeSettings(resp?.data?.theme_settings);
        applyManagedSettings(rawSettings);
      })
      .catch(() => {
        if (!mounted) return;
        applyManagedSettings({});
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
  }, [adminState, persistManagedSettings]);

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

    if (themeConfig.backgroundImageUrl) {
      document.body.style.backgroundImage = `url(${themeConfig.backgroundImageUrl})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
    } else {
      document.body.style.backgroundImage = "";
    }
  }, [themeConfig.backgroundImageUrl]);

  const setColorTheme = (theme: ColorTheme) => setLocalThemePatch({ colorTheme: theme });
  const setCardLayout = (layout: CardLayout) => setLocalThemePatch({ cardLayout: layout });
  const setCardDesign = (design: CardDesign) => setLocalThemePatch({ cardDesign: design });
  const setStatusDesign = (design: StatusDesign) => setLocalThemePatch({ statusDesign: design });
  const setGraphDesign = (design: GraphDesign) => setLocalThemePatch({ graphDesign: design });
  const setBackgroundImageUrl = (url: string) => setLocalThemePatch({ backgroundImageUrl: url });
  const setStatusCardVisibility = (key: keyof StatusCardsVisibility, checked: boolean) =>
    setLocalStatusCardsPatch({ [key]: checked });

  const value = useMemo<ThemeContextType>(
    () => ({
      themeConfig,
      managedThemeSettings,
      isThemeSettingsAdmin: adminState === "yes",
      statusCardsVisibility,
      nodeViewMode,
      setColorTheme,
      setCardLayout,
      setCardDesign,
      setStatusDesign,
      setGraphDesign,
      setBackgroundImageUrl,
      setStatusCardVisibility,
      setNodeViewMode: setNodeViewModeValue,
    }),
    [
      adminState,
      managedThemeSettings,
      nodeViewMode,
      setNodeViewModeValue,
      statusCardsVisibility,
      themeConfig,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
