import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEffect, useState } from "react";
import { expectedBeyer } from "@/game/beyer";
import { getCountry } from "@/game/gradedRaces";
import { Calendar, List, Users } from "lucide-react";
import { RaceDetailPanel } from "@/components/RaceDetailPanel";
import { calculateOverallRating } from "@/core/horse/stats";
import { getGradeColorClass } from "@/core/race/grading";
import { isGenderEligible } from "@/core/horse/gender";
import type { Race, Horse } from "@/game/types";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateClassBonus } from "@/core/common/classBonus";
import { loadRaceFilters, saveRaceFilters } from "@/services/storageAdapter";
import { getFilteredRaces } from "@/services/raceFilterService";
import type { RaceFilters } from "@/core/race/filtering";
import { getScoutStatus } from "@/game/scouting";

type GradeFilter = "all" | "G1" | "G2" | "G3";
const GRADE_FILTERS: GradeFilter[] = ["all", "G1", "G2", "G3"];

type CountryFilter = "all" | "Canada" | "UAE" | "Argentina" | "Brazil" | "Chile" | "Sweden" | "Norway" | "Denmark" | "Japan" | "Italy" | "Hong Kong" | "Great Britain" | "France" | "Ireland" | "Germany" | "Turkey" | "Austria" | "Belgium" | "Czech Republic" | "Hungary" | "Spain";
const COUNTRY_FILTERS: CountryFilter[] = ["all", "Canada", "UAE", "Argentina", "Brazil", "Chile", "Sweden", "Norway", "Denmark", "Japan", "Italy", "Hong Kong", "Great Britain", "France", "Ireland", "Germany", "Turkey", "Austria", "Belgium", "Czech Republic", "Hungary", "Spain"];

type SurfaceFilter = "all" | "Turf" | "Dirt" | "Synthetic";
const SURFACE_FILTERS: SurfaceFilter[] = ["all", "Turf", "Dirt", "Synthetic"];

type OwnedFilter = "all" | "yes";
const OWNED_FILTERS: OwnedFilter[] = ["all", "yes"];

type TrackFilter = "all" | "Woodbine" | "Fort Erie" | "Century Mile" | "Hastings" | "Meydan" | "Abu Dhabi" | "Jebel Ali" | "Hipódromo de San Isidro" | "Hipódromo Argentino de Palermo" | "Hipódromo de La Plata" | "Hipódromo da Gávea" | "Hipódromo Cidade Jardim" | "Valparaiso Sporting Club" | "Club Hípico de Santiago" | "Hipódromo Chile" | "Bro Park" | "Øvrevoll" | "Klampenborg" | "Jägersro" | "Tokyo" | "Chukyo" | "Hanshin" | "Nakayama" | "Kyoto" | "Kanazawa" | "Monbetsu" | "Nagoya" | "Sonoda" | "Capannelle" | "San Siro" | "Sha Tin" | "Happy Valley" | "Newmarket" | "Newmarket (July)" | "Newbury" | "Epsom" | "Ascot" | "Sandown" | "York" | "Haydock" | "Chester" | "Doncaster" | "Goodwood" | "Saint-Cloud" | "Longchamp" | "Deauville" | "Chantilly" | "Vichy" | "Toulouse" | "Curragh" | "Leopardstown" | "Navan" | "Naas" | "Düsseldorf" | "Cologne" | "Baden-Baden" | "Hanover" | "Krefeld" | "Veliefendi" | "Vienna" | "Klagenfurt" | "Ostend" | "Mons" | "Prague" | "Most" | "Karlovy Vary" | "Kincsem Park" | "Madrid" | "San Sebastián" | "Dos Hermanas";
const TRACK_FILTERS: TrackFilter[] = ["all", "Woodbine", "Fort Erie", "Century Mile", "Hastings", "Meydan", "Abu Dhabi", "Jebel Ali", "Hipódromo de San Isidro", "Hipódromo Argentino de Palermo", "Hipódromo de La Plata", "Hipódromo da Gávea", "Hipódromo Cidade Jardim", "Valparaiso Sporting Club", "Club Hípico de Santiago", "Hipódromo Chile", "Bro Park", "Øvrevoll", "Klampenborg", "Jägersro", "Tokyo", "Chukyo", "Hanshin", "Nakayama", "Kyoto", "Kanazawa", "Monbetsu", "Nagoya", "Sonoda", "Capannelle", "San Siro", "Sha Tin", "Happy Valley", "Newmarket", "Newmarket (July)", "Newbury", "Epsom", "Ascot", "Sandown", "York", "Haydock", "Chester", "Doncaster", "Goodwood", "Saint-Cloud", "Longchamp", "Deauville", "Chantilly", "Vichy", "Toulouse", "Curragh", "Leopardstown", "Navan", "Naas", "Düsseldorf", "Cologne", "Baden-Baden", "Hanover", "Krefeld", "Veliefendi", "Vienna", "Klagenfurt", "Ostend", "Mons", "Prague", "Most", "Karlovy Vary", "Kincsem Park", "Madrid", "San Sebastián", "Dos Hermanas"];

export const Route = createFileRoute("/races")({
  component: RacesPage,
  validateSearch: (search: Record<string, unknown>): { grade: GradeFilter; country: CountryFilter; surface: SurfaceFilter; track: TrackFilter; owned: OwnedFilter } => {
    const g = search.grade;
    const c = search.country;
    const s = search.surface;
    const t = search.track;
    const o = search.owned;
    return {
      grade: GRADE_FILTERS.includes(g as GradeFilter) ? (g as GradeFilter) : "all",
      country: COUNTRY_FILTERS.includes(c as CountryFilter) ? (c as CountryFilter) : "all",
      surface: SURFACE_FILTERS.includes(s as SurfaceFilter) ? (s as SurfaceFilter) : "all",
      track: TRACK_FILTERS.includes(t as TrackFilter) ? (t as TrackFilter) : "all",
      owned: OWNED_FILTERS.includes(o as OwnedFilter) ? (o as OwnedFilter) : "all",
    };
  },
});


function CalendarView({ upcoming, day, horses, cash, enterRace, withdrawRace, pregnantIds, navigate }: {
  upcoming: Race[];
  day: number;
  horses: Horse[];
  cash: number;
  enterRace: (raceId: string, horseId: string) => void;
  withdrawRace: (raceId: string, horseId: string) => void;
  pregnantIds: Set<string>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // Group races by day
  const racesByDay = upcoming.reduce((acc: Record<number, Race[]>, race: Race) => {
    if (!acc[race.day]) {
      acc[race.day] = [];
    }
    acc[race.day].push(race);
    return acc;
  }, {} as Record<number, Race[]>);

  const sortedDays = Object.keys(racesByDay).map(Number).sort((a, b) => a - b);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming races match this filter.</p>;
  }

  return (
    <div className="space-y-6">
      {sortedDays.map((raceDay) => (
        <div key={raceDay}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">
              Day {raceDay}
              {raceDay === day && <Badge variant="default" className="ml-2">Today</Badge>}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {racesByDay[raceDay].map((race: Race) => {
              const ownedEntry = race.entries.find((e: { owned: boolean }) => e.owned);
              const npcEntryCount = race.entries.filter((e: { npc?: boolean }) => e.npc).length;
              const eligible = horses.filter((horse: Horse) =>
                isHorseEligibleForRace(horse, race, pregnantIds)
              );
              const canRun = race.day === day && ownedEntry;
              const gradeColor = race.graded?.grade ? getGradeColorClass(race.graded.grade) : "";

              return (
                <Card key={race.id} className={race.graded ? "border-l-4 border-l-primary" : undefined}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold">{race.name}</h4>
                          {race.graded ? (
                            <Badge variant="outline" className={gradeColor}>{race.graded.grade}</Badge>
                          ) : (
                            <Badge variant="outline">{race.raceClass}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{race.distance}m · {race.graded ? `${race.graded.track} · ${race.graded.surface}` : race.raceClass}</div>
                          <div>Purse <span className="font-medium text-foreground">${race.purse.toLocaleString()}</span> · Entry ${race.entryFee}</div>
                          <div className="flex items-center gap-2">
                            <span>{race.entries.length}/{race.fieldSize} entered</span>
                            {npcEntryCount > 0 && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {npcEntryCount} rival{npcEntryCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {race.minStat && <div>Min OVR {race.minStat}</div>}
                          {race.restrictions?.minAge === race.restrictions?.maxAge && race.restrictions?.minAge !== undefined && <div>{race.restrictions.minAge}YO only</div>}
                          {race.restrictions?.minAge !== undefined && race.restrictions?.maxAge === undefined && <div>{race.restrictions.minAge}+ YO</div>}
                        </div>
                      </div>
                      {race.graded && <RaceDetailPanel race={race} />}
                      <BeyerExpectations race={race} horses={horses} />
                      <div className="pt-2 border-t">
                        {ownedEntry ? (
                          <div className="flex flex-col gap-2">
                            <Badge variant="secondary" className="w-fit">
                              {horses.find((h) => h.id === ownedEntry.horseId)?.name} entered
                            </Badge>
                            <div className="flex gap-2">
                              {canRun && (
                                <Button size="sm" onClick={() => navigate({ to: "/race/$raceId", params: { raceId: race.id } })}>
                                  Run race
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => withdrawRace(race.id, ownedEntry.horseId)}>
                                Withdraw
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <EntryPicker
                            eligible={eligible}
                            disabled={cash < race.entryFee || race.entries.length >= race.fieldSize}
                            onEnter={(hid) => enterRace(race.id, hid)}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RacesPage() {
  const navigate = useNavigate();
  const { grade, country, surface, track, owned } = Route.useSearch();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Restore last-used filter when arriving with no explicit search param.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("grade") || !url.searchParams.has("country") || !url.searchParams.has("surface") || !url.searchParams.has("track") || !url.searchParams.has("owned")) {
      const savedFilters = loadRaceFilters();
      const savedGrade = savedFilters.grade as GradeFilter | null;
      const savedCountry = savedFilters.country as CountryFilter | null;
      const savedSurface = savedFilters.surface as SurfaceFilter | null;
      const savedTrack = savedFilters.track as TrackFilter | null;
      const savedOwned = savedFilters.owned as OwnedFilter | null;
      if ((savedGrade && savedGrade !== "all" && GRADE_FILTERS.includes(savedGrade)) ||
          (savedCountry && savedCountry !== "all" && COUNTRY_FILTERS.includes(savedCountry)) ||
          (savedSurface && savedSurface !== "all" && SURFACE_FILTERS.includes(savedSurface)) ||
          (savedTrack && savedTrack !== "all" && TRACK_FILTERS.includes(savedTrack)) ||
          (savedOwned && savedOwned !== "all" && OWNED_FILTERS.includes(savedOwned))) {
        navigate({ to: "/races", search: { grade: savedGrade || "all", country: savedCountry || "all", surface: savedSurface || "all", track: savedTrack || "all", owned: savedOwned || "all" }, replace: true });
      }
    }
  }, [navigate]);

  // Persist current selection.
  useEffect(() => {
    saveRaceFilters({ grade, country, surface, track, owned });
  }, [grade, country, surface, track, owned]);

  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const enterRace = useGame((s) => s.enterRace);
  const withdrawRace = useGame((s) => s.withdrawRace);
  const pregnancies = useGame((s) => s.pregnancies);
  const pregnantIds = new Set(pregnancies.filter((p) => !p.resolved).map((p) => p.damId));

  const filters: RaceFilters = {
    grade: grade === "all" ? undefined : grade,
    track: track === "all" ? undefined : track,
    tripleCrown: undefined,
    class: undefined,
  };

  let { upcoming, past } = getFilteredRaces({ races, currentDay: day }, filters);
  if (owned === "yes") {
    upcoming = upcoming.filter((r) => r.entries.some((e) => e.owned));
    past = past.filter((r) => r.entries.some((e) => e.owned));
  }

  const filterLabel: Record<GradeFilter, string> = { all: "All races", G1: "G1 only", G2: "G2 only", G3: "G3 only" };
  const surfaceLabel: Record<SurfaceFilter, string> = { all: "All surfaces", Turf: "Turf", Dirt: "Dirt", Synthetic: "Synthetic" };
  const countryLabel: Record<CountryFilter, string> = {
    all: "All countries",
    Canada: "Canada",
    UAE: "UAE",
    Argentina: "Argentina",
    Brazil: "Brazil",
    Chile: "Chile",
    Sweden: "Sweden",
    Norway: "Norway",
    Denmark: "Denmark",
    Japan: "Japan",
    Italy: "Italy",
    "Hong Kong": "Hong Kong",
    "Great Britain": "Great Britain",
    France: "France",
    Ireland: "Ireland",
    Germany: "Germany",
    Turkey: "Turkey",
    Austria: "Austria",
    Belgium: "Belgium",
    "Czech Republic": "Czech Republic",
    Hungary: "Hungary",
    Spain: "Spain"
  };
  const trackLabel: Record<TrackFilter, string> = {
    all: "All tracks",
    Woodbine: "Woodbine",
    "Fort Erie": "Fort Erie",
    "Century Mile": "Century Mile",
    Hastings: "Hastings",
    Meydan: "Meydan",
    "Abu Dhabi": "Abu Dhabi",
    "Jebel Ali": "Jebel Ali",
    "Hipódromo de San Isidro": "Hipódromo de San Isidro",
    "Hipódromo Argentino de Palermo": "Hipódromo Argentino de Palermo",
    "Hipódromo de La Plata": "Hipódromo de La Plata",
    "Hipódromo da Gávea": "Hipódromo da Gávea",
    "Hipódromo Cidade Jardim": "Hipódromo Cidade Jardim",
    "Valparaiso Sporting Club": "Valparaiso Sporting Club",
    "Club Hípico de Santiago": "Club Hípico de Santiago",
    "Hipódromo Chile": "Hipódromo Chile",
    "Bro Park": "Bro Park",
    Øvrevoll: "Øvrevoll",
    Klampenborg: "Klampenborg",
    Jägersro: "Jägersro",
    Tokyo: "Tokyo",
    Chukyo: "Chukyo",
    Hanshin: "Hanshin",
    Nakayama: "Nakayama",
    Kyoto: "Kyoto",
    Kanazawa: "Kanazawa",
    Monbetsu: "Monbetsu",
    Nagoya: "Nagoya",
    Sonoda: "Sonoda",
    Capannelle: "Capannelle",
    "San Siro": "San Siro",
    "Sha Tin": "Sha Tin",
    "Happy Valley": "Happy Valley",
    Newmarket: "Newmarket",
    "Newmarket (July)": "Newmarket (July)",
    Newbury: "Newbury",
    Epsom: "Epsom",
    Ascot: "Ascot",
    Sandown: "Sandown",
    York: "York",
    Haydock: "Haydock",
    Chester: "Chester",
    Doncaster: "Doncaster",
    Goodwood: "Goodwood",
    "Saint-Cloud": "Saint-Cloud",
    Longchamp: "Longchamp",
    Deauville: "Deauville",
    Chantilly: "Chantilly",
    Vichy: "Vichy",
    Toulouse: "Toulouse",
    Curragh: "Curragh",
    Leopardstown: "Leopardstown",
    Navan: "Navan",
    Naas: "Naas",
    Düsseldorf: "Düsseldorf",
    Cologne: "Cologne",
    "Baden-Baden": "Baden-Baden",
    Hanover: "Hanover",
    Krefeld: "Krefeld",
    Veliefendi: "Veliefendi",
    Vienna: "Vienna",
    Klagenfurt: "Klagenfurt",
    Ostend: "Ostend",
    Mons: "Mons",
    Prague: "Prague",
    Most: "Most",
    "Karlovy Vary": "Karlovy Vary",
    "Kincsem Park": "Kincsem Park",
    Madrid: "Madrid",
    "San Sebastián": "San Sebastián",
    "Dos Hermanas": "Dos Hermanas"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Race Calendar</h1>
          <p className="text-muted-foreground">Enter your horses to compete</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={country} onValueChange={(c) => navigate({ to: "/races", search: { grade, country: c as CountryFilter, surface, track } })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_FILTERS.map((c) => (
                <SelectItem key={c} value={c}>{countryLabel[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={track} onValueChange={(t) => navigate({ to: "/races", search: { grade, country, surface, track: t as TrackFilter } })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select track" />
            </SelectTrigger>
            <SelectContent>
              {TRACK_FILTERS.map((t) => (
                <SelectItem key={t} value={t}>{trackLabel[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-md border bg-card p-1">
            {GRADE_FILTERS.map((g) => (
              <Link
                key={g}
                to="/races"
                search={{ grade: g, country, surface, track }}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                  grade === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filterLabel[g]}
              </Link>
            ))}
          </div>
          <div className="inline-flex rounded-md border bg-card p-1">
            {SURFACE_FILTERS.map((s) => (
              <Link
                key={s}
                to="/races"
                search={{ grade, country, surface: s, track }}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                  surface === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {surfaceLabel[s]}
              </Link>
            ))}
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "list" | "calendar")}>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view">
              <Calendar className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Regional Calendars */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">Regional Racing Calendars</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/canadian-calendar">
              <Button size="sm" variant="outline">Canadian</Button>
            </Link>
            <Link to="/uae-calendar">
              <Button size="sm" variant="outline">UAE</Button>
            </Link>
            <Link to="/south-american-calendar">
              <Button size="sm" variant="outline">South American</Button>
            </Link>
            <Link to="/german-calendar">
              <Button size="sm" variant="outline">German</Button>
            </Link>
            <Link to="/scandinavian-calendar">
              <Button size="sm" variant="outline">Scandinavian</Button>
            </Link>
            <Link to="/race-browser">
              <Button size="sm" variant="default">Race Browser</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming races match this filter.</p>
          )}
          {upcoming.map((race) => {
          const ownedEntry = race.entries.find((e) => e.owned);
          const r = race.restrictions;
          const eligible = horses.filter((horse: Horse) =>
            isHorseEligibleForRace(horse, race, pregnantIds)
          );
          const canRun = race.day === day && ownedEntry;
          const gradeColor = race.graded?.grade ? getGradeColorClass(race.graded.grade) : "";

          return (
            <Card key={race.id} className={race.graded ? "border-l-4 border-l-primary" : undefined}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold">{race.name}</h3>
                      {race.graded ? (
                        <Badge variant="outline" className={gradeColor}>{race.graded.grade}</Badge>
                      ) : (
                        <Badge variant="outline">{race.raceClass}</Badge>
                      )}
                      {race.day === day && <Badge variant="default">Today</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Day {race.day}</span>
                      <span>{race.distance}m</span>
                      {race.graded && <span>{race.graded.track} · {race.graded.surface}</span>}
                      <span>Purse <span className="font-medium text-foreground">${race.purse.toLocaleString()}</span></span>
                      <span>Entry ${race.entryFee}</span>
                      <span>{race.entries.length}/{race.fieldSize} entered</span>
                      {race.minStat && <span>Min OVR {race.minStat}</span>}
                      {r?.minAge === r?.maxAge && r?.minAge !== undefined && <span>{r.minAge}YO only</span>}
                      {r?.minAge !== undefined && r?.maxAge === undefined && <span>{r.minAge}+ YO</span>}
                    </div>
                    {race.graded && <RaceDetailPanel race={race} />}
                    <BeyerExpectations race={race} horses={horses} />
                  </div>
                  <div className="flex flex-col gap-2 items-end min-w-[200px]">
                    {ownedEntry ? (
                      <>
                        <Badge variant="secondary">
                          {horses.find((h) => h.id === ownedEntry.horseId)?.name} entered
                        </Badge>
                        <div className="flex gap-2">
                          {canRun && (
                            <Button size="sm" onClick={() => navigate({ to: "/race/$raceId", params: { raceId: race.id } })}>
                              Run race
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => withdrawRace(race.id, ownedEntry.horseId)}>
                            Withdraw
                          </Button>
                        </div>
                      </>
                    ) : (
                      <EntryPicker
                        eligible={eligible}
                        disabled={cash < race.entryFee || race.entries.length >= race.fieldSize}
                        onEnter={(hid) => enterRace(race.id, hid)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      ) : (
        <CalendarView
          upcoming={upcoming}
          day={day}
          horses={horses}
          cash={cash}
          enterRace={enterRace}
          withdrawRace={withdrawRace}
          pregnantIds={pregnantIds}
          navigate={navigate}
        />
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {past.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span><span className="text-muted-foreground">D{r.day}</span> · {r.name}</span>
                <span className="text-muted-foreground">
                  Winner: {horses.find((h) => h.id === r.result?.[0]?.horseId)?.name ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EntryPicker({ eligible, disabled, onEnter }: { eligible: { id: string; name: string; energy: number }[]; disabled: boolean; onEnter: (id: string) => void }) {
  const [selected, setSelected] = useState<string | undefined>();
  if (eligible.length === 0) {
    return <p className="text-xs text-muted-foreground">No eligible horses</p>;
  }
  return (
    <div className="flex gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pick horse" /></SelectTrigger>
        <SelectContent>
          {eligible.map((h) => (
            <SelectItem key={h.id} value={h.id}>{h.name} (⚡{h.energy})</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!selected || disabled} onClick={() => selected && onEnter(selected)}>
        Enter
      </Button>
    </div>
  );
}

function BeyerExpectations({ race, horses }: { race: { distance: number; entries: { horseId: string }[]; graded?: { grade: "G1" | "G2" | "G3" }; raceClass: import("@/game/types").RaceClass }; horses: { id: string; name: string; owned: boolean; stats: { speed: number; stamina: number; acceleration: number; consistency: number }; energy: number; form: number; raceHistory: { beyer?: number }[] }[] }) {
  const entered = race.entries
    .map((e) => horses.find((h) => h.id === e.horseId))
    .filter((h): h is NonNullable<typeof h> => !!h);
  if (entered.length === 0) return null;

  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

  const projections = entered.map((h) => {
    // Blend model expectation with recent Beyer average for stability.
    const model = expectedBeyer(h as never, race.distance, classBonus);
    const recent = h.raceHistory.slice(0, 3).map((r) => r.beyer).filter((b): b is number => typeof b === "number");
    const avgRecent = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : null;
    const proj = avgRecent !== null ? Math.round(model * 0.6 + avgRecent * 0.4) : model;
    return { h, proj };
  }).sort((a, b) => b.proj - a.proj);

  const top = projections[0];
  const owned = projections.find((p) => p.h.owned);
  const fav = top.h.owned
    ? `Your ${top.h.name} projects best at ~${top.proj} Beyer.`
    : owned
    ? `${top.h.name} is favored (~${top.proj}); your ${owned.h.name} projects ~${owned.proj}.`
    : `${top.h.name} projects best at ~${top.proj} Beyer.`;

  return (
    <div className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-yellow-700 dark:text-yellow-400">Beyer expectations</span>
        <span className="text-muted-foreground">{race.distance}m projection</span>
      </div>
      <p className="text-foreground/80 mb-1">{fav}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
        {projections.slice(0, 5).map(({ h, proj }) => (
          <span key={h.id} className={h.owned ? "font-medium text-foreground" : ""}>
            {h.name} <span className="tabular-nums">{proj}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
