import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { resetCache } from "@/hooks/shared/useBookmarks";

describe("BookmarkButton", () => {
  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  it("renders icon variant by default", () => {
    render(<BookmarkButton type="horse" id="h1" label="Thunder" subtitle="3yo Colt" />);
    const btn = screen.getByRole("button", { name: /add bookmark/i });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders full variant with Save label when inactive", () => {
    render(<BookmarkButton type="horse" id="h1" label="Thunder" variant="full" />);
    const btn = screen.getByRole("button", { name: /add bookmark/i });
    expect(btn.textContent).toContain("Save");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("toggles to Saved label and active state on click", () => {
    render(<BookmarkButton type="horse" id="h1" label="Thunder" variant="full" />);
    const btn = screen.getByRole("button", { name: /add bookmark/i });
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toContain("Saved");
  });

  it("toggles off on second click", () => {
    render(<BookmarkButton type="horse" id="h1" label="Thunder" variant="full" />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.textContent).toContain("Save");
  });

  it("calls stopPropagation and preventDefault on click", () => {
    const onClick = vi.fn();
    render(
      <div onClick={onClick}>
        <BookmarkButton type="horse" id="h1" label="Thunder" />
      </div>,
    );
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects custom className", () => {
    render(<BookmarkButton type="horse" id="h1" label="Thunder" className="my-custom-class" />);
    const btn = screen.getByRole("button");
    expect(btn.classList.contains("my-custom-class")).toBe(true);
  });
});
