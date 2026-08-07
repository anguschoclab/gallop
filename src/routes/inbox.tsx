import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CheckCheck, Trash2, Pin, Bell, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { useInbox } from "@/hooks/inbox/useInbox";
import { InboxCeremonyRsvp } from "@/components/awards/CeremonyRsvpControls";
import { NewsContent } from "@/components/narrative/NewsContent";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

export function InboxPage() {
  const navigate = useNavigate();
  const {
    day,
    inbox,
    filter,
    setFilter,
    filteredMessages,
    markRead,
    markAllRead,
    dismiss,
    getCategoryIcon,
    getPriorityColor,
  } = useInbox();

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cream font-[family-name:var(--font-display)]">
            Message Center
          </h1>
          <p className="text-cream-muted text-sm mt-1">
            Your hub for critical stable updates and decisions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead()}
            disabled={inbox.every((m) => m.readAt)}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Messages
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread
          {inbox.some((m) => !m.readAt) && (
            <Badge variant="destructive" className="ml-2 px-1.5 h-4 min-w-[16px]">
              {inbox.filter((m) => !m.readAt).length}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === "action" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("action")}
        >
          Action Required
        </Button>
      </div>

      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Card className="bg-t800 border-gold-muted/30 py-12">
            <CardContent className="flex flex-col items-center justify-center text-cream-muted">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>No messages to display.</p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((msg) => (
            <Card
              key={msg.id}
              className={cn(
                "bg-t800 border-gold-muted/30 transition-all hover:border-gold/50 relative overflow-hidden",
                !msg.readAt && "border-l-4 border-l-gold shadow-lg shadow-gold/5",
                msg.priority === "urgent" && "border-l-4 border-l-red-500",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", getPriorityColor(msg.priority))}>
                      {getCategoryIcon(msg.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-cream">
                          <NewsContent text={msg.title} />
                        </CardTitle>
                        {!msg.readAt && (
                          <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                        )}
                        {msg.pinnedUntil && msg.pinnedUntil >= day && (
                          <Pin className="h-3 w-3 text-gold fill-gold" />
                        )}
                      </div>
                      <p className="text-xs text-cream-muted font-mono">
                        Day {msg.day} • {msg.category.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!msg.readAt && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={"Mark '" + msg.title + "' as read"}
                              onClick={() => markRead(msg.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark as read</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={"Dismiss message '" + msg.title + "'"}
                            onClick={() => dismiss(msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dismiss</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-cream-muted text-sm mb-4 leading-relaxed">
                  <NewsContent text={msg.body} />
                </p>
                {msg.cta?.params?.invitationId && (
                  <InboxCeremonyRsvp invitationId={msg.cta.params.invitationId} />
                )}
                {msg.cta && (
                  <Button
                    variant={msg.priority === "urgent" ? "destructive" : "default"}
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      markRead(msg.id);
                      if (msg.cta) {
                        // Handle parameterized routes
                        const routePath = msg.cta.route.replace(
                          /\$(\w+)/g,
                          (_, key) => msg.cta?.params?.[key] || "",
                        );
                        navigate({ to: routePath as FileRouteTypes["to"] });
                      }
                    }}
                  >
                    {msg.cta.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
