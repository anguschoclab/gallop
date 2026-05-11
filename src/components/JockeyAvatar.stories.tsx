import type { Meta, StoryObj } from "@storybook/react";
import {
  JockeyAvatar,
  SIZE_MAP,
  JOCKEY_AVATAR_ASPECT,
  type JockeyAvatarSize,
} from "./JockeyAvatar";

const stubJockey = {
  id: "test-jockey-1",
  age: 28,
  archetype: "versatile" as const,
  silk: { pattern: "solid" as const, primary: "#ff0000", secondary: "#ffffff", cap: "#0000ff" },
};

const meta: Meta<typeof JockeyAvatar> = {
  title: "Components/JockeyAvatar",
  component: JockeyAvatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"] as JockeyAvatarSize[],
      description: "Size variant from SIZE_MAP",
    },
    rounded: {
      control: "select",
      options: ["md", "lg", "full"] as const,
      description: "Border radius variant",
    },
  },
};

export default meta;
type Story = StoryObj<typeof JockeyAvatar>;

export const Default: Story = {
  args: {
    jockey: stubJockey,
    size: "md",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-8 items-end">
      {(["xs", "sm", "md", "lg", "xl"] as JockeyAvatarSize[]).map((size) => {
        const { w, h } = SIZE_MAP[size];
        return (
          <div key={size} className="flex flex-col items-center gap-2">
            <JockeyAvatar jockey={stubJockey} size={size} />
            <div className="text-xs text-muted-foreground space-y-1 text-center font-mono">
              <div className="font-bold uppercase">{size}</div>
              <div>
                {w}×{h}px
              </div>
              <div className="text-[10px]">Ratio: {(w / h).toFixed(2)}</div>
            </div>
          </div>
        );
      })}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All size variants demonstrating the 5:6 aspect ratio invariant.",
      },
    },
  },
};

export const RoundedVariants: Story = {
  render: () => (
    <div className="flex gap-8 items-end">
      {(["md", "lg", "full"] as const).map((rounded) => (
        <div key={rounded} className="flex flex-col items-center gap-2">
          <JockeyAvatar jockey={stubJockey} size="md" rounded={rounded} />
          <div className="text-xs text-muted-foreground text-center font-mono">
            <div className="font-bold uppercase">{rounded}</div>
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All rounded variants demonstrating border radius options.",
      },
    },
  },
};

export const NarrowContainer: Story = {
  render: () => (
    <div className="w-[100px] h-[120px] bg-muted rounded border border-border flex items-center justify-center overflow-hidden">
      <JockeyAvatar jockey={stubJockey} size="xl" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Tests that the avatar scales down without overflowing narrow containers (max-width:100%).",
      },
    },
  },
};

export const FlexContainer: Story = {
  render: () => (
    <div className="flex gap-2 bg-muted rounded border border-border p-2 overflow-hidden">
      <JockeyAvatar jockey={stubJockey} size="xs" />
      <JockeyAvatar jockey={stubJockey} size="sm" />
      <JockeyAvatar jockey={stubJockey} size="md" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Tests that multiple avatars fit in flex containers without overflow.",
      },
    },
  },
};

export const GridContainer: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-2 bg-muted rounded border border-border p-2">
      <JockeyAvatar jockey={stubJockey} size="sm" />
      <JockeyAvatar jockey={stubJockey} size="sm" />
      <JockeyAvatar jockey={stubJockey} size="sm" />
      <JockeyAvatar jockey={stubJockey} size="sm" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Tests that avatars fit properly in grid cells.",
      },
    },
  },
};

export const SizingReference: Story = {
  render: () => (
    <div className="bg-card p-4 rounded-lg border border-border space-y-2 text-sm font-mono">
      <div className="flex gap-4">
        <span className="w-16 text-muted-foreground">SIZE_MAP:</span>
        <pre className="flex-1 bg-muted p-2 rounded overflow-x-auto text-xs">
          {JSON.stringify(SIZE_MAP, null, 2)}
        </pre>
      </div>
      <div className="flex gap-4">
        <span className="w-16 text-muted-foreground">ASPECT:</span>
        <span>{JOCKEY_AVATAR_ASPECT}</span>
      </div>
      <div className="flex gap-4">
        <span className="w-16 text-muted-foreground">Expected:</span>
        <span>0.8333... (5:6)</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Reference display of the sizing tokens and aspect ratio invariant.",
      },
    },
  },
};
