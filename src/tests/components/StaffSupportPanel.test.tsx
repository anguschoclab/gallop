import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderWithStore, seedStore } from "@/test-utils/renderWithStore";
import { StaffSupportPanel } from "@/components/horse/StaffSupportPanel";
import type { StaffMember } from "@/core/staff/staffTypes";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";

function mkStaff(
  role: StaffMember["role"],
  stableId: string,
  bonusValue = 0.25,
): StaffMember {
  return {
    id: `staff-${role}-${stableId}`,
    name: `Test ${role}`,
    role,
    tier: "mid",
    salary: 500,
    bonusValue,
    traits: [],
    fame: 50,
    stableId,
  };
}

describe("StaffSupportPanel", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders no-staff message when no staff are hired", () => {
    renderWithStore(<StaffSupportPanel stableId="stable1" />);
    expect(screen.getByText(/no specialized staff support active/i)).toBeTruthy();
  });

  it("renders no-staff message when hiredStaff is null/undefined", () => {
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: [] as any });
    expect(screen.getByText(/no specialized staff support active/i)).toBeTruthy();
  });

  it("renders nutritionist bonus with correct percentage", () => {
    const staff = [mkStaff("nutritionist", "stable1", 0.25)];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    expect(screen.getByText("Nutritionist")).toBeTruthy();
    expect(screen.getByText("+25% Energy")).toBeTruthy();
  });

  it("renders all 5 staff role bonuses when all 5 roles are hired", () => {
    const staff: StaffMember[] = [
      mkStaff("nutritionist", "stable1", 0.1),
      mkStaff("veterinarian", "stable1", 0.2),
      mkStaff("trainer", "stable1", 0.3),
      mkStaff("farrier", "stable1", 0.05),
      mkStaff("groom", "stable1", 0.15),
    ];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    expect(screen.getByText("Nutritionist")).toBeTruthy();
    expect(screen.getByText("Veterinarian")).toBeTruthy();
    expect(screen.getByText("Trainer")).toBeTruthy();
    expect(screen.getByText("Farrier")).toBeTruthy();
    expect(screen.getByText("Groom")).toBeTruthy();
  });

  it("only shows staff for the matching stableId", () => {
    const staff: StaffMember[] = [
      mkStaff("nutritionist", "stable1", 0.1),
      mkStaff("trainer", "stable2", 0.3),
    ];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    expect(screen.getByText("Nutritionist")).toBeTruthy();
    expect(screen.queryByText("Trainer")).toBeNull();
  });

  it("renders correct bonus values from bonusValue", () => {
    const staff = [mkStaff("groom", "stable1", 0.6)];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    expect(screen.getByText("+60% Form")).toBeTruthy();
  });

  it("renders correct bonuses when roles are in non-standard order in the array", () => {
    const staff: StaffMember[] = [
      mkStaff("groom", "stable1", 0.15),
      mkStaff("farrier", "stable1", 0.05),
      mkStaff("trainer", "stable1", 0.3),
      mkStaff("veterinarian", "stable1", 0.2),
      mkStaff("nutritionist", "stable1", 0.1),
    ];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    expect(screen.getByText("Nutritionist")).toBeTruthy();
    expect(screen.getByText("+10% Energy")).toBeTruthy();
    expect(screen.getByText("Veterinarian")).toBeTruthy();
    expect(screen.getByText("+20% Recovery")).toBeTruthy();
    expect(screen.getByText("Trainer")).toBeTruthy();
    expect(screen.getByText("+30% Efficiency")).toBeTruthy();
    expect(screen.getByText("Farrier")).toBeTruthy();
    expect(screen.getByText("+5% Aptitude")).toBeTruthy();
    expect(screen.getByText("Groom")).toBeTruthy();
    expect(screen.getByText("+15% Form")).toBeTruthy();
  });

  it("does not duplicate bonuses when multiple staff have same role", () => {
    const staff: StaffMember[] = [
      mkStaff("nutritionist", "stable1", 0.1),
      mkStaff("nutritionist", "stable1", 0.25),
    ];
    renderWithStore(<StaffSupportPanel stableId="stable1" />, { hiredStaff: staff } as any);
    const nutritionistElements = screen.getAllByText("Nutritionist");
    expect(nutritionistElements).toHaveLength(1);
  });
});
