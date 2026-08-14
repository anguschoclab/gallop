import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";
import { useGame } from "@/game/store";
import { cn } from "@/lib/cn";
import { AlertCircle, Bell, ChevronRight } from "lucide-react";
import { NewsContent } from "@/components/narrative/NewsContent";
import { interpolateCtaRoute } from "@/core/inbox/ctaRoute";
import {
  ICON_SIZE_SM,
  STRIP_PRIORITY_BG_CLASSES,
  STRIP_DEFAULT_BG_CLASS,
  STRIP_BORDER_CLASSES,
  STRIP_DEFAULT_BORDER_CLASS,
} from "@/core/inbox/inboxConstants";

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
            STRIP_BORDER_CLASSES[msg.priority] ?? STRIP_DEFAULT_BORDER_CLASS,
          )}
          onClick={() => {
            if (msg.cta) {
              const routePath = interpolateCtaRoute(msg.cta.route, msg.cta.params);
              navigate({ to: routePath as FileRouteTypes["to"] });
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
                STRIP_PRIORITY_BG_CLASSES[msg.priority] ?? STRIP_DEFAULT_BG_CLASS,
              )}
            >
              {msg.priority === "urgent" ? (
                <AlertCircle className={ICON_SIZE_SM} />
              ) : (
                <Bell className={ICON_SIZE_SM} />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-cream truncate">{msg.title}</h3>
              <p className="text-xs text-cream-muted line-clamp-2">
                <NewsContent text={msg.body} />
              </p>
            </div>
            <ChevronRight className={cn(ICON_SIZE_SM, "text-cream-muted ml-auto shrink-0 group-hover:text-gold transition-colors")} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
