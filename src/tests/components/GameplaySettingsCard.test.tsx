import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ onValueChange, value, id, ...props }: any) =>
    createElement("input", {
      type: "range",
      id,
      role: "slider",
      value: value?.[0] ?? 0,
      onChange: (e: any) => onValueChange?.([Number(e.target.value)]),
      ...props,
    }),
}));

import { GameplaySettingsCard } from "@/components/settings/GameplaySettingsCard";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";

describe("GameplaySettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all existing toggle settings", () => {
    const settings = createDefaultUserSettings(1).gameplay;
    render(
      <GameplaySettingsCard
        settings={settings}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText("Auto-Simulation")).toBeInTheDocument();
    expect(screen.getByText("Race Entry Suggestions")).toBeInTheDocument();
    expect(screen.getByText("Daily Earnings Summary")).toBeInTheDocument();
    expect(screen.getByText("Pause on Events")).toBeInTheDocument();
    expect(screen.getByText("Parent Name Blending")).toBeInTheDocument();
  });

  it("renders imminent forced sale warning slider", () => {
    const settings = createDefaultUserSettings(1).gameplay;
    render(
      <GameplaySettingsCard
        settings={settings}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText(/imminent forced sale/i)).toBeInTheDocument();
    expect(screen.getByText(/days before forced sale/i)).toBeInTheDocument();
  });

  it("displays current imminentForcedSaleWarningDays value", () => {
    const settings = createDefaultUserSettings(1).gameplay;
    render(
      <GameplaySettingsCard
        settings={settings}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText("2 days")).toBeInTheDocument();
  });

  it("calls onUpdate with new imminentForcedSaleWarningDays when slider changes", () => {
    const settings = createDefaultUserSettings(1).gameplay;
    const onUpdate = vi.fn();
    render(
      <GameplaySettingsCard
        settings={settings}
        onUpdate={onUpdate}
      />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "4" } });
    expect(onUpdate).toHaveBeenCalledWith({ imminentForcedSaleWarningDays: 4 });
  });

  it("renders with default value when imminentForcedSaleWarningDays is missing", () => {
    render(
      <GameplaySettingsCard
        settings={{ autoSimEnabled: true } as any}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText("2 days")).toBeInTheDocument();
  });
});
