import { createFileRoute } from "@tanstack/react-router";
import { VetReport } from "@/domains/health/ui/VetReport";

export const Route = createFileRoute("/vet")({
  component: VetReport,
});
