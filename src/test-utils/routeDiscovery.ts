import type { ComponentType } from "react";

const routeModules = import.meta.glob("../routes/**/*.tsx", { eager: true }) as Record<
  string,
  { Route?: { options?: { component?: ComponentType } } }
>;

const SKIP = [/__root/];

export const routeCases = Object.entries(routeModules)
  .filter(([path]) => !SKIP.some((re) => re.test(path)))
  .map(([path, mod]) => ({
    name: path.replace("../routes/", ""),
    component: mod.Route?.options?.component,
  }))
  .filter(
    (c): c is { name: string; component: ComponentType } => typeof c.component === "function",
  );
