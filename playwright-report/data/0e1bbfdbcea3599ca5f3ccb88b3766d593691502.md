# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — desktop >> dashboard matches baseline
- Location: src/tests/e2e/visual.spec.ts:53:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/dashboard-desktop-chromium-linux.png, writing actual.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to content" [ref=e3] [cursor=pointer]:
      - /url: "#main-content"
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - heading "Gallop" [level=1] [ref=e6]
        - paragraph [ref=e7]: Jan 2, 2026
      - generic [ref=e8]:
        - generic [ref=e9]:
          - button "Headquarters" [expanded] [ref=e10]
          - region "Headquarters" [ref=e14]:
            - link "Dashboard" [ref=e16] [cursor=pointer]:
              - /url: /
            - link "Inbox" [ref=e23] [cursor=pointer]:
              - /url: /inbox
            - link "Briefing" [ref=e29] [cursor=pointer]:
              - /url: /briefing
            - link "Gazette" [ref=e35] [cursor=pointer]:
              - /url: /gazette
            - link "Recap" [ref=e41] [cursor=pointer]:
              - /url: /recap
            - link "Analytics" [ref=e47] [cursor=pointer]:
              - /url: /analytics
            - link "Finances" [ref=e52] [cursor=pointer]:
              - /url: /financial-report
            - link "Bookmarks" [ref=e57] [cursor=pointer]:
              - /url: /bookmarks
        - button "My Stable" [ref=e62]
        - button "The World" [ref=e67]
        - button "Configuration" [ref=e72]
      - generic [ref=e76]:
        - generic [ref=e77]:
          - paragraph [ref=e78]: Cash
          - paragraph [ref=e79]: $100,000
          - paragraph [ref=e80]: 2888 horses
          - generic [ref=e81]:
            - button "Advance 1 day" [ref=e82]
            - button "Advance 1 week" [ref=e83]: 7d
            - button "Advance 1 month" [ref=e84]: 30d
            - button "AutoSim settings" [ref=e85]
          - generic [ref=e86]:
            - button "Skip to next auction" [ref=e87]: Next Auction
            - button "Skip to next race" [ref=e88]: Next Race
        - button "Start new game" [ref=e89]
    - main [ref=e90]:
      - generic [ref=e92]:
        - generic [ref=e94]:
          - heading "Command Center" [level=1] [ref=e95]
          - generic [ref=e96]:
            - generic [ref=e97]: Jan 2, 2026
            - generic [ref=e98]: Unranked
        - region "Next action" [ref=e106]:
          - 'link "Advance to the next day: Nothing needs your attention — move the season forward" [ref=e107] [cursor=pointer]':
            - /url: /
            - generic [ref=e113]:
              - paragraph [ref=e114]: Next up
              - paragraph [ref=e115]: Advance to the next day
              - paragraph [ref=e116]: Nothing needs your attention — move the season forward
        - generic [ref=e119]:
          - generic [ref=e121]:
            - generic [ref=e122]:
              - generic [ref=e123]: The Gallop Gazette
              - generic [ref=e128]: Edition 1
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - generic [ref=e132]: flavor
                  - 'heading "First Look: E2E Test Stables Enters the Competition" [level=3] [ref=e133]'
                  - paragraph [ref=e134]: A fresh face joins the fray as E2E Test Stables officially commences racing operations. Under the guidance of Test Owner, they are a stable to watch.
                - generic [ref=e135]:
                  - generic [ref=e136]: racing
                  - 'heading "The Top 5: Early Season Power Rankings" [level=3] [ref=e137]'
                  - paragraph [ref=e138]:
                    - generic [ref=e139]:
                      - text: "Who's leading the pack? The early power rankings tell the story: 1."
                      - link "Spiral Stakes of A" [ref=e140] [cursor=pointer]:
                        - /url: /stable/a798e46e-9b73-4557-aa0f-8e86f197f2b0
                      - text: (0 OVR) 2.
                      - link "Pride of Blue Gras" [ref=e141] [cursor=pointer]:
                        - /url: /stable/cb9aebe5-02a3-4fc1-8616-2092870f3098
                      - text: (0 OVR) 3. Arkansas
                      - link "Derby" [ref=e142] [cursor=pointer]:
                        - /url: /stable/a15931f2-264d-4b70-8334-3f0329d01517
                      - text: of (0 OVR) 4.
                      - link "Texas Star" [ref=e143] [cursor=pointer]:
                        - /url: /stable/56c50384-395b-4401-baa6-cf66b3cda053
                      - text: (0 OVR) 5.
                      - link "Monmouth Gotham" [ref=e144] [cursor=pointer]:
                        - /url: /stable/425a499d-110f-4744-80a7-b0fda31c9134
                      - text: (0 OVR). Each of these runners has the class to dominate on the biggest days.
              - link "Full Coverage" [ref=e146] [cursor=pointer]:
                - /url: /gazette
          - generic [ref=e149]:
            - generic [ref=e150]:
              - generic [ref=e151]: Stable Overview
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - generic [ref=e157]:
                    - generic [ref=e158]: Liquidity
                    - generic [ref=e159]: $100,000
                  - generic [ref=e160]:
                    - generic [ref=e161]: Roster
                    - generic [ref=e162]:
                      - text: "4"
                      - generic [ref=e163]: Active
                - generic [ref=e164]:
                  - generic [ref=e165]:
                    - generic [ref=e166]: Stable Capacity
                    - generic [ref=e167]: Usage
                  - generic [ref=e168]:
                    - generic [ref=e170]:
                      - generic [ref=e171]: Mating
                      - generic [ref=e174]: 0 / 10
                    - generic [ref=e177]:
                      - generic [ref=e178]: Staffing
                      - generic [ref=e182]: 0 / 12
                    - generic [ref=e185]:
                      - generic [ref=e186]: Syndicates
                      - generic [ref=e189]: "0"
            - generic [ref=e191]:
              - generic [ref=e192]: Recent Activity
              - generic [ref=e197]:
                - generic [ref=e198]:
                  - generic [ref=e200]: stable
                  - generic [ref=e201]: The Hill 'n' Dale Farms Threat
                  - generic [ref=e202]: Day 1
                - generic [ref=e203]:
                  - generic [ref=e205]: stable
                  - generic [ref=e206]: "Shadai Stallion Station: A Force to Be Reckoned With"
                  - generic [ref=e207]: Day 1
                - generic [ref=e208]:
                  - generic [ref=e210]: stable
                  - generic [ref=e211]: Who Is Gainsborough Farm?
                  - generic [ref=e212]: Day 1
                - generic [ref=e213]:
                  - generic [ref=e215]: stable
                  - generic [ref=e216]: "Gainesway Farm: A Force to Be Reckoned With"
                  - generic [ref=e217]: Day 1
                - generic [ref=e218]:
                  - generic [ref=e220]: stable
                  - generic [ref=e221]: "Profiling the Enemy: Godolphin"
                  - generic [ref=e222]: Day 1
                - link "View All" [ref=e223] [cursor=pointer]:
                  - /url: /gazette
        - generic [ref=e226]:
          - generic [ref=e227]:
            - generic [ref=e228]: Key Rivals
            - generic [ref=e234]: No bitter rivals yet — keep winning.
          - generic [ref=e236]:
            - generic [ref=e237]:
              - generic [ref=e238]: H.Q. Ops
              - link "Go to H.Q. Ops financial report" [ref=e245] [cursor=pointer]:
                - /url: /financial-report
                - button "Go to H.Q. Ops financial report" [ref=e246]
            - generic [ref=e247]:
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - generic [ref=e250]: Facility Health
                  - generic [ref=e251]: Rank
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - generic [ref=e254]: Main Training Track
                    - generic [ref=e255]: LVL 1
                  - generic [ref=e256]:
                    - generic [ref=e257]: Stable Barn
                    - generic [ref=e258]: LVL 1
                  - generic [ref=e259]:
                    - generic [ref=e260]: Exercise Pool
                    - generic [ref=e261]: LVL 1
                - generic [ref=e262]: Reputation Ledger
              - generic [ref=e264]:
                - link [ref=e265] [cursor=pointer]:
                  - /url: /facilities
                  - button "Manage Horses" [ref=e266]
                - link [ref=e267] [cursor=pointer]:
                  - /url: /settings
                  - button "Configuration" [ref=e268]
          - generic [ref=e269]:
            - generic [ref=e270]:
              - generic [ref=e271]: Stable & Roster
              - link "Go to Stable & Roster" [ref=e279] [cursor=pointer]:
                - /url: /stable
                - button "Go to Stable & Roster" [ref=e280]
            - generic [ref=e281]:
              - generic [ref=e282]:
                - generic [ref=e283]:
                  - generic [ref=e284]: Top Stable Stars
                  - generic [ref=e285]: OVR
                - generic [ref=e286]:
                  - link "Northern Journey 40 E100" [ref=e287] [cursor=pointer]:
                    - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6
                    - generic [ref=e288]:
                      - generic [ref=e289]: Northern Journey
                      - generic [ref=e292]:
                        - generic [ref=e293]: "40"
                        - generic [ref=e294]: E100
                  - link "The Northern Hero 40 E100" [ref=e295] [cursor=pointer]:
                    - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168
                    - generic [ref=e296]:
                      - generic [ref=e297]: The Northern Hero
                      - generic [ref=e300]:
                        - generic [ref=e301]: "40"
                        - generic [ref=e302]: E100
                  - link "Bandit of Lucky 39 E100" [ref=e303] [cursor=pointer]:
                    - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293
                    - generic [ref=e304]:
                      - generic [ref=e305]: Bandit of Lucky
                      - generic [ref=e308]:
                        - generic [ref=e309]: "39"
                        - generic [ref=e310]: E100
                - generic [ref=e311]:
                  - generic [ref=e312]:
                    - generic [ref=e313]: Personnel Brief
                    - link "Roster" [ref=e314] [cursor=pointer]:
                      - /url: /jockeys
                  - generic [ref=e315]:
                    - generic [ref=e316]: Active Jockeys
                    - generic [ref=e323]: "0"
                  - generic [ref=e324]:
                    - generic [ref=e325]: Support Staff
                    - generic [ref=e330]: "0"
              - generic [ref=e331]:
                - link [ref=e332] [cursor=pointer]:
                  - /url: /horse-gallery
                  - button "Horse Gallery" [ref=e333]
                - link [ref=e334] [cursor=pointer]:
                  - /url: /breeding
                  - button "Breeding Ops" [ref=e335]
          - generic [ref=e336]:
            - generic [ref=e337]:
              - generic [ref=e338]: The Circuit
              - link "Go to The Circuit races" [ref=e344] [cursor=pointer]:
                - /url: /races?grade=all&country=all&surface=all&track=all&owned=all&q=
                - button "Go to The Circuit races" [ref=e345]
            - generic [ref=e346]:
              - generic [ref=e347]:
                - generic [ref=e348]:
                  - generic [ref=e349]: Upcoming Races
                  - generic [ref=e350]: D / P
                - generic [ref=e351]:
                  - generic [ref=e352]:
                    - generic [ref=e353]:
                      - link "Hialeah Classic" [ref=e355] [cursor=pointer]:
                        - /url: /race/4142dd10-13e2-41fd-8a2b-daa4c7a0428f
                      - generic [ref=e356]: 1700m · StarterAllowance
                    - generic [ref=e357]:
                      - generic [ref=e358]: D1
                      - text: $5,000
                  - generic [ref=e359]:
                    - generic [ref=e360]:
                      - link "Tokyo Trophy" [ref=e362] [cursor=pointer]:
                        - /url: /race/3c5d2bbb-864f-4b3c-9800-60b459818231
                      - generic [ref=e363]: 2000m · Stakes
                    - generic [ref=e364]:
                      - generic [ref=e365]: D1
                      - text: $18,000
                  - generic [ref=e366]:
                    - generic [ref=e367]:
                      - link "Epsom Cup" [ref=e369] [cursor=pointer]:
                        - /url: /race/293af24d-5fd6-47ce-bc46-924b1d35537f
                      - generic [ref=e370]: 1000m · Maiden
                    - generic [ref=e371]:
                      - generic [ref=e372]: D2
                      - text: $2,000
                - generic [ref=e373]:
                  - generic [ref=e374]:
                    - generic [ref=e375]: Global Markets
                    - link "Sire Watch" [ref=e376] [cursor=pointer]:
                      - /url: /stallions
                  - generic [ref=e377]:
                    - generic [ref=e378]: Daily Market
                    - generic [ref=e384]: Active
                  - generic [ref=e385]:
                    - generic [ref=e386]: Public Auctions
                    - generic [ref=e394]: 0 Open
              - generic [ref=e395]:
                - link [ref=e396] [cursor=pointer]:
                  - /url: /market
                  - button "Claiming Market" [ref=e397]
                - link [ref=e398] [cursor=pointer]:
                  - /url: /auction
                  - button "Auction Block" [ref=e399]
          - generic [ref=e400]:
            - generic [ref=e402]:
              - generic [ref=e403]: Reputation
              - generic [ref=e410]: Unranked
            - generic [ref=e411]:
              - generic [ref=e412]:
                - generic [ref=e413]:
                  - generic [ref=e414]: Reputation Score
                  - generic [ref=e415]: "0"
                - generic [ref=e417]:
                  - generic [ref=e418]:
                    - generic [ref=e419]: Total Wins
                    - generic [ref=e420]: "0"
                  - generic [ref=e421]:
                    - generic [ref=e422]: G1 Wins
                    - generic [ref=e423]: "0"
                  - generic [ref=e424]:
                    - generic [ref=e425]: Years Active
                    - generic [ref=e426]: "0"
              - generic [ref=e427]:
                - generic [ref=e428]: Graded Stakes Wins
                - generic [ref=e429]:
                  - generic [ref=e430]:
                    - generic [ref=e431]: G1
                    - generic [ref=e432]: "0"
                  - generic [ref=e433]:
                    - generic [ref=e434]: G2
                    - generic [ref=e435]: "0"
                  - generic [ref=e436]:
                    - generic [ref=e437]: G3
                    - generic [ref=e438]: "0"
                  - generic [ref=e439]:
                    - generic [ref=e440]: Listed
                    - generic [ref=e441]: "0"
          - generic [ref=e442]:
            - generic [ref=e444]:
              - generic [ref=e445]: Prestige
              - generic [ref=e448]: Provincial
            - generic [ref=e449]:
              - generic [ref=e450]:
                - generic [ref=e451]:
                  - generic [ref=e452]: Prestige score
                  - generic [ref=e453]: 0/100
                - meter "Stable prestige 0 of 100, Provincial" [ref=e454]
                - generic [ref=e459]:
                  - generic [ref=e460]: Provincial
                  - generic [ref=e461]: World class
              - generic [ref=e462]:
                - generic [ref=e463]:
                  - generic [ref=e464]: Overall
                  - generic [ref=e465]:
                    - text: "#133"
                    - generic [ref=e466]: / 133
                  - generic [ref=e467]: Top 100%
                - generic [ref=e468]:
                  - generic [ref=e469]: vs Houses
                  - generic [ref=e470]:
                    - text: "#7"
                    - generic [ref=e471]: / 7
                  - generic [ref=e472]: Auction rings
                - generic [ref=e473]:
                  - generic [ref=e474]: vs Courses
                  - generic [ref=e475]:
                    - text: "#127"
                    - generic [ref=e476]: / 127
                  - generic [ref=e477]: Racecourses
              - generic [ref=e478]:
                - generic [ref=e479]:
                  - generic [ref=e480]: Vienna
                  - generic [ref=e484]:
                    - generic [ref=e485]: "#132"
                    - generic [ref=e486]: "14"
                - generic [ref=e487]:
                  - generic [ref=e488]: E2E Test Stables
                  - generic [ref=e492]:
                    - generic [ref=e493]: "#133"
                    - generic [ref=e494]: "0"
              - paragraph [ref=e495]: Prestige tracks your reputation on the venue scale — win graded races, trade well and underwrite syndicates to climb.
        - generic [ref=e496]:
          - generic [ref=e497]:
            - heading "Regional Trends" [level=2] [ref=e504]
            - generic [ref=e505]:
              - generic [ref=e506]:
                - generic [ref=e507]: Window
                - group "Analytics time window" [ref=e508]:
                  - button "4 wks" [ref=e509]
                  - button "8 wks" [ref=e510]
                  - button "12 wks" [pressed] [ref=e511]
                  - button "26 wks" [ref=e512]
                  - button "52 wks" [ref=e513]
                  - button "All time" [ref=e514]
              - link "Full comparison" [ref=e515] [cursor=pointer]:
                - /url: /regional-comparison
          - generic [ref=e516]: No starts in the last 12 wks — regional trends appear after you race.
        - generic [ref=e517]:
          - generic [ref=e518]:
            - generic [ref=e519]:
              - generic [ref=e520]: Season Standings
              - generic [ref=e529]: "You: #1"
            - generic [ref=e531]:
              - tablist [ref=e532]:
                - tab "Earnings" [selected] [ref=e533]
                - tab "Wealth" [ref=e540]
              - tabpanel "Earnings" [ref=e546]:
                - generic [ref=e547]:
                  - button "7D" [ref=e548]
                  - button "30D" [ref=e549]
                  - button "90D" [ref=e550]
                - table [ref=e553]:
                  - rowgroup [ref=e554]:
                    - row [ref=e555]:
                      - columnheader "#" [ref=e556]
                      - columnheader "Stable" [ref=e557]
                      - columnheader "30D Earnings" [ref=e558]
                      - columnheader "Trend" [ref=e559]
                  - rowgroup [ref=e560]:
                    - row [ref=e561] [cursor=pointer]:
                      - cell "1" [ref=e562]
                      - cell "E2E Test Stables" [ref=e563]
                      - cell "$0" [ref=e567]
                      - cell [ref=e568]
                    - row [ref=e571] [cursor=pointer]:
                      - cell "2" [ref=e572]
                      - cell [ref=e573]:
                        - link "Hill 'n' Dale Farms" [ref=e577]:
                          - /url: /npc-stables/4f71470d-b229-4dc9-aa1e-3f099e70c528
                      - cell "$0" [ref=e578]
                      - cell [ref=e579]
                    - row [ref=e582] [cursor=pointer]:
                      - cell "3" [ref=e583]
                      - cell [ref=e584]:
                        - link "Shadai Stallion Station" [ref=e588]:
                          - /url: /npc-stables/b0ed1fe4-78b7-4a54-96b7-26150370e17e
                      - cell "$0" [ref=e589]
                      - cell [ref=e590]
                    - row [ref=e593] [cursor=pointer]:
                      - cell "4" [ref=e594]
                      - cell [ref=e595]:
                        - link "Gainsborough Farm" [ref=e599]:
                          - /url: /npc-stables/3f2a822e-cc55-4d6f-9d7a-1535c57df360
                      - cell "$0" [ref=e600]
                      - cell [ref=e601]
                    - row [ref=e604] [cursor=pointer]:
                      - cell "5" [ref=e605]
                      - cell [ref=e606]:
                        - link "Gainesway Farm" [ref=e610]:
                          - /url: /npc-stables/786f5f48-ffc0-41fc-8a57-244a083f2b82
                      - cell "$0" [ref=e611]
                      - cell [ref=e612]
                    - row [ref=e615] [cursor=pointer]:
                      - cell "6" [ref=e616]
                      - cell [ref=e617]:
                        - link "Godolphin" [ref=e621]:
                          - /url: /npc-stables/ab70a00b-e542-4ab3-8d35-10a5d3eaa168
                      - cell "$0" [ref=e622]
                      - cell [ref=e623]
                    - row [ref=e626] [cursor=pointer]:
                      - cell "7" [ref=e627]
                      - cell [ref=e628]:
                        - link "Sackatoga Stable" [ref=e632]:
                          - /url: /npc-stables/9ba27ab7-f38d-42b3-b040-2bb47ef30b97
                      - cell "$0" [ref=e633]
                      - cell [ref=e634]
                    - row [ref=e637] [cursor=pointer]:
                      - cell "8" [ref=e638]
                      - cell [ref=e639]:
                        - link "Klaravich Stables" [ref=e643]:
                          - /url: /npc-stables/6bd80ba3-61d2-4a21-a452-02803cefb2df
                      - cell "$0" [ref=e644]
                      - cell [ref=e645]
                    - row [ref=e648] [cursor=pointer]:
                      - cell "9" [ref=e649]
                      - cell [ref=e650]:
                        - link "Skull Stable" [ref=e654]:
                          - /url: /npc-stables/c488b416-4157-4870-b400-5935f90bdc04
                      - cell "$0" [ref=e655]
                      - cell [ref=e656]
                    - row [ref=e659] [cursor=pointer]:
                      - cell "10" [ref=e660]
                      - cell [ref=e661]:
                        - link "Spendthrift Farm" [ref=e665]:
                          - /url: /npc-stables/21dbbebd-6a1f-4f72-83c9-4431c6889736
                      - cell "$0" [ref=e666]
                      - cell [ref=e667]
          - generic [ref=e670]:
            - generic [ref=e671]: News Feed
            - generic [ref=e677]:
              - generic [ref=e678]:
                - generic [ref=e679]: Day
                - generic [ref=e680]: "001"
              - generic [ref=e681]: E2E Test Stables opens its doors. Welcome, Test Owner.
          - generic [ref=e682]:
            - generic [ref=e691]: Legacy & Awards
            - generic [ref=e694]:
              - generic [ref=e695]:
                - generic [ref=e696]:
                  - generic [ref=e697]: G1 Victories
                  - generic [ref=e698]: "0"
                - generic [ref=e700]:
                  - generic [ref=e701]: Stable Awards
                  - generic [ref=e702]: "0"
              - generic [ref=e703]:
                - generic [ref=e704] [cursor=pointer]:
                  - generic [ref=e712]: Awards
                  - link "View Records" [ref=e714]:
                    - /url: /records
                - link "View Full Trophy Case" [ref=e718] [cursor=pointer]:
                  - /url: /awards
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { readFileSync } from "fs";
  3  | import { join, dirname } from "path";
  4  | import { fileURLToPath } from "url";
  5  |
  6  | import { STORE_STATE_VERSION } from "@/platform/game/store/stateVersion";
  7  |
  8  | const __dirname = dirname(fileURLToPath(import.meta.url));
  9  | const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "e2e-fixture.json"), "utf-8"));
  10 | // Seeded saves must claim the current schema version — a stale version is
  11 | // treated as incompatible and wiped on rehydrate.
  12 | fixture.meta.storeVersion = STORE_STATE_VERSION;
  13 |
  14 | test.beforeEach(async ({ page }) => {
  15 |   await page.addInitScript((data) => {
  16 |     try {
  17 |       Object.defineProperty(window, "indexedDB", {
  18 |         get: () => undefined,
  19 |         configurable: true,
  20 |       });
  21 |     } catch {
  22 |       try {
  23 |         delete (window as any).indexedDB;
  24 |       } catch {
  25 |         (window as any).indexedDB = undefined;
  26 |       }
  27 |     }
  28 |     localStorage.setItem("gallop_game_state_fallback", JSON.stringify(data));
  29 |   }, fixture);
  30 | });
  31 |
  32 | /**
  33 |  * Visual regression baselines for core screens, seeded from the shared e2e
  34 |  * fixture so every render reflects real state. Regenerate deliberately with:
  35 |  *   bunx playwright test visual --update-snapshots
  36 |  */
  37 | const DESKTOP_ROUTES = [
  38 |   { name: "dashboard", path: "/" },
  39 |   { name: "stable", path: "/stable" },
  40 |   { name: "races", path: "/races" },
  41 |   { name: "market", path: "/market" },
  42 |   { name: "analytics", path: "/analytics" },
  43 |   { name: "calendar", path: "/calendar" },
  44 | ];
  45 |
  46 | const NARROW_ROUTES = [
  47 |   { name: "dashboard", path: "/" },
  48 |   { name: "stable", path: "/stable" },
  49 | ];
  50 |
  51 | test.describe("visual baselines — desktop", () => {
  52 |   for (const route of DESKTOP_ROUTES) {
  53 |     test(`${route.name} matches baseline`, async ({ page }) => {
  54 |       await page.goto(route.path);
  55 |       await page.waitForLoadState("networkidle");
> 56 |       await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/dashboard-desktop-chromium-linux.png, writing actual.
  57 |         animations: "disabled",
  58 |         maxDiffPixelRatio: 0.01,
  59 |       });
  60 |     });
  61 |   }
  62 | });
  63 |
  64 | test.describe("visual baselines — narrow viewport", () => {
  65 |   test.use({ viewport: { width: 390, height: 844 } });
  66 |   for (const route of NARROW_ROUTES) {
  67 |     test(`${route.name} matches baseline`, async ({ page }) => {
  68 |       await page.goto(route.path);
  69 |       await page.waitForLoadState("networkidle");
  70 |       await expect(page).toHaveScreenshot(`${route.name}-narrow.png`, {
  71 |         animations: "disabled",
  72 |         maxDiffPixelRatio: 0.01,
  73 |       });
  74 |     });
  75 |   }
  76 | });
  77 |
```