import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, Search } from "lucide-react";

interface RaceFilterPanelProps {
  q: string;
  onSearchChange: (value: string) => void;
  grade: string;
  onGradeChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  owned: string;
  onOwnedChange: (value: string) => void;
  countries: string[];
  onReset: () => void;
}

export function RaceFilterPanel({
  q,
  onSearchChange,
  grade,
  onGradeChange,
  country,
  onCountryChange,
  owned,
  onOwnedChange,
  countries,
  onReset,
}: RaceFilterPanelProps) {
  const searchId = useId();
  const gradeId = useId();
  const regionId = useId();
  return (
    <aside className="space-y-8 sticky top-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Filter className="h-3.5 w-3.5 text-success/60" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
            Race Filters
          </h2>
        </div>
        <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-success/40">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor={searchId}
                className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1"
              >
                Race Name
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream/20" />
                <Input
                  id={searchId}
                  placeholder="Search races..."
                  className="h-9 bg-slate-950/60 border-white/5 text-xs font-mono pl-8 uppercase tracking-tighter focus-visible:ring-success/30"
                  value={q}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={gradeId}
                className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1"
              >
                Grade
              </label>
              <Select value={grade} onValueChange={onGradeChange}>
                <SelectTrigger
                  id={gradeId}
                  className="h-9 bg-slate-950/60 border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest"
                >
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="G1">Grade 1</SelectItem>
                  <SelectItem value="G2">Grade 2</SelectItem>
                  <SelectItem value="G3">Grade 3</SelectItem>
                  <SelectItem value="Graded">All Graded</SelectItem>
                  <SelectItem value="Ungraded">Ungraded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={regionId}
                className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1"
              >
                Region
              </label>
              <Select value={country} onValueChange={onCountryChange}>
                <SelectTrigger
                  id={regionId}
                  className="h-9 bg-slate-950/60 border-white/5 text-[10px] font-bold uppercase rounded-none tracking-widest"
                >
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all">All Regions</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c} className="uppercase">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-success/40 tracking-widest px-1">
                My Entries
              </label>
              <div className="grid grid-cols-1 gap-1">
                {(["all", "owned", "others"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => onOwnedChange(o)}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-left transition-all border-l-2 ${
                      owned === o
                        ? "bg-white/5 border-success text-success"
                        : "border-transparent text-cream/20 hover:text-cream/40"
                    }`}
                  >
                    {o === "all" ? "All Races" : o === "owned" ? "My Entries" : "Other Races"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-cream/10 hover:text-cream/30 border border-dashed border-white/5 mt-2"
              onClick={onReset}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      </section>
    </aside>
  );
}
