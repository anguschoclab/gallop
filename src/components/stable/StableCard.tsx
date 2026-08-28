import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { getReputationStars } from "@/core/stable/uiHelpers";
import { stableTierColor } from "@/core/common/uiTokens";
import { CashPressureBadge } from "./CashPressureBadge";
import type { Stable } from "@/core/stable/types";

const BOOKMARK_TOP_OFFSET = "top-2";
const BOOKMARK_RIGHT_OFFSET = "right-2";
const COLOR_SWATCH_SIZE = "w-8 h-8";

export function StableCard({ stable }: { stable: Stable }) {
  return (
    <div className="relative h-full">
      <div className={`absolute ${BOOKMARK_TOP_OFFSET} ${BOOKMARK_RIGHT_OFFSET} z-10`}>
        <BookmarkButton
          type="stable"
          id={stable.id}
          label={stable.name}
          subtitle={`${stable.country} · ${stable.tier}`}
        />
      </div>
      <Link to="/npc-stables/$stableId" params={{ stableId: stable.id }}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-gold-muted">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`${COLOR_SWATCH_SIZE} rounded-full border-2`}
                  style={{
                    backgroundColor: stable.colors.primary,
                    borderColor: stable.colors.secondary,
                  }}
                />
                <div>
                  <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                    {stable.name}
                  </CardTitle>
                  <p className="text-sm text-cream-muted">{stable.country}</p>
                </div>
              </div>
              <Badge className={stableTierColor(stable.tier)}>{stable.tier}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-cream-muted mb-3 line-clamp-2">
              {stable.description ||
                `${stable.owner}'s racing operation with ${stable.horses.length} horses.`}
            </p>
            <div className="mb-3">
              <CashPressureBadge stable={stable} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream-muted">{stable.horses.length} horses</span>
              <span className="text-fame" title={`Reputation: ${stable.reputation}`}>
                {getReputationStars(stable.reputation)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
