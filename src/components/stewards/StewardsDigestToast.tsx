import { useState, useEffect } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function StewardsDigestToast() {
  const stewardsInquiries = useGame((s) => s.stewardsInquiries);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleInquiries = stewardsInquiries.filter((inq) => !dismissed.includes(inq.id));

  useEffect(() => {
    if (visibleInquiries.length > 0) {
      const timer = setTimeout(() => {
        setDismissed((prev) => [...prev, ...visibleInquiries.map((i) => i.id)]);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [visibleInquiries]);

  if (visibleInquiries.length === 0) return null;

  const inquiry = visibleInquiries[0];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-in slide-in-from-bottom-4">
      <Card className="bg-t800 border-l-4 border-l-red-500 shadow-lg">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-cream">Stewards' Inquiry</h3>
            <p className="text-xs text-cream-muted mt-1 line-clamp-2">{inquiry.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss"
            className="shrink-0"
            onClick={() => setDismissed((prev) => [...prev, inquiry.id])}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
