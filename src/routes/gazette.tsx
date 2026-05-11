import { createFileRoute } from "@tanstack/react-router";
import { Gazette } from "@/components/narrative/Gazette";

export const Route = createFileRoute("/gazette")({
  component: Gazette,
});
