import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { cn } from "@/lib/utils";
import { AlertCircle, Bell, ChevronRight } from "lucide-react";

interface UrgentMessagesStripProps {
  messages: Array<{
    id: string;
    title: string;
    body: string;
    priority: string;
    cta?: {
      route: string;
      params?: Record<string, string>;
    };
  }>;
}

export function UrgentMessagesStrip({ messages }: UrgentMessagesStripProps) {
  const navigate = useNavigate();
  const markMessageRead = useGame((s) => s.markMessageRead);

  if (messages.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {messages.map((msg) => (
        <Card
          key={msg.id}
          className={cn(
            "bg-t800 border-l-4 transition-all hover:bg-t750 cursor-pointer group",
            msg.priority === "urgent" ? "border-l-red-500" : "border-l-gold",
          )}
          onClick={() => {
            if (msg.cta) {
              const routePath = msg.cta.route.replace(
                /\$(\w+)/g,
                (_, key) => msg.cta?.params?.[key] || "",
              );
              navigate({ to: routePath as any });
              markMessageRead(msg.id);
            } else {
              navigate({ to: "/inbox" });
            }
          }}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-full shrink-0",
                msg.priority === "urgent"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-gold/10 text-gold",
              )}
            >
              {msg.priority === "urgent" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-cream truncate">{msg.title}</h3>
              <p className="text-xs text-cream-muted line-clamp-2">{msg.body}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-cream-muted ml-auto shrink-0 group-hover:text-gold transition-colors" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
