#!/bin/bash

# Fixing src/components/insights/ScoutingInsightsPanel.tsx - layer violation
# need to check if there is a facade/service wrapping this core logic, or just ignore for now if it's the only one. Wait, we should fix it.
sed -i 's|import { buildRealCareerInsightRow } from "@/core/horse/insightMetrics";|import { buildRealCareerInsightRow } from "@/services/horse/insightMetricsService";|g' src/components/insights/ScoutingInsightsPanel.tsx

# Fixing src/components/stable/RivalCareerCompareTable.tsx
sed -i 's|import type { RivalCareerProfile } from "@/core/npc/rivalCareerCompare";|import type { RivalCareerProfile } from "@/services/npc/rivalCareerCompareService";|g' src/components/stable/RivalCareerCompareTable.tsx

# Fixing src/components/stable/RivalCareerMilestoneTimeline.tsx
sed -i 's|import { gameCalendarDate } from "@/core/calendar/dateFormatting";|import { gameCalendarDate } from "@/services/calendar/calendarFacade";|g' src/components/stable/RivalCareerMilestoneTimeline.tsx
sed -i 's|import type { RivalMilestoneRecord } from "@/core/npc/rivalCareerCompare";|import type { RivalMilestoneRecord } from "@/services/npc/rivalCareerCompareService";|g' src/components/stable/RivalCareerMilestoneTimeline.tsx
