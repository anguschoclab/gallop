/**
 * PageHeader.test.tsx
 *
 * Verifies the shared PageHeader primitive: heading level, subtitle, and the
 * action zone (single primary CTA plus secondary actions).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/shared/ui/common/PageHeader";
import { Button } from "@/shared/ui/button";

describe("PageHeader", () => {
  it("renders the title as an h1", () => {
    render(<PageHeader title="Stable" />);
    expect(screen.getByRole("heading", { level: 1, name: "Stable" })).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(<PageHeader title="Stable" subtitle="4 horses" />);
    expect(screen.getByText("4 horses")).toBeInTheDocument();
  });

  it("renders primary and secondary actions in the action zone", () => {
    render(
      <PageHeader
        title="Stable"
        action={<Button>Primary</Button>}
        secondaryActions={<Button variant="outline">Secondary</Button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
  });

  it("omits the action zone when no actions are given", () => {
    const { container } = render(<PageHeader title="Stable" />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
