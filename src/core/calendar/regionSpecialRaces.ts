/**
 * regionSpecialRaces.ts - Special race key sets for regional calendars
 *
 * Extracted from regions.ts for modularity.
 * Contains Triple Crown, Triple Tiara, and Classic race key sets
 * used to highlight special races in regional calendars.
 */

// Canadian Triple Crown races
export const CANADIAN_TRIPLE_CROWN = new Set([
  "ca-kings-plate",
  "ca-prince-of-wales",
  "ca-breeders-stakes",
]);

// Canadian Triple Tiara races (fillies)
export const CANADIAN_TRIPLE_TIARA = new Set([
  "ca-woodbine-oaks",
  "ca-bison-city-stakes",
  "ca-wonder-where-stakes",
]);

// USA Triple Crown races
export const USA_TRIPLE_CROWN = new Set([
  "usa-kentucky-derby",
  "usa-preakness",
  "usa-belmont-stakes",
]);

// USA Triple Tiara races (fillies)
export const USA_TRIPLE_TIARA = new Set([
  "usa-kentucky-oaks",
  "usa-black-eyed-susan-stakes",
  "usa-acorn-stakes",
]);

// UK Classics (Guineas, Derby, Oaks, St Leger) - using gb- prefix from gradedRaces.ts
export const UK_CLASSICS = new Set([
  "gb-2000-guineas-stakes",
  "gb-1000-guineas-stakes",
  "gb-derby-stakes",
  "gb-oaks-stakes",
  "gb-st-leger-stakes",
]);

// Ireland Triple Crown races
export const IRELAND_TRIPLE_CROWN = new Set([
  "ie-irish-2-000-guineas",
  "ie-irish-derby",
  "ie-irish-st-leger",
]);

// France Triple Crown races
export const FRANCE_TRIPLE_CROWN = new Set([
  "fr-poule-d-essai-des-poulains",
  "fr-prix-du-jockey-club",
  "fr-grand-prix-de-paris",
]);

// Italy Triple Crown races
export const ITALY_TRIPLE_CROWN = new Set([
  "it-premio-parioli",
  "it-derby-italiano",
  "it-st-leger-italiano",
]);

// Argentina Triple Crown races
export const ARGENTINA_TRIPLE_CROWN = new Set([
  "argentina-gran-premio-polla-de-potrillos",
  "argentina-gran-premio-jockey-club",
  "argentina-gran-premio-nacional",
]);

// Hong Kong Triple Crown races
export const HONG_KONG_TRIPLE_CROWN = new Set([
  "hk-stewards-cup",
  "hk-hong-kong-gold-cup",
  "hk-champions-chater-cup",
]);

// Hungary Triple Crown races
export const HUNGARY_TRIPLE_CROWN = new Set([
  "hu-nemzeti-dij",
  "hu-magyar-derby",
  "hu-magyar-st-leger",
]);

// Japan Triple Crown races
export const JAPAN_TRIPLE_CROWN = new Set(["jp-satsuki-sho", "jp-tokyo-yushun", "jp-kikuka-sho"]);

// Japan Triple Tiara races (fillies)
export const JAPAN_TRIPLE_TIARA = new Set(["jp-oka-sho", "jp-yushun-himba", "jp-shuka-sho"]);

// Australia Triple Crown races
export const AUSTRALIA_TRIPLE_CROWN = new Set([
  "au-randwick-guineas",
  "au-rosehill-guineas",
  "au-victoria-derby",
]);

// Germany Triple Crown races
export const GERMANY_TRIPLE_CROWN = new Set([
  "de-mehl-mulhens-rennen",
  "de-deutsches-derby",
  "de-deutsches-st-leger",
]);

// Brazil Triple Crown races (males)
export const BRAZIL_TRIPLE_CROWN = new Set([
  "brazil-grande-pr-mio-estado-do-rio-de-janeiro",
  "brazil-grande-pr-mio-francisco-eduardo-e-linneo-eduardo-de-p",
  "brazil-grande-pr-mio-cruzeiro-do-sul-brazilian-derby",
]);

// Brazil Triple Tiara races (fillies)
export const BRAZIL_TRIPLE_TIARA = new Set([
  "brazil-grande-pr-mio-henrique-possollo",
  "brazil-grande-pr-mio-diana",
  "brazil-grande-pr-mio-z-lia-gonzaga-peixoto-de-castro",
]);

// Chile Triple Crown races
export const CHILE_TRIPLE_CROWN = new Set([
  "chile-cl-sico-el-ensayo",
  "chile-cl-sico-st-leger",
  "chile-cl-sico-el-derby",
]);
