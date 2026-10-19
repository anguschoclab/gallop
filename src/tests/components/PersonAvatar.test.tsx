/**
 * PersonAvatar.test.tsx - Sized person avatar contracts
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  PersonAvatar,
  PERSON_AVATAR_SIZE_MAP,
  PERSON_AVATAR_ASPECT,
  type PersonAvatarSize,
} from "@/domains/person/ui/PersonAvatar";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const identity = createStubPersonIdentity({ id: "avatar-test", displayName: "Avatar Test" });
const SIZES: PersonAvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
const SILK = { primary: "#ff0000", secondary: "#ffffff", cap: "#0000ff", pattern: "hoops" };

describe("PersonAvatar", () => {
  it("exposes a 5:6 aspect invariant and conforming size map", () => {
    for (const s of SIZES) {
      const { w, h } = PERSON_AVATAR_SIZE_MAP[s];
      expect(w / h).toBeCloseTo(PERSON_AVATAR_ASPECT, 2);
    }
  });

  it("renders deterministic markup for the same identity/context", () => {
    const render = () =>
      renderToStaticMarkup(createElement(PersonAvatar, { identity, context: "owner-formal" }));
    expect(render()).toBe(render());
  });

  it("renders at every size with an accessible label", () => {
    for (const size of SIZES) {
      const html = renderToStaticMarkup(createElement(PersonAvatar, { identity, size }));
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain('role="img"');
      expect(html).toContain("Avatar Test portrait");
    }
  });

  it("decorative mode hides the image from assistive tech", () => {
    const html = renderToStaticMarkup(createElement(PersonAvatar, { identity, decorative: true }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("Avatar Test portrait");
  });

  it("same identity renders the same face across contexts", () => {
    const casual = renderToStaticMarkup(
      createElement(PersonAvatar, { identity, context: "jockey-casual" }),
    );
    const formal = renderToStaticMarkup(
      createElement(PersonAvatar, { identity, context: "owner-formal" }),
    );
    // Face path is identical in both renders — only wardrobe/framing differ.
    const facePath = /d="(M[^"]*Z)"[^>]*fill="#e0ac69"/.exec(casual)?.[1];
    expect(facePath).toBeDefined();
    expect(formal).toContain(facePath);
  });

  it("racewear context binds real silk colors", () => {
    const html = renderToStaticMarkup(
      createElement(PersonAvatar, {
        identity,
        context: "jockey-racewear",
        silk: SILK,
      }),
    );
    expect(html).toContain("#ff0000");
  });

  it("silk reroll does not alter facial markup", () => {
    const a = renderToStaticMarkup(
      createElement(PersonAvatar, {
        identity,
        context: "jockey-racewear",
        silk: { ...SILK, primary: "#111111" },
      }),
    );
    const b = renderToStaticMarkup(
      createElement(PersonAvatar, {
        identity,
        context: "jockey-racewear",
        silk: { ...SILK, primary: "#222222" },
      }),
    );
    const facePath = /d="(M[^"]*Z)"[^>]*fill="#e0ac69"/.exec(a)?.[1];
    expect(b).toContain(facePath);
  });
});
