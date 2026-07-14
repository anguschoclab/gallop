import { describe, it, expect } from "vitest";
import { screen, render } from "@testing-library/react";
import { HorseDetailHeader } from "@/components/horse/HorseDetailHeader";
import { LotDetailPanel } from "@/components/auction/LotDetailPanel";
import { ParentStatsPanel } from "@/components/breeding/ParentStatsPanel";
import { SireSelector } from "@/components/breeding/SireSelector";
import { DamSelector } from "@/components/breeding/DamSelector";
import { createTestHorse } from "@/tests/helpers";
import type { AuctionLot, Stable } from "@/game/types";

describe("Bruce Lowe family display — no raw codes", () => {
  describe("HorseDetailHeader", () => {
    it("renders 'Family 3' when bruceLoweFamily is 3", () => {
      const horse = createTestHorse({ bruceLoweFamily: 3 });
      render(<HorseDetailHeader horse={horse} ovr={75} />);
      expect(screen.getByText(/Family 3/)).toBeDefined();
      expect(screen.queryByText(/BL_3/)).toBeNull();
    });

    it("renders 'Family —' when bruceLoweFamily is undefined", () => {
      const horse = createTestHorse({ bruceLoweFamily: undefined });
      render(<HorseDetailHeader horse={horse} ovr={75} />);
      expect(screen.getByText(/Family —/)).toBeDefined();
      expect(screen.queryByText(/BL_/)).toBeNull();
    });
  });

  describe("LotDetailPanel", () => {
    it("renders 'Family 5' not 'FAMILY_05'", () => {
      const horse = createTestHorse({ bruceLoweFamily: 5 });
      const lot = {
        id: "lot-1",
        horseId: horse.id,
        saleId: "sale-1",
        startingPrice: 10000,
        hammerPrice: 0,
        passed: false,
        bids: [],
      } as unknown as AuctionLot;
      render(
        <LotDetailPanel
          lot={lot}
          horse={horse}
          consignor={undefined}
          displayStats={null}
          displayOverallEstimate={undefined}
          isResolved={false}
          isPlayerLeading={false}
          isPlayerConsigned={false}
          lotIndex={0}
          totalLots={1}
        />,
      );
      expect(screen.getByText(/Family 5/)).toBeDefined();
      expect(screen.queryByText(/FAMILY_0/)).toBeNull();
    });
  });

  describe("ParentStatsPanel", () => {
    it("renders 'Family 7' not 'BL7'", () => {
      const sire = createTestHorse({
        id: "sire-1",
        name: "Sire Horse",
        bruceLoweFamily: 7,
      });
      const dam = createTestHorse({
        id: "dam-1",
        name: "Dam Horse",
        bruceLoweFamily: 2,
      });
      const { container } = render(<ParentStatsPanel sire={sire} dam={dam} />);
      const allText = container.textContent ?? "";
      expect(allText).toContain("Family 7");
      expect(allText).not.toContain("BL7");
    });
  });

  describe("SireSelector", () => {
    it("renders 'Family 4' in option text, not 'BL4'", () => {
      const stallion = createTestHorse({
        id: "stallion-1",
        name: "Top Stallion",
        bruceLoweFamily: 4,
        stud: { standingFee: 50000 } as any,
      });
      const { container } = render(
        <SireSelector
          sireId=""
          onChange={() => {}}
          availableStallions={[stallion]}
        />,
      );
      const allText = container.textContent ?? "";
      expect(allText).toContain("Family 4");
      expect(allText).not.toContain("BL4");
    });
  });

  describe("DamSelector", () => {
    it("renders 'Family 6' in option text, not 'BL6'", () => {
      const mare = createTestHorse({
        id: "mare-1",
        name: "Broodmare",
        bruceLoweFamily: 6,
      });
      const { container } = render(
        <DamSelector
          damId=""
          onChange={() => {}}
          femalesToBreed={[mare]}
        />,
      );
      const allText = container.textContent ?? "";
      expect(allText).toContain("Family 6");
      expect(allText).not.toContain("BL6");
    });
  });
});
