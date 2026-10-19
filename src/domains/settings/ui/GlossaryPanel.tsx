import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Search, BookOpen } from "lucide-react";
import { JARGON_DEFINITIONS } from "@/domains/horse/application/horseFacade";

export function GlossaryPanel() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTerms = Object.entries(JARGON_DEFINITIONS).filter(([term, definition]) => {
    const query = searchQuery.toLowerCase();
    return term.toLowerCase().includes(query) || definition.toLowerCase().includes(query);
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-foreground font-[family-name:var(--font-display)] flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Glossary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-white/10 text-foreground placeholder:text-foreground/40"
          />
        </div>

        {filteredTerms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No terms match your search
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTerms.map(([term, definition]) => (
              <div key={term} className="border border-white/5 rounded-md p-3 bg-card/50">
                <span className="font-semibold text-foreground text-sm">{term}</span>
                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
