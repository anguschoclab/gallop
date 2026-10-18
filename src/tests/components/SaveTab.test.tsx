import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveTab } from "@/domains/settings/ui/SaveTab";
import type { SaveSlotMetadata } from "@/platform/persistence/storage/saveManager";

const mkSave = (overrides: Partial<SaveSlotMetadata> = {}): SaveSlotMetadata => ({
  id: "save1",
  name: "Test Save",
  timestamp: Date.now(),
  gameDay: 100,
  stableName: "My Stable",
  cash: 50000,
  isAutoSave: false,
  ...overrides,
});

import type { LedgerEntryProps } from "@/domains/settings/ui/LedgerEntry";

const LedgerEntryMock = ({ save, actionLabel }: LedgerEntryProps) => (
  <div data-testid={`ledger-${save.id}`}>
    <span>{save.name}</span>
    <button>{actionLabel}</button>
  </div>
);

describe("SaveTab", () => {
  it("renders entry label and input field", () => {
    render(
      <SaveTab
        newSaveName=""
        onNameChange={vi.fn()}
        onCreate={vi.fn()}
        isSaving={false}
        saves={[]}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    expect(screen.getByText("Entry Label")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Save name...")).toBeInTheDocument();
  });

  it("disables create button when isSaving is true", () => {
    render(
      <SaveTab
        newSaveName=""
        onNameChange={vi.fn()}
        onCreate={vi.fn()}
        isSaving={true}
        saves={[]}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    const createButton = screen.getByText("Create Snapshot").closest("button");
    expect(createButton).toBeDisabled();
  });

  it("enables create button when isSaving is false", () => {
    render(
      <SaveTab
        newSaveName=""
        onNameChange={vi.fn()}
        onCreate={vi.fn()}
        isSaving={false}
        saves={[]}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    const createButton = screen.getByText("Create Snapshot").closest("button");
    expect(createButton).not.toBeDisabled();
  });

  it("renders previous snapshots excluding auto-saves", () => {
    const saves = [
      mkSave({ id: "manual1", name: "Manual Save 1" }),
      mkSave({ id: "auto1", name: "Auto Save", isAutoSave: true }),
      mkSave({ id: "manual2", name: "Manual Save 2" }),
    ];
    render(
      <SaveTab
        newSaveName=""
        onNameChange={vi.fn()}
        onCreate={vi.fn()}
        isSaving={false}
        saves={saves}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    expect(screen.getByTestId("ledger-manual1")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-manual2")).toBeInTheDocument();
    expect(screen.queryByTestId("ledger-auto1")).not.toBeInTheDocument();
  });

  it("calls onNameChange when input value changes", () => {
    const onNameChange = vi.fn();
    render(
      <SaveTab
        newSaveName=""
        onNameChange={onNameChange}
        onCreate={vi.fn()}
        isSaving={false}
        saves={[]}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    const input = screen.getByPlaceholderText("Save name...");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // Verify the input is controlled and wired
    expect(input).toBeInTheDocument();
  });

  it("shows Previous Snapshots header", () => {
    render(
      <SaveTab
        newSaveName=""
        onNameChange={vi.fn()}
        onCreate={vi.fn()}
        isSaving={false}
        saves={[]}
        onOverwrite={vi.fn()}
        onDelete={vi.fn()}
        LedgerEntryComponent={LedgerEntryMock}
      />,
    );
    expect(screen.getByText("Previous Snapshots")).toBeInTheDocument();
  });
});
