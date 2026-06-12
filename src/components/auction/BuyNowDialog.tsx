import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { toast } from "sonner";

interface BuyNowDialogProps {
  horseName: string;
  buyNowPrice: number;
  cash: number;
  onBuyNow: () => { ok: boolean; reason?: string };
  disabled?: boolean;
}

export function BuyNowDialog({
  horseName,
  buyNowPrice,
  cash,
  onBuyNow,
  disabled = false,
}: BuyNowDialogProps) {
  const formatted = formatCurrency(buyNowPrice);
  const canAfford = cash >= buyNowPrice;

  if (disabled) {
    return (
      <div className="space-y-1">
        <Button variant="outline" className="w-full gap-2" disabled>
          <Zap className="h-4 w-4" />
          Buy Now {formatted}
        </Button>
        <p className="text-xs text-destructive tabular-nums text-center">
          Insufficient funds. You need {formatCurrency(buyNowPrice - cash)} more.
        </p>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Zap className="h-4 w-4" />
          Buy Now {formatted}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Buy {horseName} now for {formatted}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This immediately ends the lot. Your account will be debited {formatted} and {horseName}{" "}
            will transfer to your stable.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const result = onBuyNow();
              if (result.ok) {
                toast.success(`${horseName ?? "Horse"} joins your stable.`);
              } else {
                if (result.reason === "buy_now_unavailable") {
                  toast.info("Buy-now removed — bidding is active.");
                } else {
                  toast.error(`Buy Now failed: ${result.reason}`);
                }
              }
            }}
          >
            Buy Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
