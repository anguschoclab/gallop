import type { Meta, StoryObj } from "@storybook/react";
import { BeyerBadge } from "@/domains/race/ui/BeyerBadge";

const meta: Meta<typeof BeyerBadge> = {
  title: "Components/Race/BeyerBadge",
  component: BeyerBadge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    beyer: { control: { type: "range", min: 40, max: 120, step: 1 } },
    showLabel: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof BeyerBadge>;

export const Elite: Story = { args: { beyer: 104 } };
export const Excellent: Story = { args: { beyer: 93 } };
export const Good: Story = { args: { beyer: 82 } };
export const Fair: Story = { args: { beyer: 72 } };
export const Poor: Story = { args: { beyer: 55 } };
export const NumberOnly: Story = { args: { beyer: 88, showLabel: false } };

export const AllTiers: Story = {
  render: () => (
    <div className="flex gap-3 items-center">
      <BeyerBadge beyer={104} />
      <BeyerBadge beyer={93} />
      <BeyerBadge beyer={82} />
      <BeyerBadge beyer={72} />
      <BeyerBadge beyer={55} />
    </div>
  ),
};
