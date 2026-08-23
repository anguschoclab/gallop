import type { ComponentType } from "react";

type RouteModule = {
  Route?: {
    options?: {
      component?: ComponentType;
      beforeLoad?: () => void;
    };
  };
};

const routeModules = import.meta.glob("../routes/**/*.tsx", { eager: true }) as Record<
  string,
  RouteModule
>;

const SKIP = [/__root/];

type ComponentRouteCase = { name: string; component: ComponentType };
type RedirectRouteCase = { name: string; beforeLoad: () => void };

const allEntries = Object.entries(routeModules).filter(
  ([path]) => !SKIP.some((re) => re.test(path)),
);

export const componentRouteCases: ComponentRouteCase[] = allEntries
  .map(([path, mod]) => ({
    name: path.replace("../routes/", ""),
    component: mod.Route?.options?.component,
  }))
  .filter((c): c is ComponentRouteCase => typeof c.component === "function");

export const redirectRouteCases: RedirectRouteCase[] = allEntries
  .map(([path, mod]) => ({
    name: path.replace("../routes/", ""),
    beforeLoad: mod.Route?.options?.beforeLoad,
  }))
  .filter((c): c is RedirectRouteCase =>
    typeof c.beforeLoad === "function"
      ? !componentRouteCases.some((cc) => cc.name === c.name)
      : false,
  );

// Backward compat: union of all non-root routes
export const routeCases = [...componentRouteCases, ...redirectRouteCases];
