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
  it("label is associated with input using dynamic id", () => {
    const staff = mkStaff();
    renderWithStore(<StaffNegotiationDialog staff={staff} isOpen={true} onClose={vi.fn()} />, {
      cash: 100000,
      day: 1,
    });
    const label = document.querySelector('label');
    expect(label).toBeTruthy();
    const htmlFor = label?.getAttribute('for');
    expect(htmlFor).toBeTruthy();

    const input = document.querySelector(`input#${htmlFor?.replace(/:/g, '\\:')}`);
    expect(input).toBeTruthy();
  });

  it("label text 'Your offer (per day)' is present", () => {
    const staff = mkStaff();
    renderWithStore(<StaffNegotiationDialog staff={staff} isOpen={true} onClose={vi.fn()} />, {
      cash: 100000,
      day: 1,
    });

    // Find label by text content instead of hardcoded attribute
    const labels = Array.from(document.querySelectorAll('label'));
    const offerLabel = labels.find(l => l.textContent?.includes("Your offer"));
    expect(offerLabel).toBeTruthy();
  });
});
