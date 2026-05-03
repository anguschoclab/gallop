// Canadian Grade 1 stakes races (run at Woodbine).
// Source: Wikipedia – Category:Grade 1 stakes races in Canada.
// Distances normalized to meters. dayOfYear schedules each race on the
// game's 365-day annual cycle (day 1 = Jan 1).

export type Grade = "G1" | "G2" | "G3";

export type GradedRace = {
  key: string;
  name: string;
  track: string;
  grade: Grade;
  distance: number;
  surface: "Turf" | "Dirt" | "Synthetic";
  purse: number;
  dayOfYear: number;
  restrictions?: { minAge?: number; maxAge?: number };
  note?: string; // e.g. "Fillies & Mares" — display-only
};

function doy(month: number, day: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cum[month - 1] + day;
}

export const GRADED_RACES: GradedRace[] = [
  { key: "woodbine-mile", name: "Woodbine Mile", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 1000000, dayOfYear: doy(9, 14), restrictions: { minAge: 3 } },
  { key: "ep-taylor", name: "E. P. Taylor Stakes", track: "Woodbine", grade: "G1", distance: 2000, surface: "Turf", purse: 600000, dayOfYear: doy(10, 12), restrictions: { minAge: 3 } },
  { key: "canadian-international", name: "Canadian International Stakes", track: "Woodbine", grade: "G1", distance: 2400, surface: "Turf", purse: 600000, dayOfYear: doy(10, 19), restrictions: { minAge: 3 } },
  { key: "northern-dancer-turf", name: "Northern Dancer Turf Stakes", track: "Woodbine", grade: "G1", distance: 2400, surface: "Turf", purse: 600000, dayOfYear: doy(9, 14), restrictions: { minAge: 3 } },
  { key: "highlander", name: "Highlander Stakes", track: "Woodbine", grade: "G1", distance: 1200, surface: "Turf", purse: 300000, dayOfYear: doy(7, 6), restrictions: { minAge: 3 } },
  { key: "summer-stakes", name: "Summer Stakes", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 300000, dayOfYear: doy(9, 14), restrictions: { minAge: 2, maxAge: 2 } },
  { key: "natalma", name: "Natalma Stakes", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 300000, dayOfYear: doy(9, 14), restrictions: { minAge: 2, maxAge: 2 } },

  // ============= UAE — Group 1 (Meydan, Dubai World Cup Carnival/Night) =============
  { key: "jebel-hatta", name: "Jebel Hatta", track: "Meydan", grade: "G1", distance: 1800, surface: "Turf", purse: 500000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 } },
  { key: "al-maktoum-challenge", name: "Al Maktoum Challenge R3", track: "Meydan", grade: "G1", distance: 2000, surface: "Dirt", purse: 500000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 } },
  { key: "al-quoz-sprint", name: "Al Quoz Sprint", track: "Meydan", grade: "G1", distance: 1200, surface: "Turf", purse: 1500000, dayOfYear: doy(3, 30), restrictions: { minAge: 3 } },
  { key: "dubai-golden-shaheen", name: "Dubai Golden Shaheen", track: "Meydan", grade: "G1", distance: 1200, surface: "Dirt", purse: 1500000, dayOfYear: doy(3, 30), restrictions: { minAge: 3 } },
  { key: "dubai-sheema-classic", name: "Dubai Sheema Classic", track: "Meydan", grade: "G1", distance: 2400, surface: "Turf", purse: 6000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "dubai-turf", name: "Dubai Turf", track: "Meydan", grade: "G1", distance: 1800, surface: "Turf", purse: 5000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "dubai-world-cup", name: "Dubai World Cup", track: "Meydan", grade: "G1", distance: 2000, surface: "Dirt", purse: 12000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },

  // ============= UAE — Group 2 =============
  { key: "al-fahidi-fort", name: "Al Fahidi Fort", track: "Meydan", grade: "G2", distance: 1400, surface: "Turf", purse: 250000, dayOfYear: doy(1, 12), restrictions: { minAge: 4 } },
  { key: "al-rashidiya", name: "Al Rashidiya", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 250000, dayOfYear: doy(1, 19), restrictions: { minAge: 4 } },
  { key: "balanchine", name: "Balanchine", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 250000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 }, note: "Fillies & Mares" },
  { key: "cape-verdi", name: "Cape Verdi", track: "Meydan", grade: "G2", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: doy(1, 12), restrictions: { minAge: 4 }, note: "Fillies & Mares" },
  { key: "dubai-city-of-gold", name: "Dubai City of Gold", track: "Meydan", grade: "G2", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubai-gold-cup", name: "Dubai Gold Cup", track: "Meydan", grade: "G2", distance: 3200, surface: "Turf", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "godolphin-mile", name: "Godolphin Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Dirt", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "al-maktoum-mile", name: "Al Maktoum Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "al-maktoum-classic", name: "Al Maktoum Classic R2", track: "Meydan", grade: "G2", distance: 1900, surface: "Dirt", purse: 350000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "meydan-sprint", name: "Meydan Sprint", track: "Meydan", grade: "G2", distance: 1000, surface: "Turf", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 3 } },
  { key: "singspiel-stakes", name: "Singspiel Stakes", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 200000, dayOfYear: doy(2, 16), restrictions: { minAge: 4 } },
  { key: "uae-derby", name: "UAE Derby", track: "Meydan", grade: "G2", distance: 1900, surface: "Dirt", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "zabeel-mile", name: "Zabeel Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Turf", purse: 200000, dayOfYear: doy(2, 16), restrictions: { minAge: 3 } },

  // ============= UAE — Group 3 =============
  { key: "abu-dhabi-championship", name: "Abu Dhabi Championship", track: "Abu Dhabi", grade: "G3", distance: 2200, surface: "Turf", purse: 200000, dayOfYear: doy(2, 23), restrictions: { minAge: 4 } },
  { key: "al-shindagha-sprint", name: "Al Shindagha Sprint", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 175000, dayOfYear: doy(1, 26), restrictions: { minAge: 3 } },
  { key: "burj-nahaar", name: "Burj Nahaar", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubai-millennium-stakes", name: "Dubai Millennium Stakes", track: "Meydan", grade: "G3", distance: 2000, surface: "Turf", purse: 175000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubawi-stakes", name: "Dubawi Stakes", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 175000, dayOfYear: doy(1, 12), restrictions: { minAge: 3 } },
  { key: "firebreak-stakes", name: "Firebreak Stakes", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 175000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "jebel-ali-mile", name: "Jebel Ali Mile", track: "Jebel Ali", grade: "G3", distance: 1600, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 2), restrictions: { minAge: 4 } },
  { key: "mahab-al-shimaal", name: "Mahab Al Shimaal", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 3 } },
  { key: "nad-al-sheba-trophy", name: "Nad Al Sheba Trophy", track: "Meydan", grade: "G3", distance: 2810, surface: "Turf", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "nad-al-sheba-turf-sprint", name: "Nad Al Sheba Turf Sprint", track: "Meydan", grade: "G3", distance: 1200, surface: "Turf", purse: 175000, dayOfYear: doy(1, 19), restrictions: { minAge: 3 } },
  { key: "uae-oaks", name: "UAE Oaks", track: "Meydan", grade: "G3", distance: 1900, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 16), restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "uae-2000-guineas", name: "UAE 2000 Guineas", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 9), restrictions: { minAge: 3, maxAge: 3 } },

  // ============= South America — Group One (Argentina, Brazil, Chile) =============
  { key: "argentina-gran-premio-miguel-alfredo-mart-nez-de-hoz", name: "Gran Premio Miguel Alfredo Martínez de Hoz", track: "Hipódromo de San Isidro", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 47, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-gilberto-lerena", name: "Gran Premio Gilberto Lerena", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2200, surface: "Turf", purse: 250000, dayOfYear: 111, restrictions: { minAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-de-honor", name: "Gran Premio de Honor", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 93, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-jorge-de-atucha", name: "Gran Premio Jorge de Atucha", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1500, surface: "Dirt", purse: 250000, dayOfYear: 126, restrictions: { minAge: 2, maxAge: 2 }, note: "Fillies" },
  { key: "argentina-gran-premio-montevideo", name: "Gran Premio Montevideo", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1500, surface: "Dirt", purse: 250000, dayOfYear: 132, restrictions: { minAge: 2, maxAge: 2 }, note: "Colts" },
  { key: "argentina-gran-premio-ciudad-de-buenos-aires", name: "Gran Premio Ciudad de Buenos Aires", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1000, surface: "Dirt", purse: 250000, dayOfYear: 134, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-de-las-am-ricas-osaf", name: "Gran Premio de Las Américas - OSAF", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 129, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-criadores", name: "Gran Premio Criadores", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 142, restrictions: { minAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-rep-blica-argentina", name: "Gran Premio República Argentina", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 133, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-25-de-mayo-copa-dr-enrique-olivera", name: "Gran Premio 25 de Mayo - Copa Dr. Enrique Olivera", track: "Hipódromo de San Isidro", grade: "G1", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: 126, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-de-potrancas", name: "Gran Premio de Potrancas", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 136, restrictions: { minAge: 2, maxAge: 2 }, note: "Fillies" },
  { key: "argentina-gran-premio-gran-criterium", name: "Gran Premio Gran Criterium", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 124, restrictions: { minAge: 2, maxAge: 2 }, note: "Colts" },
  { key: "argentina-gran-premio-estrellas-juvenile-fillies", name: "Gran Premio Estrellas Juvenile Fillies", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 175, restrictions: { minAge: 2, maxAge: 2 }, note: "Fillies" },
  { key: "argentina-gran-premio-estrellas-juvenile", name: "Gran Premio Estrellas Juvenile", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 157, restrictions: { minAge: 2, maxAge: 2 }, note: "Colts" },
  { key: "argentina-gran-premio-estrellas-sprint", name: "Gran Premio Estrellas Sprint", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1000, surface: "Dirt", purse: 250000, dayOfYear: 167, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-estrellas-mile", name: "Gran Premio Estrellas Mile", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 174, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-estrellas-classic", name: "Gran Premio Estrellas Classic", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 172, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-estrellas-distaff", name: "Gran Premio Estrellas Distaff", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1800, surface: "Dirt", purse: 250000, dayOfYear: 155, restrictions: { minAge: 3 }, note: "Fillies" },
  { key: "argentina-dos-mil-guineas", name: "Dos Mil Guineas", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 189, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "argentina-gran-premio-polla-de-potrancas", name: "Gran Premio Polla de Potrancas", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 264, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-polla-de-potrillos", name: "Gran Premio Polla de Potrillos", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 251, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "argentina-gran-premio-general-san-mart-n", name: "Gran Premio General San Martín", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: 268, restrictions: { minAge: 4 } },
  { key: "argentina-gran-premio-selecci-n-de-potrancas", name: "Gran Premio Selección de Potrancas", track: "Hipódromo de La Plata", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 247, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-selecci-n", name: "Gran Premio Selección", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2000, surface: "Dirt", purse: 250000, dayOfYear: 297, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-jockey-club", name: "Gran Premio Jockey Club", track: "Hipódromo de San Isidro", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 294, restrictions: { minAge: 3, maxAge: 3 } },
  { key: "argentina-gran-premio-san-isidro-copa-melchor-ngel-posse", name: "Gran Premio San Isidro - Copa Melchor Ángel Posse", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 282, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-suipacha", name: "Gran Premio Suipacha", track: "Hipódromo de San Isidro", grade: "G1", distance: 1000, surface: "Turf", purse: 250000, dayOfYear: 276, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-diamante", name: "Gran Premio Diamante", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 296, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-copa-de-oro-alfredo-lalor", name: "Gran Premio Copa de Oro - Alfredo Lalor", track: "Hipódromo de San Isidro", grade: "G1", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: 325, restrictions: { minAge: 4 } },
  { key: "argentina-gran-premio-enrique-acebal", name: "Gran Premio Enrique Acebal", track: "Hipódromo de San Isidro", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 307, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-nacional", name: "Gran Premio Nacional", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 2500, surface: "Dirt", purse: 750000, dayOfYear: 322, restrictions: { minAge: 3, maxAge: 3 } },
  { key: "argentina-gran-premio-maip", name: "Gran Premio Maipú", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1000, surface: "Dirt", purse: 250000, dayOfYear: 327, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-palermo", name: "Gran Premio Palermo", track: "Hipódromo Argentino de Palermo", grade: "G1", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: 322, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-dardo-rocha", name: "Gran Premio Dardo Rocha", track: "Hipódromo de La Plata", grade: "G1", distance: 2400, surface: "Dirt", purse: 250000, dayOfYear: 323, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-copa-de-plata-roberto-vasquez-mansilla", name: "Gran Premio Copa de Plata Roberto Vasquez Mansilla Internacional", track: "Hipódromo de San Isidro", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 353, restrictions: { minAge: 3 }, note: "Fillies" },
  { key: "argentina-gran-premio-carlos-pellegrini-internacional", name: "Gran Premio Carlos Pellegrini Internacional", track: "Hipódromo de San Isidro", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 355, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-f-lix-de-lzaga-unzu-internacional", name: "Gran Premio Félix de Álzaga Unzué Internacional", track: "Hipódromo de San Isidro", grade: "G1", distance: 1000, surface: "Turf", purse: 250000, dayOfYear: 343, restrictions: { minAge: 3 } },
  { key: "argentina-gran-premio-joaqu-n-s-de-anchorena-internacional", name: "Gran Premio Joaquín S. de Anchorena Internacional", track: "Hipódromo de San Isidro", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 339, restrictions: { minAge: 3 } },
  { key: "brazil-grande-pr-mio-estado-do-rio-de-janeiro", name: "Grande Prêmio Estado do Rio de Janeiro", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 45, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-henrique-possollo", name: "Grande Prêmio Henrique Possollo", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 54, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-diana", name: "Grande Prêmio Diana", track: "Hipódromo da Gávea", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 64, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-francisco-eduardo-e-linneo-eduardo-de-p", name: "Grande Prêmio Francisco Eduardo e Linneo Eduardo de Paula Machado", track: "Hipódromo da Gávea", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 62, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-cruzeiro-do-sul-brazilian-derby", name: "Grande Prêmio Cruzeiro do Sul (Brazilian Derby)", track: "Hipódromo da Gávea", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 109, restrictions: { minAge: 3, maxAge: 3 } },
  { key: "brazil-grande-pr-mio-z-lia-gonzaga-peixoto-de-castro", name: "Grande Prêmio Zélia Gonzaga Peixoto de Castro", track: "Hipódromo da Gávea", grade: "G1", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: 116, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-juliano-martins", name: "Grande Prêmio Juliano Martins", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1500, surface: "Turf", purse: 250000, dayOfYear: 131, restrictions: { minAge: 2, maxAge: 2 } },
  { key: "brazil-grande-pr-mio-jo-o-cec-lio-ferraz", name: "Grande Prêmio João Cecílio Ferraz", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1500, surface: "Turf", purse: 250000, dayOfYear: 124, restrictions: { minAge: 2, maxAge: 2 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-a-b-c-p-c-c", name: "Grande Prêmio A.B.C.P.C.C.", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1000, surface: "Turf", purse: 250000, dayOfYear: 139, restrictions: { minAge: 2 } },
  { key: "brazil-grande-pr-mio-o-s-a-f-organizacion-sudamericana-de-fo", name: "Grande Prêmio O.S.A.F. - Organizacion Sudamericana de Fomento del Sangre Pura de Carrera", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 128, restrictions: { minAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-s-o-paulo", name: "Grande Prêmio São Paulo", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 125, restrictions: { minAge: 3 } },
  { key: "brazil-grande-pr-mio-jockey-club-brasileiro", name: "Grande Prêmio Jockey Club Brasileiro", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 750000, dayOfYear: 165, restrictions: { minAge: 2, maxAge: 2 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-major-suckow", name: "Grande Prêmio Major Suckow", track: "Hipódromo da Gávea", grade: "G1", distance: 1000, surface: "Turf", purse: 250000, dayOfYear: 164, restrictions: { minAge: 3 } },
  { key: "brazil-grande-pr-mio-brasil", name: "Grande Prêmio Brasil", track: "Hipódromo da Gávea", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 155, restrictions: { minAge: 4 } },
  { key: "brazil-grande-pr-mio-presidente-da-rep-blica", name: "Grande Prêmio Presidente da República", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 166, restrictions: { minAge: 3 } },
  { key: "brazil-grande-pr-mio-roberto-e-nelson-grimaldi-seabra", name: "Grande Prêmio Roberto e Nelson Grimaldi Seabra", track: "Hipódromo da Gávea", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 173, restrictions: { minAge: 4 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-margarida-polak-lara-ta-a-de-prata", name: "Grande Prêmio Margarida Polak Lara - Taça de Prata", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 237, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-jo-o-adhemar-de-almeida-prado-ta-a-de-p", name: "Grande Prêmio João Adhemar de Almeida Prado - Taça de Prata", track: "Hipódromo da Gávea", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 224, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-mathias-machline-abcpcc-cl-ssica", name: "Grande Prêmio Mathias Machline - ABCPCC Clássica", track: "Hipódromo da Gávea", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 216, restrictions: { minAge: 3 } },
  { key: "brazil-grande-pr-mio-ipiranga", name: "Grande Prêmio Ipiranga", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 253, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-bar-o-de-piracicaba", name: "Grande Prêmio Barão de Piracicaba", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 247, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-jockey-club-de-s-o-paulo", name: "Grande Prêmio Jockey Club de São Paulo", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 2000, surface: "Turf", purse: 750000, dayOfYear: 287, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-henrique-de-toledo-lara", name: "Grande Prêmio Henrique de Toledo Lara", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 1800, surface: "Turf", purse: 250000, dayOfYear: 297, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-derby-paulista", name: "Grande Prêmio Derby Paulista", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 307, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "brazil-grande-pr-mio-diana-x", name: "Grande Prêmio Diana", track: "Hipódromo Cidade Jardim", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 325, restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "brazil-grande-pr-mio-linneo-de-paula-machado", name: "Grande Prêmio Linneo de Paula Machado", track: "Hipódromo da Gávea", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 345, restrictions: { minAge: 3, maxAge: 3 }, note: "Colts" },
  { key: "chile-cl-sico-el-derby", name: "Clásico El Derby", track: "Valparaiso Sporting Club", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: 34, restrictions: { minAge: 3, maxAge: 3 } },
  { key: "chile-gran-premio-hip-dromo-chile", name: "Gran Premio Hipódromo Chile", track: "Hipódromo Chile", grade: "G1", distance: 2200, surface: "Dirt", purse: 250000, dayOfYear: 128, restrictions: { minAge: 3 } },
  { key: "chile-cl-sico-club-h-pico-de-santiago-falabella", name: "Clásico Club Hípico de Santiago - Falabella", track: "Club Hípico de Santiago", grade: "G1", distance: 2000, surface: "Turf", purse: 250000, dayOfYear: 126, restrictions: { minAge: 3 } },
  { key: "chile-cl-sico-arturo-lyon-pe-a", name: "Clásico Arturo Lyon Peña", track: "Club Hípico de Santiago", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 168, restrictions: { minAge: 2, maxAge: 2 }, note: "Fillies" },
  { key: "chile-cl-sico-alberto-vial-infante", name: "Clásico Alberto Vial Infante", track: "Club Hípico de Santiago", grade: "G1", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: 166, restrictions: { minAge: 2, maxAge: 2 }, note: "Colts" },
];
