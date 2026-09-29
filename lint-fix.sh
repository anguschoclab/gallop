#!/bin/bash

# Fixing src/components/insights/ScoutingInsightsPanel.tsx
sed -i 's|import { buildRealCareerInsightRow } from "@/core/horse/insightMetrics";|import { buildRealCareerInsightRow } from "@/services/horse/insightMetricsService";|g' src/components/insights/ScoutingInsightsPanel.tsx
if ! grep -q "insightMetricsService" src/components/insights/ScoutingInsightsPanel.tsx; then
  echo "Failed to replace in ScoutingInsightsPanel.tsx, need to check where it should be imported from."
fi

# Fixing src/components/stable/RivalCareerCompareTable.tsx
sed -i 's|import type { RivalCareerProfile } from "@/core/npc/rivalCareerCompare";|import type { RivalCareerProfile } from "@/services/npc/rivalCareerCompareService";|g' src/components/stable/RivalCareerCompareTable.tsx

# Fixing src/components/stable/RivalCareerMilestoneTimeline.tsx
sed -i 's|import { gameCalendarDate } from "@/core/calendar/dateFormatting";|import { gameCalendarDate } from "@/services/calendar/dateFormattingService";|g' src/components/stable/RivalCareerMilestoneTimeline.tsx
sed -i 's|import type { RivalMilestoneRecord } from "@/core/npc/rivalCareerCompare";|import type { RivalMilestoneRecord } from "@/services/npc/rivalCareerCompareService";|g' src/components/stable/RivalCareerMilestoneTimeline.tsx
