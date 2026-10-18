import type { Meta, StoryObj } from "@storybook/react";
import { CashPressureBadge } from "@/domains/stable/ui/CashPressureBadge";
import { createTestStable } from "@/tests/helpers/createTestStable";

const meta: Meta<typeof CashPressureBadge> = {
  title: "Components/Stable/CashPressureBadge",
  component: CashPressureBadge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CashPressureBadge>;

const stable = (cash: number) =>
  createTestStable({ id: "sb-stable", name: "Storybook Stable", cash });

export const Flush: Story = {
  args: { stable: stable(2_000_000) },
};

export const Tight: Story = {
  args: { stable: stable(80_000) },
};

export const Desperate: Story = {
  args: { stable: stable(5_000) },
};

export const WithOfferContext: Story = {
  args: { stable: stable(40_000), ask: 120_000, offerAmount: 60_000 },
};
