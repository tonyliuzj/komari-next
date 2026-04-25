import { Badge, type BadgeColor } from "@/components/ui/badge";
import { Flex } from "@/components/ui/flex";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const tagColors: BadgeColor[] = [
  "ruby",
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
];

function isBadgeColor(color: string): color is BadgeColor {
  return tagColors.includes(color as BadgeColor);
}

const PriceTags = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
  tags = "",
  ip4 = "",
  ip6 = "",
  compact = false,
  maxCustomTags = compact ? 3 : undefined,
  className,
  gap = "1",
  wrap = "wrap",
  ...props
}: {
  expired_at?: string | number;
  price?: number;
  billing_cycle?: number;
  currency?: string;
  tags?: string;
  ip4?: any;
  ip6?: any;
  compact?: boolean;
  maxCustomTags?: number;
} & React.ComponentProps<typeof Flex>) => {
  const [t] = useTranslation();
  const badgeClassName = cn(
    "text-sm",
    compact &&
      "h-5 min-w-0 max-w-[5.5rem] shrink-0 px-1.5 py-0 text-[10px] leading-none"
  );
  const labelClassName = cn(
    "text-xs",
    compact && "block min-w-0 truncate text-[10px] leading-none"
  );
  const containerClassName = cn(
    compact && "min-w-0 max-w-full content-center gap-y-1",
    className
  );

  if (price == 0) {
    return (
      <Flex {...props} gap={gap} wrap={wrap} className={containerClassName}>
        <CustomTags tags={tags} compact={compact} maxVisible={maxCustomTags} />
      </Flex>
    );
  }

  return (
    <Flex {...props} gap={gap} wrap={wrap} className={containerClassName}>
      {ip4 && (
        <Badge variant="outline" className={badgeClassName}>
          <label
            className={cn(
              "flex justify-center items-center gap-1 text-xs",
              compact && "text-[10px] leading-none"
            )}
          >
            <div className="border-2 rounded-4xl border-green-500"></div>
            V4
          </label>
        </Badge>
      )}

      {ip6 && (
        <Badge variant="outline" className={badgeClassName}>
          <label
            className={cn(
              "flex justify-center items-center gap-1 text-xs",
              compact && "text-[10px] leading-none"
            )}
          >
            <div className="border-2 rounded-4xl border-green-500"></div>
            V6
          </label>
        </Badge>
      )}

      <Badge color="iris" variant="outline" className={badgeClassName}>
        <label className={labelClassName}>
          {price == -1 ? t("common.free") : `${currency}${price}`}/
          {(() => {
            if (billing_cycle >= 27 && billing_cycle <= 32) {
              return t("common.monthly");
            } else if (billing_cycle >= 87 && billing_cycle <= 95) {
              return t("common.quarterly");
            } else if (billing_cycle >= 175 && billing_cycle <= 185) {
              return t("common.semi_annual");
            } else if (billing_cycle >= 360 && billing_cycle <= 370) {
              return t("common.annual");
            } else if (billing_cycle >= 720 && billing_cycle <= 750) {
              return t("common.biennial");
            } else if (billing_cycle >= 1080 && billing_cycle <= 1150) {
              return t("common.triennial");
            } else if (billing_cycle >= 1800 && billing_cycle <= 1850) {
              return t("common.quinquennial");
            } else if (billing_cycle == -1) {
              return t("common.once");
            } else {
              return `${billing_cycle} ${t("nodeCard.time_day")}`;
            }
          })()}
        </label>
      </Badge>
      <Badge
        color={(() => {
          const expiredDate = new Date(expired_at);
          const now = new Date();
          const diffTime = expiredDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 0 || diffDays <= 7) {
            return "red";
          } else if (diffDays <= 15) {
            return "orange";
          } else {
            return "green";
          }
        })()}
        variant="outline"
        className={badgeClassName}
      >
        <label className={labelClassName}>
          {(() => {
            const expiredDate = new Date(expired_at);
            const now = new Date();
            const diffTime = expiredDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
              return t("common.expired");
            } else if (diffDays > 36500) {
              // 100 years approximately
              return t("common.long_term");
            } else {
              return t("common.expired_in", {
                days: diffDays,
              });
            }
          })()}
        </label>
      </Badge>
      <CustomTags tags={tags} compact={compact} maxVisible={maxCustomTags} />
    </Flex>
  );
};

const CustomTags = ({
  tags,
  compact = false,
  maxVisible,
}: {
  tags?: string;
  compact?: boolean;
  maxVisible?: number;
}) => {
  if (!tags || tags.trim() === "") {
    return <></>;
  }
  const tagList = tags.split(";").map((tag) => tag.trim()).filter(Boolean);

  // 解析带颜色的标签
  const parseTagWithColor = (tag: string) => {
    const colorMatch = tag.match(/<(\w+)>$/);
    if (colorMatch) {
      const color = colorMatch[1].toLowerCase();
      const text = tag.replace(/<\w+>$/, "").trim();
      // 检查颜色是否在支持的颜色列表中
      if (isBadgeColor(color)) {
        return { text, color };
      }
    }
    return { text: tag, color: null };
  };
  const parsedTags = tagList.map(parseTagWithColor);
  const visibleTags =
    compact && maxVisible ? parsedTags.slice(0, maxVisible) : parsedTags;
  const hiddenCount = parsedTags.length - visibleTags.length;
  const hiddenTitle =
    hiddenCount > 0
      ? parsedTags
          .slice(visibleTags.length)
          .map(({ text }) => text)
          .join(", ")
      : undefined;

  return (
    <>
      {visibleTags.map(({ text, color }, index) => {
        const badgeColor = color || tagColors[index % tagColors.length];

        return (
          <Badge
            key={index}
            color={badgeColor}
            variant="outline"
            className={cn(
              "text-sm",
              compact &&
                "h-5 min-w-0 max-w-[4.75rem] shrink px-1.5 py-0 text-[10px] leading-none"
            )}
            title={text}
          >
            <label
              className={cn(
                "text-xs",
                compact && "block min-w-0 truncate text-[10px] leading-none"
              )}
            >
              {text}
            </label>
          </Badge>
        );
      })}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className="h-5 shrink-0 border-muted-foreground/25 bg-muted/50 px-1.5 py-0 text-[10px] leading-none text-muted-foreground"
          title={hiddenTitle}
        >
          <label className="text-[10px] leading-none">+{hiddenCount}</label>
        </Badge>
      )}
    </>
  );
};

export default PriceTags;
