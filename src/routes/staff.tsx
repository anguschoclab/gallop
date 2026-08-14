import { createFileRoute } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/core/common/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { Users, Search, Filter } from "lucide-react";
import { NumericValue } from "@/components/horse/HorseBits";
import { useMemo, useState } from "react";
import { getG1WinsForStable, countByGrade } from "@/core/awards/connectionTrophies";
import { generateUUID } from "@/core/uuid";
import type { StaffRole, StaffTier } from "@/core/staff/staffTypes";
import { StaffNegotiationDialog } from "@/components/staff/StaffNegotiationDialog";
import { StaffTeamList } from "@/components/staff/StaffTeamList";
import { RecruitmentPool } from "@/components/staff/RecruitmentPool";
import { STAFF_TRAIT_OPTIONS } from "@/core/common/traitLabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/staff")({
  component: StaffManagement,
});

function StaffManagement() {
  const enqueueIntent = useGame((s) => s.enqueueIntent);
  const day = useGame((s) => s.day);
  const { hiredStaff, staffPool } = useGameWithShallow((s) => ({
    hiredStaff: s.hiredStaff,
    staffPool: s.staffPool,
  }));
  const horses = useGameWithShallow((s) => s.horses);
  const races = useGameWithShallow((s) => s.races);
  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [traitFilter, setTraitFilter] = useState<string>("all");

  const myStaff = hiredStaff?.filter((s) => s.stableId === "") ?? [];
  const staffMap = useMemo(() => new Map(staffPool.map((s) => [s.id, s])), [staffPool]);

  const stableG1Wins = useMemo(() => getG1WinsForStable({ horses }, undefined), [horses, races]);
  const honorCounts = useMemo(() => countByGrade(stableG1Wins), [stableG1Wins]);
  const showHonors = (role: string) => role === "trainer" || role === "groom";

  const handleFire = (staff: { id: string; role: string; tier: string; salary: number }) => {
    enqueueIntent({
      id: generateUUID(),
      entityId: staff.id,
      source: "player",
      day,
      priority: 100,
      type: "staff",
      action: "fire",
      stableId: "",
      staffId: staff.id,
      role: staff.role as StaffRole,
      tier: staff.tier as StaffTier,
      salary: staff.salary,
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Staff Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Users className="h-3.5 w-3.5" />
            Stable Staff
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Our Staff
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Active Team: <NumericValue value={myStaff.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Recruitment Pool: <NumericValue value={staffPool.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Season Day: <NumericValue value={day} />
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-muted" />
            <Input
              placeholder="Search name or trait..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] pl-8"
            />
          </div>
          <Select value={traitFilter} onValueChange={setTraitFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_TRAIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 bg-blue-500/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            Access: Manager
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <StaffTeamList
          staff={myStaff}
          honorCounts={honorCounts}
          showHonors={myStaff.some((s) => showHonors(s.role)) && stableG1Wins.length > 0}
          onFire={handleFire}
          search={search}
          traitFilter={traitFilter}
        />
        <RecruitmentPool
          staffPool={staffPool}
          day={day}
          onNegotiate={setNegotiatingId}
          search={search}
          traitFilter={traitFilter}
        />
      </div>

      {negotiatingId &&
        (() => {
          const staff = staffMap.get(negotiatingId);
          return staff ? (
            <StaffNegotiationDialog
              staff={staff}
              isOpen={true}
              onClose={() => setNegotiatingId(null)}
            />
          ) : null;
        })()}
    </div>
  );
}
