import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { CategoryIcon as ApacCategoryIcon } from "@/assets/awards/asia-pacific/category";
import { HotyIcon as ApacHotyIcon } from "@/assets/awards/asia-pacific/hoty";
import { CategoryIcon as EuCategoryIcon } from "@/assets/awards/europe/category";
import { HotyIcon as EuHotyIcon } from "@/assets/awards/europe/hoty";
import { CategoryIcon as NaCategoryIcon } from "@/assets/awards/north-america/category";
import { HotyIcon as NaHotyIcon } from "@/assets/awards/north-america/hoty";
import { CategoryIcon as SaCategoryIcon } from "@/assets/awards/south-america/category";
import { HotyIcon as SaHotyIcon } from "@/assets/awards/south-america/hoty";

const ICONS = [
  { name: "APAC Category", Icon: ApacCategoryIcon, isHoty: false, gradFrom: "#006400", gradTo: "#004d00" },
  { name: "APAC HOTY", Icon: ApacHotyIcon, isHoty: true, gradFrom: "#006400", gradTo: "#004d00" },
  { name: "EU Category", Icon: EuCategoryIcon, isHoty: false, gradFrom: "#4B0082", gradTo: "#2D0052" },
  { name: "EU HOTY", Icon: EuHotyIcon, isHoty: true, gradFrom: "#4B0082", gradTo: "#2D0052" },
  { name: "NA Category", Icon: NaCategoryIcon, isHoty: false, gradFrom: "#1E3A5F", gradTo: "#0D2137" },
  { name: "NA HOTY", Icon: NaHotyIcon, isHoty: true, gradFrom: "#1E3A5F", gradTo: "#0D2137" },
  { name: "SA Category", Icon: SaCategoryIcon, isHoty: false, gradFrom: "#8B0000", gradTo: "#5C0000" },
  { name: "SA HOTY", Icon: SaHotyIcon, isHoty: true, gradFrom: "#8B0000", gradTo: "#5C0000" },
];

describe("award icon components", () => {
  for (const { name, Icon, isHoty, gradFrom, gradTo } of ICONS) {
    describe(`${name} icon`, () => {
      it("renders valid SVG markup with viewBox 0 0 48 48", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        expect(html).toContain("<svg");
        expect(html).toContain('viewBox="0 0 48 48"');
      });

      it("renders a <circle> background element", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        expect(html).toContain("<circle");
      });

      it("renders <linearGradient> with correct gradient stop colors", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        expect(html).toContain("<linearGradient");
        expect(html).toContain(`stop-color="${gradFrom}"`);
        expect(html).toContain(`stop-color="${gradTo}"`);
      });

      it("renders a <title> element", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        expect(html).toContain("<title>");
      });

      it("contains HOTY text if it is a HOTY icon", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        if (isHoty) {
          expect(html).toContain("HOTY");
        } else {
          expect(html).toContain("Category");
        }
      });

      it("produces deterministic output for same props", () => {
        const a = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        const b = renderToStaticMarkup(createElement(Icon, { width: 48, height: 48 }));
        expect(a).toBe(b);
      });

      it("passes width and height to the svg element", () => {
        const html = renderToStaticMarkup(createElement(Icon, { width: 64, height: 64 }));
        expect(html).toContain('width="64"');
        expect(html).toContain('height="64"');
      });
    });
  }
});
