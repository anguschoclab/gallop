import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RotateCcw, Check } from "lucide-react";
import {
  getCashPressureTuningFileConfig,
  getCashPressureTuning,
  setCashPressureTuningOverrides,
  resetCashPressureTuningOverrides,
  type CashPressureTuning,
  type CashPressureTuningOverrides,
} from "@/core/stable/cashPressureTuning";

const NUMERIC_FIELDS: { key: keyof Omit<CashPressureTuning, "labelThresholds" | "enableDecisionTrace">; label: string; step: string }[] = [
  { key: "comfortDays", label: "comfortDays", step: "1" },
  { key: "crisisDays", label: "crisisDays", step: "1" },
  { key: "maxThresholdDiscount", label: "maxThresholdDiscount", step: "0.05" },
  { key: "pressureCurveExponent", label: "pressureCurveExponent", step: "0.1" },
  { key: "softeningCurveExponent", label: "softeningCurveExponent", step: "0.1" },
];

const LABEL_FIELDS: { key: keyof CashPressureTuning["labelThresholds"]; label: string }[] = [
  { key: "desperate", label: "desperate" },
  { key: "strained", label: "strained" },
  { key: "tight", label: "tight" },
];

function num(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function CashPressureTuningEditor() {
  const fileConfig = useMemo(() => getCashPressureTuningFileConfig(), []);

  const [values, setValues] = useState<CashPressureTuning>({ ...fileConfig });
  const [applied, setApplied] = useState(false);

  function updateNumeric(key: keyof Omit<CashPressureTuning, "labelThresholds" | "enableDecisionTrace">, value: number) {
    setValues((v) => ({ ...v, [key]: value }));
    setApplied(false);
  }

  function updateLabel(key: keyof CashPressureTuning["labelThresholds"], value: number) {
    setValues((v) => ({ ...v, labelThresholds: { ...v.labelThresholds, [key]: value } }));
    setApplied(false);
  }

  function handleApply() {
    const overrides: CashPressureTuningOverrides = {
      comfortDays: values.comfortDays,
      crisisDays: values.crisisDays,
      maxThresholdDiscount: values.maxThresholdDiscount,
      pressureCurveExponent: values.pressureCurveExponent,
      softeningCurveExponent: values.softeningCurveExponent,
      labelThresholds: values.labelThresholds,
      enableDecisionTrace: values.enableDecisionTrace,
    };
    setCashPressureTuningOverrides(overrides);
    setApplied(true);
  }

  function handleReset() {
    resetCashPressureTuningOverrides();
    setValues({ ...fileConfig });
    setApplied(false);
  }

  const effective = getCashPressureTuning();

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>In-memory only.</strong> Changes apply to the live game session via runtime
          overrides — they are not written to <code>cashPressureTuning.json</code>. Reset to return
          to the file baseline.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runway &amp; softening parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {NUMERIC_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-cream-muted">{f.label}</label>
                <Input
                  type="number"
                  step={f.step}
                  value={num(values[f.key] as number, 0)}
                  onChange={(e) => updateNumeric(f.key, parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Label thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {LABEL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-cream-muted">{f.label}</label>
                <Input
                  type="number"
                  step="0.05"
                  value={num(values.labelThresholds[f.key], 0)}
                  onChange={(e) => updateLabel(f.key, parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision trace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="checkbox"
              checked={values.enableDecisionTrace}
              onChange={(e) => {
                setValues((v) => ({ ...v, enableDecisionTrace: e.target.checked }));
                setApplied(false);
              }}
              className="h-4 w-4"
            />
            <label className="text-sm text-cream-muted">
              Emit <code>[trace]</code> log entries for NPC private sale decisions
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Effective values (live)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs text-cream-muted md:grid-cols-3">
            <span>comfortDays: {effective.comfortDays}</span>
            <span>crisisDays: {effective.crisisDays}</span>
            <span>maxDiscount: {effective.maxThresholdDiscount}</span>
            <span>pressureExp: {effective.pressureCurveExponent}</span>
            <span>softeningExp: {effective.softeningCurveExponent}</span>
            <span>trace: {effective.enableDecisionTrace ? "on" : "off"}</span>
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-cream-muted">
              Labels: desperate≥{effective.labelThresholds.desperate} · strained≥
              {effective.labelThresholds.strained} · tight≥{effective.labelThresholds.tight}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleApply} className="flex items-center gap-2">
          <Check className="h-4 w-4" /> Apply
        </Button>
        <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        {applied && <span className="text-xs text-emerald-300">Applied to live session.</span>}
      </div>
    </div>
  );
}
