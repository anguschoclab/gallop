# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — narrow viewport >> dashboard matches baseline
- Location: src/tests/e2e/visual.spec.ts:67:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/dashboard-narrow-chromium-linux.png, writing actual.
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
            - generic:
              - paragraph: Next up
              - paragraph: Advance to the next day
              - paragraph: Nothing needs your attention — move the season forward
        - generic [ref=e114]:
          - generic [ref=e116]:
            - generic [ref=e117]:
              - generic [ref=e118]: The Gallop Gazette
              - generic [ref=e123]: Edition 1
            - generic [ref=e124]:
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]: flavor
                  - 'heading "First Look: E2E Test Stables Enters the Competition" [level=3] [ref=e128]'
                  - paragraph [ref=e129]: A fresh face joins the fray as E2E Test Stables officially commences racing operations. Under the guidance of Test Owner, they are a stable to watch.
                - generic [ref=e130]:
                  - generic [ref=e131]: racing
                  - 'heading "The Top 5: Early Season Power Rankings" [level=3] [ref=e132]'
                  - paragraph [ref=e133]:
                    - generic [ref=e134]:
                      - text: "Who's leading the pack? The early power rankings tell the story: 1."
                      - link "Spiral Stakes of A" [ref=e135] [cursor=pointer]:
                        - /url: /stable/a798e46e-9b73-4557-aa0f-8e86f197f2b0
                      - text: (0 OVR) 2.
                      - link "Pride of Blue Gras" [ref=e136] [cursor=pointer]:
                        - /url: /stable/cb9aebe5-02a3-4fc1-8616-2092870f3098
                      - text: (0 OVR) 3. Arkansas
                      - link "Derby" [ref=e137] [cursor=pointer]:
                        - /url: /stable/a15931f2-264d-4b70-8334-3f0329d01517
                      - text: of (0 OVR) 4.
                      - link "Texas Star" [ref=e138] [cursor=pointer]:
                        - /url: /stable/56c50384-395b-4401-baa6-cf66b3cda053
                      - text: (0 OVR) 5.
                      - link "Monmouth Gotham" [ref=e139] [cursor=pointer]:
                        - /url: /stable/425a499d-110f-4744-80a7-b0fda31c9134
                      - text: (0 OVR). Each of these runners has the class to dominate on the biggest days.
              - link "Full Coverage" [ref=e141] [cursor=pointer]:
                - /url: /gazette
          - generic [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]: Stable Overview
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - generic [ref=e151]:
                    - generic: Liquidity
                    - generic: $100,000
                  - generic [ref=e152]:
                    - generic: Roster
                    - generic:
                      - text: "4"
                      - generic [ref=e153]: Active
                - generic [ref=e154]:
                  - generic [ref=e155]:
                    - generic [ref=e156]: Stable Capacity
                    - generic [ref=e157]: Usage
                  - generic [ref=e158]:
                    - generic [ref=e160]:
                      - generic [ref=e161]: Mating
                      - generic [ref=e164]: 0 / 10
                    - generic [ref=e167]:
                      - generic [ref=e168]: Staffing
                      - generic [ref=e172]: 0 / 12
                    - generic [ref=e175]:
                      - generic [ref=e176]: Syndicates
                      - generic [ref=e179]: "0"
            - generic [ref=e181]:
              - generic [ref=e182]: Recent Activity
              - generic [ref=e186]:
                - generic [ref=e187]:
                  - generic [ref=e189]: stable
                  - generic: The Hill 'n' Dale Farms Threat
                  - generic [ref=e190]: Day 1
                - generic [ref=e191]:
                  - generic [ref=e193]: stable
                  - generic: "Shadai Stallion Station: A Force to Be Reckoned With"
                  - generic [ref=e194]: Day 1
                - generic [ref=e195]:
                  - generic [ref=e197]: stable
                  - generic: Who Is Gainsborough Farm?
                  - generic [ref=e198]: Day 1
                - generic [ref=e199]:
                  - generic [ref=e201]: stable
                  - generic: "Gainesway Farm: A Force to Be Reckoned With"
                  - generic [ref=e202]: Day 1
                - generic [ref=e203]:
                  - generic [ref=e205]: stable
                  - generic: "Profiling the Enemy: Godolphin"
                  - generic [ref=e206]: Day 1
                - link "View All" [ref=e207] [cursor=pointer]:
                  - /url: /gazette
        - generic [ref=e210]:
          - generic [ref=e211]:
            - generic [ref=e212]: Key Rivals
            - generic [ref=e218]: No bitter rivals yet — keep winning.
          - generic [ref=e220]:
            - generic [ref=e221]:
              - generic [ref=e222]: H.Q. Ops
              - link "Go to H.Q. Ops financial report" [ref=e229] [cursor=pointer]:
                - /url: /financial-report
                - button "Go to H.Q. Ops financial report" [ref=e230]
            - generic [ref=e231]:
              - generic [ref=e232]:
                - generic [ref=e233]:
                  - generic [ref=e234]: Facility Health
                  - generic [ref=e235]: Rank
                - generic [ref=e236]:
                  - generic [ref=e237]:
                    - generic [ref=e238]: Main Training Track
                    - generic [ref=e239]: LVL 1
                  - generic [ref=e240]:
                    - generic [ref=e241]: Stable Barn
                    - generic [ref=e242]: LVL 1
                  - generic [ref=e243]:
                    - generic [ref=e244]: Exercise Pool
                    - generic [ref=e245]: LVL 1
                - generic [ref=e246]: Reputation Ledger
              - generic [ref=e248]:
                - link [ref=e249] [cursor=pointer]:
                  - /url: /facilities
                  - button "Manage Horses" [ref=e250]
                - link [ref=e251] [cursor=pointer]:
                  - /url: /settings
                  - button "Configuration" [ref=e252]
          - generic [ref=e253]:
            - generic [ref=e254]:
              - generic [ref=e255]: Stable & Roster
              - link "Go to Stable & Roster" [ref=e263] [cursor=pointer]:
                - /url: /stable
                - button "Go to Stable & Roster" [ref=e264]
            - generic [ref=e265]:
              - generic [ref=e266]:
                - generic [ref=e267]:
                  - generic [ref=e268]: Top Stable Stars
                  - generic [ref=e269]: OVR
                - generic [ref=e270]:
                  - link "Northern Journey 40 E100" [ref=e271] [cursor=pointer]:
                    - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6
                    - generic [ref=e272]:
                      - generic [ref=e273]: Northern Journey
                      - generic [ref=e276]:
                        - generic [ref=e277]: "40"
                        - generic [ref=e278]: E100
                  - link "The Northern Hero 40 E100" [ref=e279] [cursor=pointer]:
                    - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168
                    - generic [ref=e280]:
                      - generic [ref=e281]: The Northern Hero
                      - generic [ref=e284]:
                        - generic [ref=e285]: "40"
                        - generic [ref=e286]: E100
                  - link "Bandit of Lucky 39 E100" [ref=e287] [cursor=pointer]:
                    - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293
                    - generic [ref=e288]:
                      - generic [ref=e289]: Bandit of Lucky
                      - generic [ref=e292]:
                        - generic [ref=e293]: "39"
                        - generic [ref=e294]: E100
                - generic [ref=e295]:
                  - generic [ref=e296]:
                    - generic [ref=e297]: Personnel Brief
                    - link "Roster" [ref=e298] [cursor=pointer]:
                      - /url: /jockeys
                  - generic [ref=e299]:
                    - generic [ref=e300]: Active Jockeys
                    - generic [ref=e307]: "0"
                  - generic [ref=e308]:
                    - generic [ref=e309]: Support Staff
                    - generic [ref=e314]: "0"
              - generic [ref=e315]:
                - link [ref=e316] [cursor=pointer]:
                  - /url: /horse-gallery
                  - button "Horse Gallery" [ref=e317]
                - link [ref=e318] [cursor=pointer]:
                  - /url: /breeding
                  - button "Breeding Ops" [ref=e319]
          - generic [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]: The Circuit
              - link "Go to The Circuit races" [ref=e328] [cursor=pointer]:
                - /url: /races?grade=all&country=all&surface=all&track=all&owned=all&q=
                - button "Go to The Circuit races" [ref=e329]
            - generic [ref=e330]:
              - generic [ref=e331]:
                - generic [ref=e332]:
                  - generic [ref=e333]: Upcoming Races
                  - generic [ref=e334]: D / P
                - generic [ref=e335]:
                  - generic [ref=e336]:
                    - generic:
                      - link "Hialeah Classic" [ref=e337] [cursor=pointer]:
                        - /url: /race/4142dd10-13e2-41fd-8a2b-daa4c7a0428f
                      - generic: 1700m · StarterAllowance
                    - generic [ref=e338]:
                      - generic [ref=e339]: D1
                      - text: $5,000
                  - generic [ref=e340]:
                    - generic:
                      - link "Tokyo Trophy" [ref=e341] [cursor=pointer]:
                        - /url: /race/3c5d2bbb-864f-4b3c-9800-60b459818231
                      - generic: 2000m · Stakes
                    - generic [ref=e342]:
                      - generic [ref=e343]: D1
                      - text: $18,000
                  - generic [ref=e344]:
                    - generic:
                      - link "Epsom Cup" [ref=e345] [cursor=pointer]:
                        - /url: /race/293af24d-5fd6-47ce-bc46-924b1d35537f
                      - generic: 1000m · Maiden
                    - generic [ref=e346]:
                      - generic [ref=e347]: D2
                      - text: $2,000
                - generic [ref=e348]:
                  - generic [ref=e349]:
                    - generic [ref=e350]: Global Markets
                    - link "Sire Watch" [ref=e351] [cursor=pointer]:
                      - /url: /stallions
                  - generic [ref=e352]:
                    - generic [ref=e353]: Daily Market
                    - generic [ref=e359]: Active
                  - generic [ref=e360]:
                    - generic [ref=e361]: Public Auctions
                    - generic [ref=e369]: 0 Open
              - generic [ref=e370]:
                - link [ref=e371] [cursor=pointer]:
                  - /url: /market
                  - button "Claiming Market" [ref=e372]
                - link [ref=e373] [cursor=pointer]:
                  - /url: /auction
                  - button "Auction Block" [ref=e374]
          - generic [ref=e375]:
            - generic [ref=e377]:
              - generic [ref=e378]: Reputation
              - generic [ref=e385]: Unranked
            - generic [ref=e386]:
              - generic [ref=e387]:
                - generic [ref=e388]:
                  - generic [ref=e389]: Reputation Score
                  - generic [ref=e390]: "0"
                - generic [ref=e392]:
                  - generic:
                    - generic: Total Wins
                    - generic: "0"
                  - generic:
                    - generic: G1 Wins
                    - generic: "0"
                  - generic:
                    - generic: Years Active
                    - generic: "0"
              - generic [ref=e393]:
                - generic [ref=e394]: Graded Stakes Wins
                - generic [ref=e395]:
                  - generic:
                    - generic: G1
                    - generic: "0"
                  - generic:
                    - generic: G2
                    - generic: "0"
                  - generic:
                    - generic: G3
                    - generic: "0"
                  - generic:
                    - generic: Listed
                    - generic: "0"
          - generic [ref=e396]:
            - generic [ref=e398]:
              - generic [ref=e399]: Prestige
              - generic [ref=e402]: Provincial
            - generic [ref=e403]:
              - generic [ref=e404]:
                - generic [ref=e405]:
                  - generic [ref=e406]: Prestige score
                  - generic [ref=e407]: 0/100
                - meter "Stable prestige 0 of 100, Provincial" [ref=e408]
                - generic [ref=e413]:
                  - generic [ref=e414]: Provincial
                  - generic [ref=e415]: World class
              - generic [ref=e416]:
                - generic [ref=e417]:
                  - generic: Overall
                  - generic:
                    - text: "#133"
                    - generic [ref=e418]: / 133
                  - generic: Top 100%
                - generic [ref=e419]:
                  - generic: vs Houses
                  - generic:
                    - text: "#7"
                    - generic [ref=e420]: / 7
                  - generic: Auction rings
                - generic [ref=e421]:
                  - generic: vs Courses
                  - generic:
                    - text: "#127"
                    - generic [ref=e422]: / 127
                  - generic: Racecourses
              - generic [ref=e423]:
                - generic [ref=e424]:
                  - generic [ref=e425]: Vienna
                  - generic [ref=e429]:
                    - generic [ref=e430]: "#132"
                    - generic [ref=e431]: "14"
                - generic [ref=e432]:
                  - generic [ref=e433]: E2E Test Stables
                  - generic [ref=e437]:
                    - generic [ref=e438]: "#133"
                    - generic [ref=e439]: "0"
              - paragraph [ref=e440]: Prestige tracks your reputation on the venue scale — win graded races, trade well and underwrite syndicates to climb.
        - generic [ref=e441]:
          - generic [ref=e442]:
            - heading "Regional Trends" [level=2] [ref=e449]
            - generic [ref=e450]:
              - generic [ref=e451]:
                - generic [ref=e452]: Window
                - group "Analytics time window" [ref=e453]:
                  - button "4 wks" [ref=e454]
                  - button "8 wks" [ref=e455]
                  - button "12 wks" [pressed] [ref=e456]
                  - button "26 wks" [ref=e457]
                  - button "52 wks" [ref=e458]
                  - button "All time" [ref=e459]
              - link "Full comparison" [ref=e460] [cursor=pointer]:
                - /url: /regional-comparison
          - generic [ref=e461]: No starts in the last 12 wks — regional trends appear after you race.
        - generic [ref=e462]:
          - generic [ref=e463]:
            - generic [ref=e464]:
              - generic [ref=e465]: Season Standings
              - generic [ref=e474]: "You: #1"
            - generic [ref=e476]:
              - tablist [ref=e477]:
                - tab "Earnings" [selected] [ref=e478]
                - tab "Wealth" [ref=e485]
              - tabpanel "Earnings" [ref=e491]:
                - generic [ref=e492]:
                  - button "7D" [ref=e493]
                  - button "30D" [ref=e494]
                  - button "90D" [ref=e495]
                - table [ref=e498]:
                  - rowgroup [ref=e499]:
                    - row [ref=e500]:
                      - columnheader "#" [ref=e501]
                      - columnheader "Stable" [ref=e502]
                      - columnheader "30D Earnings" [ref=e503]
                  - rowgroup [ref=e504]:
                    - row [ref=e505] [cursor=pointer]:
                      - cell "1" [ref=e506]
                      - cell "E2E Test Stables" [ref=e507]
                      - cell "$0" [ref=e511]
                    - row [ref=e512] [cursor=pointer]:
                      - cell "2" [ref=e513]
                      - cell [ref=e514]:
                        - link "Hill 'n' Dale Farms" [ref=e518]:
                          - /url: /npc-stables/4f71470d-b229-4dc9-aa1e-3f099e70c528
                      - cell "$0" [ref=e519]
                    - row [ref=e520] [cursor=pointer]:
                      - cell "3" [ref=e521]
                      - cell [ref=e522]:
                        - link "Shadai Stallion Station" [ref=e526]:
                          - /url: /npc-stables/b0ed1fe4-78b7-4a54-96b7-26150370e17e
                      - cell "$0" [ref=e527]
                    - row [ref=e528] [cursor=pointer]:
                      - cell "4" [ref=e529]
                      - cell [ref=e530]:
                        - link "Gainsborough Farm" [ref=e534]:
                          - /url: /npc-stables/3f2a822e-cc55-4d6f-9d7a-1535c57df360
                      - cell "$0" [ref=e535]
                    - row [ref=e536] [cursor=pointer]:
                      - cell "5" [ref=e537]
                      - cell [ref=e538]:
                        - link "Gainesway Farm" [ref=e542]:
                          - /url: /npc-stables/786f5f48-ffc0-41fc-8a57-244a083f2b82
                      - cell "$0" [ref=e543]
                    - row [ref=e544] [cursor=pointer]:
                      - cell "6" [ref=e545]
                      - cell [ref=e546]:
                        - link "Godolphin" [ref=e550]:
                          - /url: /npc-stables/ab70a00b-e542-4ab3-8d35-10a5d3eaa168
                      - cell "$0" [ref=e551]
                    - row [ref=e552] [cursor=pointer]:
                      - cell "7" [ref=e553]
                      - cell [ref=e554]:
                        - link "Sackatoga Stable" [ref=e558]:
                          - /url: /npc-stables/9ba27ab7-f38d-42b3-b040-2bb47ef30b97
                      - cell "$0" [ref=e559]
                    - row [ref=e560] [cursor=pointer]:
                      - cell "8" [ref=e561]
                      - cell [ref=e562]:
                        - link "Klaravich Stables" [ref=e566]:
                          - /url: /npc-stables/6bd80ba3-61d2-4a21-a452-02803cefb2df
                      - cell "$0" [ref=e567]
                    - row [ref=e568] [cursor=pointer]:
                      - cell "9" [ref=e569]
                      - cell [ref=e570]:
                        - link "Skull Stable" [ref=e574]:
                          - /url: /npc-stables/c488b416-4157-4870-b400-5935f90bdc04
                      - cell "$0" [ref=e575]
                    - row [ref=e576] [cursor=pointer]:
                      - cell "10" [ref=e577]
                      - cell [ref=e578]:
                        - link "Spendthrift Farm" [ref=e582]:
                          - /url: /npc-stables/21dbbebd-6a1f-4f72-83c9-4431c6889736
                      - cell "$0" [ref=e583]
          - generic [ref=e584]:
            - generic [ref=e585]: News Feed
            - generic [ref=e591]:
              - generic [ref=e592]:
                - generic [ref=e593]: Day
                - generic [ref=e594]: "001"
              - generic [ref=e595]: E2E Test Stables opens its doors. Welcome, Test Owner.
          - generic [ref=e596]:
            - generic [ref=e605]: Legacy & Awards
            - generic [ref=e608]:
              - generic [ref=e609]:
                - generic [ref=e610]:
                  - generic [ref=e611]: G1 Victories
                  - generic [ref=e612]: "0"
                - generic [ref=e613]:
                  - generic [ref=e614]: Stable Awards
                  - generic [ref=e615]: "0"
              - generic [ref=e616]:
                - generic [ref=e617] [cursor=pointer]:
                  - generic [ref=e625]: Awards
                  - link "View Records" [ref=e627]:
                    - /url: /records
                - link "View Full Trophy Case" [ref=e630] [cursor=pointer]:
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
  56 |       await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
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
> 70 |       await expect(page).toHaveScreenshot(`${route.name}-narrow.png`, {
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/dashboard-narrow-chromium-linux.png, writing actual.
  71 |         animations: "disabled",
  72 |         maxDiffPixelRatio: 0.01,
  73 |       });
  74 |     });
  75 |   }
  76 | });
  77 |
```