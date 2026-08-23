import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BreedingHistoryTab } from "@/components/breeding/BreedingHistoryTab";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="search-input" {...props} />,
}));

vi.mock("@/components/breeding/FoalNamingDialog", () => ({
  FoalNamingDialog: () => <div data-testid="foal-naming-dialog" />,
}));

vi.mock("@/components/horse/FoalInheritancePanel", () => ({
  FoalInheritancePanel: () => <div data-testid="foal-inheritance-panel" />,
}));

const mockPageData = (overrides: any = {}) => ({
  pregnancies: [],
  breedLogs: [],
  localHorseMap: new Map(),
  namingFoalId: null,
  setNamingFoalId: vi.fn(),
  ...overrides,
});

describe("BreedingHistoryTab", () => {
  it("renders LeaderboardEmpty when no foals born", () => {
    render(<BreedingHistoryTab pageData={mockPageData()} />);
    expect(screen.getByText("No foals born yet.")).toBeTruthy();
  });

  it("renders LeaderboardEmpty for breeding log when empty", () => {
    render(<BreedingHistoryTab pageData={mockPageData()} />);
    expect(screen.getByText("No breeding events yet.")).toBeTruthy();
  });

  it("renders foal records with sire × dam meta", () => {
    const pageData = mockPageData({
      pregnancies: [
        {
          id: "p1",
          resolved: true,
          sireName: "Thunder",
          damName: "Lightning",
          foalId: "f1",
          dueDay: 30,
        },
      ],
      localHorseMap: new Map([
        [
          "f1",
          { id: "f1", name: "Baby Foal", sireId: "s1", damId: "d1", ownership: { type: "player" } },
        ],
        ["s1", { id: "s1", name: "Thunder" }],
        ["d1", { id: "d1", name: "Lightning" }],
      ]),
    });
    render(<BreedingHistoryTab pageData={pageData} />);
    expect(screen.getByText("Baby Foal")).toBeTruthy();
    expect(screen.getByText(/Thunder × Lightning/)).toBeTruthy();
  });

  it("renders Name Foal button for unnamed owned foals", () => {
    const setNamingFoalId = vi.fn();
    const pageData = mockPageData({
      pregnancies: [
        {
          id: "p1",
          resolved: true,
          sireName: "Thunder",
          damName: "Lightning",
          foalId: "f1",
          dueDay: 30,
        },
      ],
      localHorseMap: new Map([
        [
          "f1",
          {
            id: "f1",
            name: "Unnamed Foal",
            sireId: "s1",
            damId: "d1",
            ownership: { type: "player" },
          },
        ],
        ["s1", { id: "s1", name: "Thunder" }],
        ["d1", { id: "d1", name: "Lightning" }],
      ]),
      setNamingFoalId,
    });
    render(<BreedingHistoryTab pageData={pageData} />);
    const nameBtn = screen.getByText("Name Foal");
    fireEvent.click(nameBtn);
    expect(setNamingFoalId).toHaveBeenCalledWith("f1");
  });

  it("renders Sold badge for sold foals", () => {
    const pageData = mockPageData({
      pregnancies: [
        {
          id: "p1",
          resolved: true,
          sireName: "Thunder",
          damName: "Lightning",
          foalId: "f1",
          dueDay: 30,
        },
      ],
      localHorseMap: new Map(),
    });
    render(<BreedingHistoryTab pageData={pageData} />);
    expect(screen.getByText("(sold)")).toBeTruthy();
    expect(screen.getByText("Sold")).toBeTruthy();
  });

  it("renders ControlsBar with sort and filter options", () => {
    const pageData = mockPageData({
      pregnancies: [
        {
          id: "p1",
          resolved: true,
          sireName: "Thunder",
          damName: "Lightning",
          foalId: "f1",
          dueDay: 30,
        },
      ],
      localHorseMap: new Map([
        [
          "f1",
          { id: "f1", name: "Baby Foal", sireId: "s1", damId: "d1", ownership: { type: "player" } },
        ],
        ["s1", { id: "s1", name: "Thunder" }],
        ["d1", { id: "d1", name: "Lightning" }],
      ]),
    });
    render(<BreedingHistoryTab pageData={pageData} />);
    expect(screen.getByText("Most Recent")).toBeTruthy();
    expect(screen.getByText("Named Foals")).toBeTruthy();
    expect(screen.getByText("Sold Foals")).toBeTruthy();
  });

  it("renders breeding log entries", () => {
    const pageData = mockPageData({
      breedLogs: [
        { day: 10, text: "Bred Thunder × Lightning" },
        { day: 15, text: "Foal born" },
      ],
    });
    render(<BreedingHistoryTab pageData={pageData} />);
    expect(screen.getByText("Bred Thunder × Lightning")).toBeTruthy();
    expect(screen.getByText("Foal born")).toBeTruthy();
  });
});
