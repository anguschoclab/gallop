import { Fragment, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { formatProfitLoss } from "@/core/financial";
import {
  formatTransactionSubcategory,
  type TransactionSubcategory,
} from "@/core/transactions/transactionTypes";
import type { Transaction } from "@/core/transactions/transactionTypes";
import { cn } from "@/lib/cn";
import { ReceiptText, ArrowUpRight, ArrowDownLeft, ChevronRight, ChevronDown } from "lucide-react";

interface TransactionLedgerProps {
  transactions: Transaction[];
  day: number;
}

type LedgerRow =
  | { kind: "single"; key: string; tx: Transaction }
  | { kind: "group"; key: string; day: number; amount: number; children: Transaction[] };

/** Collapse same-day race entry fees into a single grouped row. */
function buildLedgerRows(items: Transaction[]): LedgerRow[] {
  const rows: LedgerRow[] = [];
  const groupIndex = new Map<number, number>();

  items.forEach((tx, idx) => {
    if (tx.subcategory !== "entry_fee") {
      rows.push({ kind: "single", key: tx.id || `t-${idx}`, tx });
      return;
    }
    const existing = groupIndex.get(tx.day);
    if (existing !== undefined) {
      const row = rows[existing] as Extract<LedgerRow, { kind: "group" }>;
      row.children.push(tx);
      row.amount += tx.amount;
      return;
    }
    groupIndex.set(tx.day, rows.length);
    rows.push({
      kind: "group",
      key: `entry-fees-d${tx.day}`,
      day: tx.day,
      amount: tx.amount,
      children: [tx],
    });
  });

  return rows.map((row) =>
    row.kind === "group" && row.children.length === 1
      ? { kind: "single", key: row.children[0].id || row.key, tx: row.children[0] }
      : row,
  );
}

const ALL_SUBCATEGORIES: TransactionSubcategory[] = [
  "prize_money", "claiming_sale", "auction_sale", "private_sale", "stud_fee", "other_income",
  "upkeep", "training", "veterinary", "farrier", "transport", "insurance",
  "entry_fee", "jockey_fee", "breeding_fee", "horse_purchase", "facility_maintenance", "other_expense",
  "player_deposit", "player_withdrawal",
  "correction", "refund", "penalty",
];

type DatePreset = "7d" | "30d" | "allTime" | "custom";

export function TransactionLedger({ transactions, day }: TransactionLedgerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedSubcategory, setSelectedSubcategory] = useState<TransactionSubcategory | "all">("all");
  const [dayRange, setDayRange] = useState<{ start: number; end: number }>({ start: 1, end: day });
  const [datePreset, setDatePreset] = useState<DatePreset>("allTime");

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (selectedSubcategory !== "all") {
      result = result.filter((t) => t.subcategory === selectedSubcategory);
    }
    result = result.filter((t) => t.day >= dayRange.start && t.day <= dayRange.end);
    return [...result].reverse().slice(0, 50);
  }, [transactions, selectedSubcategory, dayRange]);

  const rows = useMemo(() => buildLedgerRows(filteredTransactions), [filteredTransactions]);

  const handlePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "7d") {
      setDayRange({ start: Math.max(1, day - 6), end: day });
    } else if (preset === "30d") {
      setDayRange({ start: Math.max(1, day - 29), end: day });
    } else if (preset === "allTime") {
      setDayRange({ start: 1, end: day });
    }
  };

  const handleDayRangeChange = (field: "start" | "end", value: number) => {
    setDatePreset("custom");
    setDayRange((prev) => ({ ...prev, [field]: value }));
  };

  const netFlowByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of transactions) {
      map.set(t.day, (map.get(t.day) ?? 0) + t.amount);
    }
    return map;
  }, [transactions]);

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <ReceiptText className="h-3.5 w-3.5 text-gold-muted/60" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
          System Audit Ledger
        </h2>
      </div>
      <Card className="bg-slate-900/20 border-white/5 rounded-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-black/40 py-3 border-b border-white/10 flex flex-row items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-muted/60 px-4">
            Cash Movement Log
          </div>
          <div className="flex items-center gap-4 px-4">
            <span className="text-[10px] font-mono text-cream/20 uppercase">Sample 50</span>
            <Badge
              variant="outline"
              className="border-white/10 text-cream/40 font-mono text-[9px] h-5 rounded-none"
            >
              {filteredTransactions.length} RECS
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-black/20 border-b border-white/5">
            <Select
              value={selectedSubcategory}
              onValueChange={(v) => setSelectedSubcategory(v as TransactionSubcategory | "all")}
            >
              <SelectTrigger
                data-testid="subcategory-filter"
                className="h-7 w-[140px] text-[9px] font-mono uppercase tracking-widest border-white/10 bg-black/40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ALL_SUBCATEGORIES.map((sc) => (
                  <SelectItem key={sc} value={sc}>
                    {formatTransactionSubcategory(sc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              {(["7d", "30d", "allTime"] as const).map((p) => (
                <button
                  key={p}
                  data-testid={`date-preset-${p}`}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "px-2 h-7 text-[9px] font-black uppercase tracking-widest border transition-colors",
                    datePreset === p
                      ? "bg-gold text-slate-950 border-gold"
                      : "bg-black/40 text-cream/40 border-white/10 hover:border-gold/30",
                  )}
                >
                  {p === "7d" ? "Last 7d" : p === "30d" ? "Last 30d" : "All Time"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-cream/40">
              <span>Day:</span>
              <input
                type="number"
                data-testid="day-range-start"
                value={dayRange.start}
                onChange={(e) => handleDayRangeChange("start", Number(e.target.value))}
                className="w-12 h-7 px-1 text-center font-mono text-[10px] bg-black/40 border border-white/10 text-cream/60 focus:outline-none focus:border-gold/30"
              />
              <span className="text-cream/20">→</span>
              <input
                type="number"
                data-testid="day-range-end"
                value={dayRange.end}
                onChange={(e) => handleDayRangeChange("end", Number(e.target.value))}
                className="w-12 h-7 px-1 text-center font-mono text-[10px] bg-black/40 border border-white/10 text-cream/60 focus:outline-none focus:border-gold/30"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/20 border-b border-white/5">
                <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/30">
                  <th className="px-8 py-3 font-black w-1">Day</th>
                  <th className="px-4 py-3 font-black w-1">Date</th>
                  <th className="px-4 py-3 font-black">Sector</th>
                  <th className="px-4 py-3 font-black text-right">Amount</th>
                  <th className="px-8 py-3 font-black">Transaction Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => {
                  if (row.kind === "single") {
                    const t = row.tx;
                    return (
                      <tr
                        key={row.key}
                        className="group hover:bg-white/[0.02] transition-colors relative"
                      >
                        <td className="px-8 py-3 font-mono text-[10px] text-cream/20 group-hover:text-gold/40 transition-colors tabular-nums">
                          D{String(t.day).padStart(3, "0")}
                        </td>
                        <td className="px-4 py-3">
                          {t.type === "income" ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-success/60" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-destructive/60" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-black uppercase text-cream/40 tracking-widest px-1.5 py-0.5 border border-white/5 bg-black/40 rounded-sm">
                            {formatTransactionSubcategory(t.subcategory).toUpperCase()}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 font-black font-mono text-xs text-right tabular-nums tracking-tighter",
                            t.type === "income" ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatProfitLoss(t.amount)}
                        </td>
                        <td className="px-8 py-3 text-[11px] font-mono text-cream/40 group-hover:text-cream/60 transition-colors uppercase italic truncate max-w-xs">
                          {t.description}
                        </td>
                      </tr>
                    );
                  }

                  const isOpen = !!expanded[row.key];
                  return (
                    <Fragment key={row.key}>
                      <tr
                        className="group hover:bg-white/[0.02] transition-colors relative cursor-pointer"
                        onClick={() => setExpanded((prev) => ({ ...prev, [row.key]: !isOpen }))}
                      >
                        <td className="px-8 py-3 font-mono text-[10px] text-cream/20 group-hover:text-gold/40 transition-colors tabular-nums">
                          D{String(row.day).padStart(3, "0")}
                        </td>
                        <td className="px-4 py-3">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-destructive/60" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-black uppercase text-cream/40 tracking-widest px-1.5 py-0.5 border border-white/5 bg-black/40 rounded-sm">
                            ENTRY FEES
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black font-mono text-xs text-right tabular-nums tracking-tighter text-destructive">
                          {formatProfitLoss(row.amount)}
                        </td>
                        <td className="px-8 py-3 text-[11px] font-mono text-cream/40 group-hover:text-cream/60 transition-colors uppercase italic">
                          <span className="inline-flex items-center gap-1.5">
                            {isOpen ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            {row.children.length} race entries
                            {(() => {
                              const net = netFlowByDay.get(row.day) ?? 0;
                              return (
                                <span
                                  className={cn(
                                    "ml-2 font-mono text-[10px] tabular-nums",
                                    net >= 0 ? "text-success" : "text-destructive",
                                  )}
                                >
                                  Net: {formatProfitLoss(net)}
                                </span>
                              );
                            })()}
                          </span>
                        </td>
                      </tr>
                      {isOpen &&
                        row.children.map((t, i) => (
                          <tr key={t.id || `${row.key}-${i}`} className="bg-black/20">
                            <td className="px-8 py-2" />
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-[9px] font-mono uppercase text-cream/20">
                              {formatTransactionSubcategory(t.subcategory).toUpperCase()}
                            </td>
                            <td className="px-4 py-2 font-mono text-[11px] text-right tabular-nums text-destructive/80">
                              {formatProfitLoss(t.amount)}
                            </td>
                            <td className="px-8 py-2 text-[10px] font-mono text-cream/30 uppercase italic truncate max-w-xs">
                              {t.raceId ? (
                                <Link
                                  to="/race/$raceId"
                                  params={{ raceId: t.raceId }}
                                  className="text-cream/30 hover:text-gold hover:underline"
                                >
                                  {t.description}
                                </Link>
                              ) : (
                                t.description
                              )}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center border-dashed border-white/5 opacity-40">
              <p className="font-mono text-xs uppercase tracking-widest">
                No Fiscal Events Recorded
              </p>
            </div>
          )}
          <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-cream/20 uppercase tracking-widest">
            <span>Audit Trail</span>
            <span>End of Ledger</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
