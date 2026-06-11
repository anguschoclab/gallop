import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { Truck, Plane, Train, X, CheckCircle, Clock } from "lucide-react";
import { useGame, useGameWithShallow } from "@/game/store";
import { formatTransportMode, type TransportRequest } from "@/core/transportation/transportationTypes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

interface TransportPlannerProps {
  horseId?: string;
}

export function TransportPlanner({ horseId }: TransportPlannerProps) {
  const transports = useGameWithShallow((s) => s.transports || []);
  const horses = useGameWithShallow((s) => s.horses);
  const day = useGame((s) => s.day);
  const cancelTransport = useGame((s) => s.cancelTransport);

  // Filter transports - if horseId provided, only show that horse's transports
  const filteredTransports = horseId
    ? transports.filter((t) => t.horseId === horseId)
    : transports;

  if (filteredTransports.length === 0) {
    return null;
  }

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "road":
        return <Truck className="h-4 w-4" />;
      case "air":
        return <Plane className="h-4 w-4" />;
      case "rail":
        return <Train className="h-4 w-4" />;
      default:
        return <Truck className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "idle":
        return <Clock className="h-3 w-3 text-yellow-400" />;
      case "in_transit":
        return <Clock className="h-3 w-3 text-blue-400" />;
      case "arrived":
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "bg-yellow-400/10 text-yellow-400 border-yellow-400/30";
      case "in_transit":
        return "bg-blue-400/10 text-blue-400 border-blue-400/30";
      case "arrived":
        return "bg-green-400/10 text-green-400 border-green-400/30";
      default:
        return "bg-gray-400/10 text-gray-400 border-gray-400/30";
    }
  };

  const handleCancel = (transportId: string) => {
    const result = cancelTransport(transportId);
    if (result.ok) {
      toast.success("Transport canceled", { duration: 3000 });
    } else {
      toast.error(result.reason, { duration: 3000 });
    }
  };

  // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside the map loop.
  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <Truck className="h-4 w-4 text-purple-400" /> Transportation
          </CardTitle>
          <Badge className="bg-purple-400/10 text-purple-400 border-purple-400/30">
            {filteredTransports.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredTransports.map((transport) => {
          const horse = horseMap.get(transport.horseId);
          const daysUntilArrival = transport.arrivalDay - day;
          const isPastDue = daysUntilArrival < 0;

          return (
            <div
              key={transport.id}
              className="bg-black/40 border border-white/5 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTransportIcon(transport.mode)}
                  <span className="text-xs font-bold text-cream">{horse?.name || "Unknown Horse"}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] font-black uppercase tracking-wider border-white/10", getStatusColor(transport.status))}
                >
                  {transport.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Route
                  </span>
                  <span className="font-mono text-cream/80 text-[10px]">
                    {transport.fromLocation} → {transport.toLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Mode
                  </span>
                  <span className="font-mono text-cream/80 text-[10px]">
                    {formatTransportMode(transport.mode)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Cost
                  </span>
                  <span className="font-mono text-gold text-[10px]">
                    {formatCurrency(transport.cost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Duration
                  </span>
                  <span className="font-mono text-cream/80 text-[10px]">
                    {transport.duration} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                    Arrival
                  </span>
                  <span className={cn("font-mono text-[10px]", isPastDue ? "text-red-400" : "text-cream/80")}>
                    Day {transport.arrivalDay}
                    {isPastDue && " (Overdue)"}
                  </span>
                </div>
              </div>

              {transport.status === "idle" && (
                <Button
                  onClick={() => handleCancel(transport.id)}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-400/30 text-red-400 hover:bg-red-400/10 font-black uppercase tracking-widest text-[10px]"
                >
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
