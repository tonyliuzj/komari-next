"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeList } from "@/contexts/NodeListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMounted } from "@/hooks/useMounted";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type LoadedRates, convertAmount, loadRates } from "@/lib/exchangeRates";
import { OPEN_REMAINING_VALUE_CALCULATOR_EVENT } from "@/lib/remainingValueEvents";
import {
  buildRemainingValueSnapshot,
  type RemainingValueNode,
  type SkipReason,
  type SkippedRemainingValueNode,
} from "@/lib/remainingValue";

const DISPLAY_CURRENCIES = ["USD", "CNY", "EUR", "GBP"] as const;

type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
type DetailFilter = "all" | "active" | "skipped" | "expired";
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatConvertedAmount(t: TranslateFn, code: string, value: number | null) {
  if (value === null) {
    return t("remainingValue.placeholderPending", { defaultValue: "Pending conversion" });
  }

  return `${code} ${value.toFixed(2)}`;
}

function formatOriginalAmount(code: string, value: number) {
  return `${code} ${value.toFixed(2)}`;
}

function formatBillingCycle(t: TranslateFn, billingCycle: number) {
  if (billingCycle === -1) {
    return t("remainingValue.billingCycle.once", { defaultValue: "One-time" });
  }

  return t("remainingValue.billingCycle.days", {
    count: billingCycle,
    defaultValue: "{{count}} days",
  });
}

function formatRemainingTime(t: TranslateFn, remainingMs: number | null, isLongTerm: boolean) {
  if (isLongTerm) {
    return t("remainingValue.remainingTime.longTerm", { defaultValue: "Long term" });
  }
  if (remainingMs === null) {
    return t("remainingValue.remainingTime.oneTime", { defaultValue: "One-time" });
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return t("remainingValue.remainingTime.value", {
    days,
    hours,
    defaultValue: "{{days}} days {{hours}} hours",
  });
}

function getSkipReasonLabel(t: TranslateFn, skipReason: SkipReason) {
  switch (skipReason) {
    case "missing_price":
      return t("remainingValue.skipReason.missing_price", { defaultValue: "Price not set" });
    case "missing_currency":
      return t("remainingValue.skipReason.missing_currency", { defaultValue: "Currency not set" });
    case "unsupported_currency":
      return t("remainingValue.skipReason.unsupported_currency", {
        defaultValue: "Currency not supported yet",
      });
    case "missing_expired_at":
      return t("remainingValue.skipReason.missing_expired_at", {
        defaultValue: "Expiration time not set",
      });
    case "invalid_expired_at":
      return t("remainingValue.skipReason.invalid_expired_at", {
        defaultValue: "Expiration time format is invalid",
      });
    case "unsupported_billing_cycle":
      return t("remainingValue.skipReason.unsupported_billing_cycle", {
        defaultValue: "Billing cycle not set",
      });
    default:
      return t("remainingValue.skipReason.default", { defaultValue: "Incomplete information" });
  }
}

function ActiveNodeCard({
  item,
  displayCurrency,
  t,
}: {
  item: RemainingValueNode & { convertedRemainingValue: number | null };
  displayCurrency: DisplayCurrency;
  t: TranslateFn;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-muted/35 p-4 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm font-semibold">
          {formatConvertedAmount(t, displayCurrency, item.convertedRemainingValue)}
        </div>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.originalPrice", {
          amount: `${item.currencySymbol}${item.price}`,
          cycle: formatBillingCycle(t, item.billingCycle),
          defaultValue: "Original price {{amount}} / {{cycle}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.remainingTime", {
          value: formatRemainingTime(t, item.remainingMs, item.isLongTerm),
          defaultValue: "Remaining time {{value}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.originalValue", {
          amount: formatOriginalAmount(item.currencyCode, item.remainingValueOriginal),
          defaultValue: "Original currency value {{amount}}",
        })}
      </div>
    </article>
  );
}

function SkippedNodeCard({ item, t }: { item: SkippedRemainingValueNode; t: TranslateFn }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 shadow-sm shadow-black/5">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.skipReason", { defaultValue: "Skipped because" })}
      </div>
      <div className="mt-1 text-sm text-foreground/80">{getSkipReasonLabel(t, item.skipReason)}</div>
    </article>
  );
}

function ExpiredNodeCard({ item, t }: { item: RemainingValueNode; t: TranslateFn }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 shadow-sm shadow-black/5">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.originalPrice", {
          amount: `${item.currencySymbol}${item.price}`,
          cycle: formatBillingCycle(t, item.billingCycle),
          defaultValue: "Original price {{amount}} / {{cycle}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.expiredValue", { defaultValue: "Remaining value 0" })}
      </div>
    </article>
  );
}

function SummaryMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-muted/55 p-4 shadow-inner shadow-black/5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </article>
  );
}

export default function RemainingValueCalculator() {
  const { t, ready, i18n } = useTranslation();
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] =
    useLocalStorage<DisplayCurrency>("remainingValueDisplayCurrency", "USD");
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const [ratesState, setRatesState] = useState<LoadedRates | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const locale = i18n.resolvedLanguage || i18n.language || "zh-CN";
  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodeList ?? []), [nodeList]);
  const titleText = t("remainingValue.title", { defaultValue: "Remaining Value Calculator" });
  const descriptionText = t("remainingValue.description", {
    defaultValue: "Check node remaining value and exchange-rate conversions.",
  });

  const convertedActive = useMemo(() => {
    return snapshot.active
      .map((item) => {
        const convertedRemainingValue = ratesState
          ? convertAmount(
              item.remainingValueOriginal,
              item.currencyCode,
              displayCurrency,
              ratesState.rates,
            )
          : null;
        const convertedTotalValue = ratesState
          ? convertAmount(
              item.totalValueOriginal,
              item.currencyCode,
              displayCurrency,
              ratesState.rates,
            )
          : null;
        const convertedMonthlyCost = ratesState
          ? convertAmount(
              item.monthlyCostOriginal,
              item.currencyCode,
              displayCurrency,
              ratesState.rates,
            )
          : null;

        return {
          ...item,
          convertedRemainingValue,
          convertedTotalValue,
          convertedMonthlyCost,
        };
      })
      .sort((left, right) => (right.convertedRemainingValue ?? -1) - (left.convertedRemainingValue ?? -1));
  }, [displayCurrency, ratesState, snapshot.active]);

  const convertedTotals = useMemo(() => {
    if (!ratesState) {
      return {
        remainingValue: null,
        totalValue: null,
        monthlyCost: null,
      };
    }

    return convertedActive.reduce(
      (sum, item) => ({
        remainingValue: sum.remainingValue + (item.convertedRemainingValue ?? 0),
        totalValue: sum.totalValue + (item.convertedTotalValue ?? 0),
        monthlyCost: sum.monthlyCost + (item.convertedMonthlyCost ?? 0),
      }),
      {
        remainingValue: 0,
        totalValue: 0,
        monthlyCost: 0,
      },
    );
  }, [convertedActive, ratesState]);

  const refreshRates = async (forceRefresh = false) => {
    const sourceCurrencies = Array.from(new Set(snapshot.active.map((item) => item.currencyCode)));
    if (sourceCurrencies.length === 0) {
      return;
    }

    setIsRefreshing(true);
    setRatesError(null);

    try {
      const loaded = await loadRates({
        displayCurrency,
        sourceCurrencies,
        forceRefresh,
      });

      setRatesState(loaded);
    } catch {
      setRatesError(
        t("remainingValue.errorRatesUnavailable", { defaultValue: "Unable to fetch exchange rates right now" }),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openPanel = async () => {
    setOpen(true);

    if (
      snapshot.active.length > 0 &&
      (!ratesState || typeof ratesState.rates[displayCurrency] !== "number")
    ) {
      await refreshRates(false);
    }
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      setOpen(false);
      return;
    }

    await openPanel();
  };

  useEffect(() => {
    const handleExternalOpen = () => {
      void openPanel();
    };

    window.addEventListener(OPEN_REMAINING_VALUE_CALCULATOR_EVENT, handleExternalOpen);
    return () => {
      window.removeEventListener(OPEN_REMAINING_VALUE_CALCULATOR_EVENT, handleExternalOpen);
    };
  }, [displayCurrency, ratesState, snapshot.active.length]);

  useEffect(() => {
    if (
      open &&
      snapshot.active.length > 0 &&
      ratesState &&
      typeof ratesState.rates[displayCurrency] !== "number"
    ) {
      void refreshRates(false);
    }
  }, [displayCurrency, open, ratesState, snapshot.active.length]);

  const filterCounts = {
    all: snapshot.active.length + snapshot.skipped.length + snapshot.expired.length,
    active: snapshot.active.length,
    skipped: snapshot.skipped.length,
    expired: snapshot.expired.length,
  };

  const filterOptions: Array<{ value: DetailFilter; label: string }> = [
    {
      value: "all",
      label: t("remainingValue.filter.all", {
        count: filterCounts.all,
        defaultValue: "All {{count}}",
      }),
    },
    {
      value: "active",
      label: t("remainingValue.filter.active", {
        count: filterCounts.active,
        defaultValue: "Included {{count}}",
      }),
    },
    {
      value: "skipped",
      label: t("remainingValue.filter.skipped", {
        count: filterCounts.skipped,
        defaultValue: "Skipped {{count}}",
      }),
    },
    {
      value: "expired",
      label: t("remainingValue.filter.expired", {
        count: filterCounts.expired,
        defaultValue: "Expired {{count}}",
      }),
    },
  ];

  const renderAllSections = () => {
    const sections = [];

    if (convertedActive.length > 0) {
      sections.push(
        <section key="active" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.active", { defaultValue: "Included Nodes" })}
          </div>
          {convertedActive.map((item) => (
            <ActiveNodeCard
              key={item.uuid}
              item={item}
              displayCurrency={displayCurrency}
              t={t}
            />
          ))}
        </section>,
      );
    }

    if (snapshot.skipped.length > 0) {
      sections.push(
        <section key="skipped" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.skipped", { defaultValue: "Skipped Nodes" })}
          </div>
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>,
      );
    }

    if (snapshot.expired.length > 0) {
      sections.push(
        <section key="expired" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.expired", { defaultValue: "Expired Nodes" })}
          </div>
          {snapshot.expired.map((item) => (
            <ExpiredNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>,
      );
    }

    if (sections.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {t("remainingValue.empty.none", { defaultValue: "There are no nodes to display right now" })}
        </section>
      );
    }

    return sections;
  };

  const renderFilteredSection = () => {
    if (detailFilter === "all") {
      return renderAllSections();
    }

    if (detailFilter === "active") {
      if (convertedActive.length === 0) {
        return (
          <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            {t("remainingValue.empty.active", { defaultValue: "There are no included nodes right now" })}
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {convertedActive.map((item) => (
            <ActiveNodeCard key={item.uuid} item={item} displayCurrency={displayCurrency} t={t} />
          ))}
        </section>
      );
    }

    if (detailFilter === "skipped") {
      if (snapshot.skipped.length === 0) {
        return (
          <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            {t("remainingValue.empty.skipped", { defaultValue: "There are no skipped nodes right now" })}
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>
      );
    }

    if (snapshot.expired.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {t("remainingValue.empty.expired", { defaultValue: "There are no expired nodes right now" })}
        </section>
      );
    }

    return (
      <section className="space-y-2">
        {snapshot.expired.map((item) => (
          <ExpiredNodeCard key={item.uuid} item={item} t={t} />
        ))}
      </section>
    );
  };

  const rateStatusText = ratesState?.isStale
    ? t("remainingValue.rateStatus.stale", { defaultValue: "Exchange rates are not the latest" })
    : ratesState?.fetchedAt
      ? t("remainingValue.rateStatus.updatedAt", {
          value: new Date(ratesState.fetchedAt).toLocaleString(locale),
          defaultValue: "Exchange rates updated at {{value}}",
        })
      : t("remainingValue.rateStatus.loading", { defaultValue: "Waiting for exchange rates" });

  const panelBody = (
    <div
      data-testid="remaining-value-panel"
      className="flex max-h-[min(85vh,48rem)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 ring-1 ring-white/10 shadow-[0_20px_44px_rgba(15,23,42,0.18)] dark:ring-white/12 dark:shadow-[0_20px_44px_rgba(0,0,0,0.42)]"
    >
      <div className="space-y-4 border-b border-border/70 px-5 py-4">
        <div className="text-base font-semibold">{titleText}</div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{rateStatusText}</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void refreshRates(true)}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{t("remainingValue.refreshRates", { defaultValue: "Refresh Rates" })}</span>
          </Button>
        </div>

        {ratesError && <div className="text-xs text-orange-600">{ratesError}</div>}

        <div
          data-testid="remaining-value-rate-provider"
          className="text-xs leading-5 text-muted-foreground"
        >
          {t("remainingValue.rateProvider", {
            defaultValue: "Online exchange rates are powered by Frankfurter and are only requested after you open the calculator.",
          })}
        </div>

        <Tabs
          value={displayCurrency}
          onValueChange={(value) => setDisplayCurrency(value as DisplayCurrency)}
          className="max-w-full"
        >
          <TabsList className="h-10 w-fit max-w-full justify-start rounded-xl border bg-muted/45 p-1">
            {DISPLAY_CURRENCIES.map((currency) => (
              <TabsTrigger key={currency} value={currency} className="min-w-16 rounded-lg px-4">
                {currency}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <section className="grid gap-3 md:grid-cols-3">
          <SummaryMetricCard
            label={t("remainingValue.total", { defaultValue: "Total Remaining Value" })}
            value={formatConvertedAmount(t, displayCurrency, convertedTotals.remainingValue)}
          />
          <SummaryMetricCard
            label={t("remainingValue.totalValue", { defaultValue: "Total Value" })}
            value={formatConvertedAmount(t, displayCurrency, convertedTotals.totalValue)}
          />
          <SummaryMetricCard
            label={t("remainingValue.monthlyCost", { defaultValue: "Monthly Cost" })}
            value={formatConvertedAmount(t, displayCurrency, convertedTotals.monthlyCost)}
          />
        </section>

        <Tabs
          value={detailFilter}
          onValueChange={(value) => setDetailFilter(value as DetailFilter)}
          className="max-w-full"
        >
          <TabsList className="h-auto w-fit max-w-full flex-wrap justify-start gap-2 rounded-2xl border bg-muted/40 p-2">
            {filterOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="rounded-xl px-4 py-2">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {renderFilteredSection()}
      </div>
    </div>
  );

  if (!mounted || !ready) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">{titleText}</DrawerTitle>
            <DrawerDescription className="sr-only">{descriptionText}</DrawerDescription>
            {panelBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-none p-0 shadow-2xl">
            <DialogTitle className="sr-only">{titleText}</DialogTitle>
            <DialogDescription className="sr-only">{descriptionText}</DialogDescription>
            {panelBody}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
