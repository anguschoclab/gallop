import { createElement, type ReactNode } from "react";

export const MOCK_PARAMS: Record<string, string> = {
  raceId: "mock-race-id",
  horseId: "mock-horse-id",
  stableId: "mock-stable-id",
  jockeyId: "mock-jockey-id",
  staffId: "mock-staff-id",
  regionId: "usa",
  saleId: "mock-sale-id",
  stallionId: "mock-stallion-id",
  syndicateId: "mock-syndicate-id",
  category: "horse_of_the_year",
};

const noop = () => {};
const noopAsync = () => Promise.resolve();

export class NotFoundError extends Error {
  constructor() {
    super("notFound");
    this.name = "NotFoundError";
  }
}

const routeApi = {
  useSearch: () => ({}),
  useNavigate: () => noopAsync,
  useParams: () => MOCK_PARAMS,
  useLoaderData: () => ({}),
};

export function createRouterMock() {
  return {
    Link: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
      createElement("a", props, children),
    Outlet: () => null,
    Navigate: () => null,
    useNavigate: () => noopAsync,
    useSearch: () => ({}),
    useParams: () => MOCK_PARAMS,
    useRouter: () => ({ navigate: noopAsync, history: { back: noop } }),
    useRouterState: () => ({ location: { pathname: "/", search: {} } }),
    getRouteApi: () => routeApi,
    notFound: () => new NotFoundError(),
    redirect: (opts: unknown) => opts,
    createFileRoute: () => (options: unknown) => ({
      options,
      ...routeApi,
    }),
    createRootRoute: () => (options: unknown) => ({ options }),
    HeadContent: () => null,
    Scripts: () => null,
  };
}
