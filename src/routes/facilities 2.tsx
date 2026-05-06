import { createFileRoute } from "@tanstack/react-router";
import { FacilitiesPanel } from "@/components/FacilitiesPanel";

export const Route = createFileRoute("/facilities")({
  component: FacilitiesPage,
});

function FacilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facilities</h1>
        <p className="text-muted-foreground mt-1">Upgrade your stable infrastructure</p>
      </div>
      <FacilitiesPanel />
    </div>
  );
}
