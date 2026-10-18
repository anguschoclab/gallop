import type { Meta, StoryObj } from "@storybook/react";
import { ReputationBadge } from "@/domains/shell/ui/ReputationBadge";
import { withGameState } from "@/test-utils/storyDecorators";
import {
  getReputationTier,
  type ManagerReputation,
} from "@/domains/reputation/application/reputationFacade";

const meta: Meta<typeof ReputationBadge> = {
  title: "Components/ReputationBadge",
  component: ReputationBadge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ReputationBadge>;

function reputation(score: number): ManagerReputation {
  return {
    score,
    tier: getReputationTier(score),
    events: [],
    gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
    totalWins: 0,
    yearsActive: 1,
  };
}

function reputationStory(score: number): Story {
  return { decorators: [withGameState({ reputation: reputation(score) })] };
}

export const Unknown: Story = reputationStory(50);
export const Rising: Story = reputationStory(300);
export const Renowned: Story = reputationStory(700);
export const Legendary: Story = reputationStory(950);
