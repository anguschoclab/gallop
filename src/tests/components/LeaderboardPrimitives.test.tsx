import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LeaderboardShell,
  LeaderboardEmpty,
  LeaderboardRow,
  LeaderboardHeading,
  LeaderboardSkeleton,
  LeaderboardError,
  LeaderboardControlsBar,
} from "@/components/leaderboard/LeaderboardPrimitives";

// Mock Select to avoid Radix portal complexity in tests
vi.mock("@/components/ui/select", () => {
  return {
    Select: ({ value, onValueChange, children }: any) => (
      <select
        data-testid="select"
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
  };
});

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

describe("LeaderboardPrimitives", () => {
  describe("LeaderboardSkeleton", () => {
    it("renders N skeleton rows", () => {
      const { container } = render(<LeaderboardSkeleton rows={3} />);
      // Each row has a Skeleton with "w-8 sm:w-10 h-8" (the rank block)
      const rankBlocks = container.querySelectorAll(".w-8");
      expect(rankBlocks.length).toBe(3);
    });

    it("defaults to 5 rows", () => {
      const { container } = render(<LeaderboardSkeleton />);
      const rankBlocks = container.querySelectorAll(".w-8");
      expect(rankBlocks.length).toBe(5);
    });
  });

  describe("LeaderboardError", () => {
    it("renders the message", () => {
      render(<LeaderboardError message="Something went wrong" />);
      expect(screen.getByText("Something went wrong")).toBeTruthy();
    });

    it("renders default message when none provided", () => {
      render(<LeaderboardError />);
      expect(screen.getByText("Failed to load leaderboard.")).toBeTruthy();
    });

    it("renders retry button when onRetry provided", () => {
      const onRetry = vi.fn();
      render(<LeaderboardError onRetry={onRetry} />);
      const btn = screen.getByText("Retry");
      expect(btn).toBeTruthy();
      fireEvent.click(btn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("does not render retry button when onRetry not provided", () => {
      render(<LeaderboardError />);
      expect(screen.queryByText("Retry")).toBeNull();
    });
  });

  describe("LeaderboardControlsBar", () => {
    const sortOptions = [
      { value: "aei", label: "AEI" },
      { value: "ci", label: "CI" },
    ];
    const filterOptions = [
      { value: "all", label: "All" },
      { value: "elite", label: "Elite" },
    ];

    it("renders sort select with all options", () => {
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
        />,
      );
      const select = screen.getByTestId("select");
      expect(select).toBeTruthy();
      expect(select.querySelectorAll("option").length).toBe(2);
      expect(screen.getByText("AEI")).toBeTruthy();
      expect(screen.getByText("CI")).toBeTruthy();
    });

    it("renders filter select when filterOptions provided", () => {
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
          filterOptions={filterOptions}
          filterValue="all"
          onFilterChange={() => {}}
        />,
      );
      const selects = screen.getAllByTestId("select");
      expect(selects.length).toBe(2);
    });

    it("does not render filter select when filterOptions not provided", () => {
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
        />,
      );
      expect(screen.getAllByTestId("select").length).toBe(1);
    });

    it("renders search input when searchQuery and onSearchChange provided", () => {
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
        />,
      );
      expect(screen.getByTestId("search-input")).toBeTruthy();
    });

    it("does not render search input when searchQuery not provided", () => {
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
        />,
      );
      expect(screen.queryByTestId("search-input")).toBeNull();
    });

    it("calls onSortChange when sort value changes", () => {
      const onSortChange = vi.fn();
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={onSortChange}
        />,
      );
      const select = screen.getByTestId("select");
      fireEvent.change(select, { target: { value: "ci" } });
      expect(onSortChange).toHaveBeenCalledWith("ci");
    });

    it("calls onFilterChange when filter value changes", () => {
      const onFilterChange = vi.fn();
      render(
        <LeaderboardControlsBar
          sortOptions={sortOptions}
          sortValue="aei"
          onSortChange={() => {}}
          filterOptions={filterOptions}
          filterValue="all"
          onFilterChange={onFilterChange}
        />,
      );
      const selects = screen.getAllByTestId("select");
      fireEvent.change(selects[1], { target: { value: "elite" } });
      expect(onFilterChange).toHaveBeenCalledWith("elite");
    });
  });

  describe("LeaderboardRow mobile classes", () => {
    it("has responsive padding classes", () => {
      const { container } = render(
        <LeaderboardRow rank={1} name="Test" value="100" />,
      );
      const row = container.firstChild as HTMLElement;
      expect(row.className).toContain("px-3");
      expect(row.className).toContain("sm:px-6");
      expect(row.className).toContain("py-2.5");
      expect(row.className).toContain("sm:py-3");
    });

    it("has min-h-[44px] when onClick provided", () => {
      const { container } = render(
        <LeaderboardRow rank={1} name="Test" value="100" onClick={() => {}} />,
      );
      const row = container.firstChild as HTMLElement;
      expect(row.className).toContain("min-h-[44px]");
    });

    it("does not have min-h-[44px] when onClick not provided", () => {
      const { container } = render(
        <LeaderboardRow rank={1} name="Test" value="100" />,
      );
      const row = container.firstChild as HTMLElement;
      expect(row.className).not.toContain("min-h-[44px]");
    });
  });

  describe("LeaderboardHeading", () => {
    it("renders title", () => {
      render(<LeaderboardHeading title="Test Title" />);
      expect(screen.getByText("Test Title")).toBeTruthy();
    });

    it("renders description when provided", () => {
      render(<LeaderboardHeading title="Test" description="A description" />);
      expect(screen.getByText("A description")).toBeTruthy();
    });

    it("renders rightSlot when provided", () => {
      render(
        <LeaderboardHeading
          title="Test"
          rightSlot={<button>Action</button>}
        />,
      );
      expect(screen.getByText("Action")).toBeTruthy();
    });
  });

  describe("LeaderboardShell", () => {
    it("renders title and children", () => {
      render(
        <LeaderboardShell title="My Shell">
          <div>Content</div>
        </LeaderboardShell>,
      );
      expect(screen.getByText("My Shell")).toBeTruthy();
      expect(screen.getByText("Content")).toBeTruthy();
    });
  });

  describe("LeaderboardEmpty", () => {
    it("renders default message", () => {
      render(<LeaderboardEmpty />);
      expect(
        screen.getByText(/No records found yet/),
      ).toBeTruthy();
    });

    it("renders custom message", () => {
      render(<LeaderboardEmpty message="Custom empty" />);
      expect(screen.getByText("Custom empty")).toBeTruthy();
    });
  });
});
