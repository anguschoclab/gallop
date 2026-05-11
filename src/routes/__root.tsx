import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { AppShell } from "../components/AppShell";
import { useEffect, useState } from "react";
import { rehydrateStore, useGame } from "@/game/store";
import { hydrationComplete } from "@/game/store/storage";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-cream font-[family-name:var(--font-display)]">
          404
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-cream font-[family-name:var(--font-display)]">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-cream-muted font-[family-name:var(--font-body)]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-t700 px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-t600"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // 🛡️ Sentinel Security Fix: Added Content-Security-Policy to enforce defense in depth against XSS and data exfiltration
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://www.transparenttextures.com; worker-src 'self' blob:; object-src 'none';",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gallop — Stable Manager" },
      { name: "description", content: "Train horses, enter them in races, build the best stable." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Gallop — Stable Manager" },
      { property: "og:description", content: "A horse racing stable management simulation" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [isHydrated, setIsHydrated] = useState(false);
  const playerProfile = useGame((s) => s.playerProfile);
  const navigate = useNavigate();

  useEffect(() => {
    // Rehydrate store on client mount
    rehydrateStore(useGame)
      .catch((error) => {
        console.error("Failed to rehydrate store:", error);
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    // Redirect to wizard if no player profile exists (fresh install)
    if (isHydrated && !playerProfile) {
      // Navigate to wizard - TanStack Router will handle route type after regeneration
      navigate({ to: "/new-game" }).catch((error) => {
        console.error("Navigation error:", error);
      });
    }
  }, [isHydrated, playerProfile, navigate]);

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">Loading...</p>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
