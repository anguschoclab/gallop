/**
 * Tests for StaffNegotiationDialog accessibility (Palette-1 branch).
 *
 * Validates that the offer amount input has proper label association
 * via htmlFor/id attributes.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { StaffNegotiationDialog } from "@/components/staff/StaffNegotiationDialog";
import type { StaffMember } from "@/core/staff/staffTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

const mkStaff = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  id: "staff-1",
  name: "Test Trainer",
  role: "trainer",
  tier: "mid",
  salary: 500,
  bonusValue: 0.25,
  traits: [],
  fame: 50,
  ...overrides,
});

describe("StaffNegotiationDialog — accessibility", () => {
  it("label has htmlFor='offerAmount' attribute", () => {
    const staff = mkStaff();
    renderWithStore(
      <StaffNegotiationDialog staff={staff} isOpen={true} onClose={vi.fn()} />,
      { cash: 100000, day: 1 },
    );
    const label = document.querySelector('label[for="offerAmount"]');
    expect(label).toBeTruthy();
  });

  it("input has id='offerAmount' attribute", () => {
    const staff = mkStaff();
    renderWithStore(
      <StaffNegotiationDialog staff={staff} isOpen={true} onClose={vi.fn()} />,
      { cash: 100000, day: 1 },
    );
    const input = document.querySelector('input#offerAmount');
    expect(input).toBeTruthy();
  });

  it("label text 'Your offer (per day)' is present", () => {
    const staff = mkStaff();
    renderWithStore(
      <StaffNegotiationDialog staff={staff} isOpen={true} onClose={vi.fn()} />,
      { cash: 100000, day: 1 },
    );
    const label = document.querySelector('label[for="offerAmount"]');
    expect(label?.textContent).toContain("Your offer");
  });
});
