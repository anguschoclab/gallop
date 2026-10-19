/**
 * PersonProfileHero.test.tsx - Person detail hero contracts
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PersonProfileHero } from "@/domains/person/ui/PersonProfileHero";
import { PortraitRandomizeButton } from "@/domains/person/ui/PortraitRandomizeButton";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const identity = createStubPersonIdentity({
  id: "hero-test",
  displayName: "Hero Person",
  nationality: "IRE",
});
identity.biography.birthYear = 1990;

describe("PersonProfileHero", () => {
  it("renders portrait, name, role, and biography fields", () => {
    const html = renderToStaticMarkup(
      createElement(PersonProfileHero, {
        identity,
        role: "trainer",
        context: "staff",
        day: 100,
        subtitle: "Head Trainer",
      }),
    );
    expect(html).toContain('data-testid="person-profile-hero"');
    expect(html).toContain("Hero Person");
    expect(html).toContain("Trainer");
    expect(html).toContain("Head Trainer");
    expect(html).toContain("IRE");
    expect(html).toContain("Age 36");
    expect(html).toContain("<svg");
  });

  it("renders action children", () => {
    const html = renderToStaticMarkup(
      createElement(
        PersonProfileHero,
        { identity, role: "jockey" },
        createElement(PortraitRandomizeButton, { onClick: () => {} }),
      ),
    );
    expect(html).toContain("Randomize Portrait");
  });

  it("omits age when no day is provided", () => {
    const html = renderToStaticMarkup(
      createElement(PersonProfileHero, { identity, role: "owner" }),
    );
    expect(html).not.toContain("Age ");
  });
});

describe("PortraitRandomizeButton", () => {
  it("renders an accessible labeled button", () => {
    const html = renderToStaticMarkup(
      createElement(PortraitRandomizeButton, { onClick: () => {} }),
    );
    expect(html).toContain('aria-label="Randomize Portrait"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it("renders disabled with a reason when not allowed", () => {
    const html = renderToStaticMarkup(
      createElement(PortraitRandomizeButton, {
        onClick: () => {},
        allowed: false,
        deniedReason: "Not your jockey",
      }),
    );
    expect(html).toMatch(/\sdisabled(=|\s|>)/);
    expect(html).toContain("Not your jockey");
  });
});
