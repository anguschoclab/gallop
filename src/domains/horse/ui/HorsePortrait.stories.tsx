import type { Meta, StoryObj } from "@storybook/react";
import { HorsePortrait } from "@/domains/horse/ui/HorsePortrait";
import {
  generateAppearanceDNA,
  getPalette,
  hashSeed,
} from "@/domains/horse/application/horseFacade";
import type { CoatColor, FaceWhite } from "@/platform/game/types";

const COATS: CoatColor[] = [
  "bay",
  "dark-bay",
  "black",
  "chestnut",
  "liver-chestnut",
  "seal-brown",
  "gray",
  "white",
  "roan",
  "palomino",
  "buckskin",
  "dun",
  "grulla",
  "champagne",
];

const FACES: FaceWhite[] = ["none", "star", "blaze", "bald"];

const meta: Meta<typeof HorsePortrait> = {
  title: "Components/HorsePortrait",
  component: HorsePortrait,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HorsePortrait>;

export const CoatMatrix: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      {COATS.map((coat) => (
        <div key={coat} className="flex flex-col items-center gap-1">
          <HorsePortrait
            id={`coat-${coat}`}
            coatColor={coat}
            markings={{ socks: "none", face: "none" }}
            gender="horse"
            size="sm"
            className="w-24 h-24"
          />
          <div className="text-[10px] font-mono text-muted-foreground">{coat}</div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "All coat colors rendered with deterministic painterly DNA." },
    },
  },
};

export const MarkingMatrix: Story = {
  render: () => (
    <div className="flex gap-6 items-end">
      {FACES.map((face) => (
        <div key={face} className="flex flex-col items-center gap-1">
          <HorsePortrait
            id={`face-${face}`}
            coatColor="bay"
            markings={{ socks: "none", face }}
            gender="mare"
            size="sm"
            className="w-28 h-28"
          />
          <div className="text-[10px] font-mono text-muted-foreground">{face}</div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Face-marking variants on a common bay coat." },
    },
  },
};

export const Hero: Story = {
  render: () => {
    const dna = generateAppearanceDNA(
      hashSeed("hero-horse"),
      { socks: "sock", face: "blaze" },
      getPalette("gray"),
    );
    return (
      <HorsePortrait
        id="hero-horse"
        coatColor="gray"
        markings={{ socks: "sock", face: "blaze" }}
        gender="horse"
        appearance={dna}
        size="lg"
        className="w-48 h-48"
      />
    );
  },
};
