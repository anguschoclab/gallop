import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./Sparkline";

const meta: Meta<typeof Sparkline> = {
  title: "Components/Charts/Sparkline",
  component: Sparkline,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["line", "area"] },
    height: { control: { type: "range", min: 24, max: 120, step: 4 } },
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

const CLIMB = [42, 45, 44, 48, 52, 55, 53, 58, 62, 66];
const DECLINE = [80, 76, 78, 72, 68, 70, 64, 60, 58, 55];
const VOLATILE = [50, 62, 41, 75, 38, 70, 55, 80, 46, 66];

export default meta;
type Story = StoryObj<typeof Sparkline>;

export const Area: Story = { args: { data: CLIMB, variant: "area" } };
export const Line: Story = { args: { data: CLIMB, variant: "line" } };
export const Declining: Story = { args: { data: DECLINE, variant: "area", color: "#e05555" } };
export const Volatile: Story = { args: { data: VOLATILE, variant: "line" } };
export const Empty: Story = { args: { data: [], variant: "area" } };
