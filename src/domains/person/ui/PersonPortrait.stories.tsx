import type { Meta, StoryObj } from "@storybook/react";
import {
  PersonAvatar,
  PERSON_AVATAR_SIZE_MAP,
  type PersonAvatarSize,
} from "@/domains/person/ui/PersonAvatar";
import { PersonProfileHero } from "@/domains/person/ui/PersonProfileHero";
import { PortraitRandomizeButton } from "@/domains/person/ui/PortraitRandomizeButton";
import { generatePersonIdentity } from "@/domains/person/application/personFacade";
import type { PersonRole, PortraitContext } from "@/domains/person/model/types";

const ROLE_CONTEXT: Record<PersonRole, PortraitContext> = {
  owner: "owner-formal",
  jockey: "jockey-racewear",
  trainer: "staff",
  veterinarian: "staff",
  farrier: "staff",
  nutritionist: "staff",
  groom: "staff",
};

const SILK = { primary: "#b91c1c", secondary: "#f8fafc", cap: "#f8fafc", pattern: "hoops" };

const ROLES: PersonRole[] = [
  "owner",
  "jockey",
  "trainer",
  "veterinarian",
  "farrier",
  "nutritionist",
  "groom",
];

const SIZES: PersonAvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

function identityFor(seedId: string, role: PersonRole, name: string) {
  return generatePersonIdentity({ id: seedId, displayName: name, role, ageBand: "adult" });
}

const meta: Meta<typeof PersonAvatar> = {
  title: "Components/PersonAvatar",
  component: PersonAvatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PersonAvatar>;

export const RoleMatrix: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-6 items-end">
      {ROLES.map((role) => {
        const identity = identityFor(`matrix-${role}`, role, `${role} Example`);
        return (
          <div key={role} className="flex flex-col items-center gap-2">
            <PersonAvatar
              identity={identity}
              context={ROLE_CONTEXT[role]}
              size="lg"
              silk={role === "jockey" ? SILK : null}
            />
            <div className="text-xs font-mono uppercase text-muted-foreground">{role}</div>
          </div>
        );
      })}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Representative identities across all person roles and portrait contexts.",
      },
    },
  },
};

export const SizeMatrix: Story = {
  render: () => (
    <div className="flex gap-6 items-end">
      {SIZES.map((size) => {
        const { w, h } = PERSON_AVATAR_SIZE_MAP[size];
        return (
          <div key={size} className="flex flex-col items-center gap-2">
            <PersonAvatar
              identity={identityFor("size-demo", "owner", "Size Demo")}
              context="owner-yard"
              size={size}
            />
            <div className="text-xs font-mono text-muted-foreground">
              {size} {w}×{h}
            </div>
          </div>
        );
      })}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "All avatar sizes preserve the 5:6 aspect contract." },
    },
  },
};

export const VarietyMatrix: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {Array.from({ length: 12 }, (_, i) => {
        const identity = identityFor(`variety-${i}`, "owner", `Person ${i + 1}`);
        return <PersonAvatar key={i} identity={identity} context="owner-formal" size="md" />;
      })}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Twelve generated identities showing appearance variety." },
    },
  },
};

export const Hero: Story = {
  render: () => (
    <div className="w-[560px] bg-slate-950 p-6 border border-white/5">
      <PersonProfileHero
        identity={identityFor("hero-owner", "owner", "Alexandra Whitfield")}
        role="owner"
        context="owner-formal"
        day={120}
        subtitle="Whitfield Racing"
      >
        <PortraitRandomizeButton onClick={() => {}} />
      </PersonProfileHero>
    </div>
  ),
};
