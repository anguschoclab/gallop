import { createFileRoute, redirect } from "@tanstack/react-router";
import { CashPressureTuningEditor } from "@/components/debug/CashPressureTuningEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/debug/cash-pressure-tuning")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  component: DebugCashPressureTuningComponent,
});

function DebugCashPressureTuningComponent() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-gold" /> Cash Pressure Tuning Editor
        </h1>
        <p className="text-sm text-cream-muted mt-1">
          Live-tune NPC cash-pressure runway thresholds, curve shape, max threshold softening, and
          label cutoffs. Changes apply to the current session only.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <CashPressureTuningEditor />
        </CardContent>
      </Card>
    </div>
  );
}
