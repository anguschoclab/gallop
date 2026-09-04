import { createFileRoute } from "@tanstack/react-router";
import { VetReport } from "@/components/health/VetReport";

export const Route = createFileRoute("/vet")({
  component: VetReport,
});
