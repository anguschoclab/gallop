import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanSummaryBar } from "@/components/breeding/PlanSummaryBar";
import type { SavedMatingPlan } from "@/game/store/state/breedingState";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      data-testid="plan-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/DisabledTooltipWrapper", () => ({
  DisabledTooltipWrapper: ({ children }: any) => <>{children}</>,
}));

const mockPlan = {
  id: "plan-1",
  name: "Test Plan",
  entries: [],
  createdDay: 1,
} as unknown as SavedMatingPlan;

const defaultProps = {
  assignedCount: 2,
  totalCost: 50000,
  cash: 100000,
  canAffordAll: true,
  seasonOpen: true,
  savedMatingPlans: [mockPlan],
  onConfirmAll: vi.fn(),
  onAutoAssign: vi.fn(),
  onClearAll: vi.fn(),
  onSavePlan: vi.fn(),
  onLoadPlan: vi.fn(),
  onDeletePlan: vi.fn(),
};

describe("PlanSummaryBar accessibility", () => {
  it("renders delete button when a plan is loaded", () => {
    const { container } = render(<PlanSummaryBar {...defaultProps} />);
    // Select a plan to trigger the delete button visibility
    const select = screen.getByTestId("plan-select");
    fireEvent.change(select, { target: { value: "plan-1" } });
    // The delete button should appear — it uses a Trash2 icon
    const deleteButton = container.querySelector("button.ghost") ?? screen.getAllByRole("button");
    // Verify the trash icon button exists
    const trashButtons = Array.from(container.querySelectorAll("button")).filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.classList.contains("h-7");
    });
    expect(trashButtons.length).toBeGreaterThan(0);
  });

  // ─── Characterization: delete button currently lacks aria-label ──────────────
  // After Palette #319 adds aria-label, this test should verify it's present.
  // For now, we lock the current (broken) behavior.
  it("delete button currently does NOT have aria-label (characterizes the bug)", () => {
    const { container } = render(<PlanSummaryBar {...defaultProps} />);
    const select = screen.getByTestId("plan-select");
    fireEvent.change(select, { target: { value: "plan-1" } });
    const trashButtons = Array.from(container.querySelectorAll("button")).filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.classList.contains("h-7");
    });
    expect(trashButtons.length).toBeGreaterThan(0);
    // This characterizes the current bug: no aria-label on the delete button
    expect(trashButtons[0].getAttribute("aria-label")).toBeNull();
  });
});
