import {
  DEFAULT_NODE_VIEW_MODE,
  type NodeViewMode,
  useTheme,
} from "@/contexts/ThemeContext";

export { DEFAULT_NODE_VIEW_MODE };
export type { NodeViewMode };

export function useNodeViewMode() {
  const { nodeViewMode, setNodeViewMode } = useTheme();

  return [nodeViewMode, setNodeViewMode] as const;
}
