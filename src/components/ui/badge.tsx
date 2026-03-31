import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const badgeColorTokens = {
  ruby: { solid: "#d64061", text: "#b12f4f", foreground: "#ffffff" },
  gray: { solid: "#6b7280", text: "#4b5563", foreground: "#ffffff" },
  gold: { solid: "#c28f0c", text: "#8a6700", foreground: "#1f1f1f" },
  bronze: { solid: "#a56c52", text: "#7c4f3b", foreground: "#ffffff" },
  brown: { solid: "#8b5e3c", text: "#6b4528", foreground: "#ffffff" },
  yellow: { solid: "#d4a600", text: "#8a6a00", foreground: "#1f1f1f" },
  amber: { solid: "#d97706", text: "#9a4b00", foreground: "#1f1f1f" },
  orange: { solid: "#f97316", text: "#c2410c", foreground: "#ffffff" },
  tomato: { solid: "#e14d2a", text: "#b9381b", foreground: "#ffffff" },
  red: { solid: "#dc2626", text: "#b91c1c", foreground: "#ffffff" },
  crimson: { solid: "#c81e5b", text: "#a10f47", foreground: "#ffffff" },
  pink: { solid: "#db2777", text: "#b61f63", foreground: "#ffffff" },
  plum: { solid: "#9333ea", text: "#7e22ce", foreground: "#ffffff" },
  purple: { solid: "#7c3aed", text: "#6d28d9", foreground: "#ffffff" },
  violet: { solid: "#8b5cf6", text: "#7c3aed", foreground: "#ffffff" },
  iris: { solid: "#5b5bd6", text: "#4a4ac2", foreground: "#ffffff" },
  indigo: { solid: "#4f46e5", text: "#4338ca", foreground: "#ffffff" },
  blue: { solid: "#2563eb", text: "#1d4ed8", foreground: "#ffffff" },
  cyan: { solid: "#0891b2", text: "#0e7490", foreground: "#ffffff" },
  teal: { solid: "#0f766e", text: "#115e59", foreground: "#ffffff" },
  jade: { solid: "#0f9f7a", text: "#0b7e61", foreground: "#ffffff" },
  green: { solid: "#16a34a", text: "#15803d", foreground: "#ffffff" },
  grass: { solid: "#65a30d", text: "#4d7c0f", foreground: "#ffffff" },
  lime: { solid: "#84cc16", text: "#4d7c0f", foreground: "#1f1f1f" },
  mint: { solid: "#10b981", text: "#0f8f65", foreground: "#ffffff" },
  sky: { solid: "#0ea5e9", text: "#0369a1", foreground: "#ffffff" },
} as const

export type BadgeColor = keyof typeof badgeColorTokens

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized

  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16)
  )

  return `rgba(${channels.join(", ")}, ${alpha})`
}

function getBadgeColorStyle(color: BadgeColor, variant?: BadgeVariant) {
  const palette = badgeColorTokens[color]
  if (!palette) return undefined

  const resolvedVariant = variant ?? "default"

  if (resolvedVariant === "outline") {
    return {
      color: palette.text,
      backgroundColor: hexToRgba(palette.solid, 0.12),
      borderColor: hexToRgba(palette.solid, 0.32),
    } satisfies React.CSSProperties
  }

  if (resolvedVariant === "secondary") {
    return {
      color: palette.text,
      backgroundColor: hexToRgba(palette.solid, 0.16),
      borderColor: "transparent",
    } satisfies React.CSSProperties
  }

  return {
    color: palette.foreground,
    backgroundColor: palette.solid,
    borderColor: palette.solid,
  } satisfies React.CSSProperties
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  color?: BadgeColor
}

function Badge({ className, color, style, variant, ...props }: BadgeProps) {
  const colorStyle = color ? getBadgeColorStyle(color, variant ?? "default") : undefined

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ ...colorStyle, ...style }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
