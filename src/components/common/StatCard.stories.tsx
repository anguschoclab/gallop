import type { Meta, StoryObj } from "@storybook/react";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
  title: "Components/Common/StatCard",
  component: StatCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "lg", "xl"] },
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: { label: "Career Earnings", value: "$1,240,500", sub: "24 starts" },
};

export const Small: Story = {
  args: { label: "Win Rate", value: "33%", sub: "8 of 24", size: "sm" },
};

export const ExtraLarge: Story = {
  args: { label: "Purse", value: "$2,000,000", sub: "Grade 1", size: "xl" },
};

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3 w-[36rem]">
      <StatCard label="Starts" value="24" sub="all surfaces" size="sm" />
      <StatCard label="Wins" value="8" sub="33% strike rate" size="sm" />
      <StatCard label="Earnings" value="$1.24M" sub="lifetime" size="sm" />
    </div>
  ),
};
