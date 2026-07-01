/**
 * trackSchedulesData.ts - Track schedule configuration
 *
 * This file provides track schedule data with realistic race day patterns by region,
 * including race days, races per day, meet start/end dates, and regional system.
 *
 * Dependencies: ./tracks (TrackSchedule)
 * Related files: tracks.ts (uses track schedules), raceSchedule.ts (uses schedule data)
 */

import type { TrackSchedule } from "./tracks";

// Track schedules - realistic race day patterns by region
export const TRACK_SCHEDULES: TrackSchedule[] = [
  // Canada - North American pattern (4-5 days/week, claiming-heavy)
  {
    trackId: "a4e790db-a9ad-458d-9191-817b61b9069c", // Woodbine
    raceDays: [4, 5, 6, 0], // Thu, Fri, Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "north_america",
  },
  {
    trackId: "2ba12f6e-dc0d-47e9-9c95-af87fae00890", // Fort Erie
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 150, // Late May
    meetEnd: 250, // Early September
    regionalSystem: "north_america",
  },
  {
    trackId: "98c77f6a-f5b7-4791-aac1-afe5e5969aa3", // Century Mile
    raceDays: [4, 5, 6, 0], // Thu, Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 90, // Late March
    meetEnd: 300, // Late October
    regionalSystem: "north_america",
  },
  {
    trackId: "c7447323-b2df-46be-9f99-28e56a41e584", // Hastings
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "north_america",
  },

  // UAE - Asia pattern (weekend racing, no claiming)
  {
    trackId: "85a3d0b8-a4a9-4ff7-bc18-705874d8da31", // Meydan
    raceDays: [4, 5], // Thu, Fri (weekend in UAE)
    racesPerDay: [8, 10],
    meetStart: 1, // January
    meetEnd: 90, // Late March
    regionalSystem: "asia",
  },
  {
    trackId: "21815495-916b-4f3f-a2d9-51a3f6640152", // Abu Dhabi
    raceDays: [4, 5], // Thu, Fri
    racesPerDay: [6, 8],
    meetStart: 1, // January
    meetEnd: 120, // Late April
    regionalSystem: "asia",
  },

  // Argentina - South America pattern (weekend racing)
  {
    trackId: "271e4541-1500-4872-9340-4ed791fd28b7", // Hipódromo de San Isidro
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [10, 12],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "south_america",
  },

  // UAE
  {
    trackId: "7e62ba21-8d46-41ee-95ce-3a42b0f13dcc", // Jebel Ali
    raceDays: [4, 5],
    racesPerDay: [6, 8],
    meetStart: 1,
    meetEnd: 90,
    regionalSystem: "asia",
  },

  // Argentina
  {
    trackId: "1e1beb62-f786-44a9-8441-b23aa0db1eec", // Hipódromo Argentino de Palermo
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },
  {
    trackId: "6546c784-dfb3-4d28-999f-99dc82e90e9a", // Hipódromo de La Plata
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },

  // Brazil
  {
    trackId: "ce7714db-fa90-4ded-8477-40eec676bb12", // Hipódromo da Gávea
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },
  {
    trackId: "06b1dfcf-f3ae-4db3-ab25-04e29865ff8d", // Hipódromo Cidade Jardim
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },

  // Chile
  {
    trackId: "b7fef5f2-2fe4-4814-a528-fba3d6bbee01", // Valparaiso Sporting Club
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },
  {
    trackId: "61a34612-26fc-4336-8c71-c3239098ee26", // Club Hípico de Santiago
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },
  {
    trackId: "8cd8068a-d06f-4b40-a8a7-b9d6012afd0f", // Hipódromo Chile
    raceDays: [5, 6],
    racesPerDay: [10, 12],
    meetStart: 60,
    meetEnd: 330,
    regionalSystem: "south_america",
  },

  // Sweden
  {
    trackId: "2a3d24c8-10ff-4a5a-836f-cb4ed2d122dc", // Bro Park
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "ff31fa2d-9594-4cfd-bb3f-a4794eb3c435", // Jägersro
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Norway
  {
    trackId: "60a39c4a-3c65-4ca1-98ba-7bee7a726d43", // Øvrevoll
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Denmark
  {
    trackId: "f1bee849-78d8-4b25-9673-50ded746fa6a", // Klampenborg
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Japan
  {
    trackId: "09aea125-88e4-4e51-b8d7-0475869c6269", // Tokyo
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "075b214f-ebc8-4d46-9e27-154723cedc2a", // Oi
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "d972ca06-de48-474e-a2cf-84afd2f33863", // Kochi
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "9cf4d0aa-31ff-41e7-a581-54d9408a29e3", // Saga
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "184c95d8-cb34-428c-81f3-adfa7179f035", // Chukyo
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "ddd59f86-d11f-4374-90a6-134a861f16bc", // Hanshin
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "7e899665-ba3d-4fa2-88ba-37d6828ec6a4", // Nakayama
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "92caacd1-e771-49a7-9fe8-0de78b3d22a5", // Kyoto
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "84abb980-cc9b-4a62-b825-7b40e9079e88", // Kanazawa
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "d11ab0e2-492a-4f90-9cd9-9323fece32f5", // Monbetsu
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "5d64970b-7d53-4ce7-82eb-565519c87425", // Nagoya
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "e55abf82-49b9-4c1a-9d79-5387e123045a", // Sonoda
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "f5704159-e4e5-4966-88b3-ad6338f92a5f", // Sapporo
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "4ebe446a-b55d-43b3-b589-cf710de809a7", // Kokura
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "19c425f0-da5c-49aa-b419-d51050c5984c", // Fukushima
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "5417f98a-9404-41ac-8d94-9af57c227f47", // Niigata
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "e252ed6b-94c0-4d5f-82a2-6325c312331a", // Hakodate
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "349564e3-4eff-425e-8207-21f181ee4fc9", // Kitakyushu
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "e5575f66-1c09-4385-9b1a-83bf2d538d90", // Ohi
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "838abcdc-ff27-44cf-9212-183e2edb66c0", // Kawasaki
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "dc2854c2-b22e-4fde-8052-81b63b0ceb45", // Funabashi
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "8b58953a-b5ad-41ec-a36c-b0feb5625370", // Urawa
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "9c876506-79bd-4450-8321-a1d65a01658e", // Morioka
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "99a1a2ec-3ef9-4f65-9c5f-13650eb71d8b", // Various
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },
  {
    trackId: "4e5db0cb-d4b2-4c6f-b675-903139668491", // Urawa Kinen
    raceDays: [5, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "japan",
  },

  // Italy
  {
    trackId: "1c52aaa3-3172-4a8c-8b10-fba1f26591a5", // Capannelle
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "24110cb2-5781-46ad-9117-129ec9c3ed95", // San Siro
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // Hong Kong
  {
    trackId: "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec", // Sha Tin
    raceDays: [3, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "asia",
  },
  {
    trackId: "352ca343-eb29-4910-bfa4-e78198d0dc8b", // Happy Valley
    raceDays: [3, 6, 0],
    racesPerDay: [10, 12],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "asia",
  },

  // Great Britain
  {
    trackId: "e8a9c43d-0aa9-45ba-830d-c3ab0d328cbb", // Newmarket
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "30b245c0-68b9-47eb-aef1-03f3c3e4863a", // Newmarket (July)
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "643f2051-687d-4112-88f1-cbbe24620cda", // Newbury
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "b4f6659e-dcf3-4312-bde1-4052492673aa", // Epsom
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "bf517cc6-2210-42ad-a6de-7115abc4ef08", // Ascot
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "02e1e70b-eb7c-49fb-98d8-6646ffc39254", // Sandown
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "20836f34-3da8-4784-89aa-1a8fc313c86f", // York
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "2dab9baa-84dd-437e-ade7-cbd8c320fbd1", // Haydock
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "8c165617-0438-496a-9b10-9a941465b298", // Chester
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "3e89fd5e-9b6a-49e8-8cfd-81a2641bf583", // Doncaster
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "b4480660-0b69-4fd7-9cde-2f15a95c52d7", // Goodwood
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "47d7eb08-478c-47ce-bca3-e1ff36affa9d", // Newcastle
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "c2dadc93-81e8-4844-8b8c-380dfafb8726", // Ayr
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9e", // Kempton
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "1bf057f7-6597-4f69-b0f4-693a142470f7", // Lingfield
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "9d2f4d54-a2a2-4a6d-a442-1dec22bea1c2", // Salisbury
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "80f0810c-bcd8-42ee-8411-99b75f53270e", // Windsor
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // France
  {
    trackId: "003f1249-f839-4831-aceb-f46a27d67f36", // Saint-Cloud
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },
  {
    trackId: "38ebbdbd-9247-4085-845f-ad02896c4161", // Longchamp
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },
  {
    trackId: "43e4a14e-8c8c-4b4d-98f7-f9a47a496b5e", // Deauville
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },
  {
    trackId: "3991d574-f943-4a97-b234-1422ac776412", // Chantilly
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },
  {
    trackId: "719cf456-9864-47b7-9c82-506eaeb254a7", // Vichy
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },
  {
    trackId: "f74061a1-adfd-4fb1-aded-843109961953", // Toulouse
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 320,
    regionalSystem: "europe",
  },

  // Ireland
  {
    trackId: "20175183-67a8-4d6b-9c4d-0942856f8860", // Curragh
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "73892381-380b-4362-bc0e-b499a31efe12", // Leopardstown
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "fa612877-e790-4f68-bec8-3cade3f1e670", // Navan
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "a5b184f5-f04b-4ea7-a0a0-497349edb869", // Naas
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "ec53a32b-9c86-4f8e-8737-28c8b8ddb1d9", // Cork
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "94c11808-6b19-41fe-bf0b-b2f802d0f5c1", // Gowran Park
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "1ac5e4ac-7ddf-4b35-a28f-a2bc7a8107fd", // Fairyhouse
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "bbcc75ec-8d32-466c-9686-1b9deaa116f9", // Dundalk
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // Germany
  {
    trackId: "f9e9b465-6bf9-4767-a866-588e17ecbdb0", // Düsseldorf
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "5921a518-0a80-4133-a438-86067989b1a5", // Cologne
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "739ee5fa-588c-481c-8e8a-529291ba6644", // Baden-Baden
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "49010038-8c9b-4d39-9b51-69461f034924", // Hanover
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "4b6b97b3-ad2e-4039-8acf-fc10347e3452", // Krefeld
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "31458ac8-25d6-4776-9459-3ef1ce2ce6ae", // Hamburg
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "cf2e39ce-7def-41c7-b187-1ca35fdd66c3", // Munich
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "784442f3-6a95-4629-ab99-3dc564a7b71b", // Hoppegarten
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "d3933648-9640-437a-860b-dfe960d6a0c1", // Dortmund
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 90,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // Turkey
  {
    trackId: "841f8821-1eb1-4c88-b3f1-a5c4374cbbbc", // Veliefendi
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // Austria
  {
    trackId: "6b308b0c-6fd9-4416-b06e-7dae37a386ad", // Vienna
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "96921361-a2a0-41db-abc9-3faada7f379c", // Klagenfurt
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "a1a9dede-5d0b-4a84-86c5-0805c4b0b590", // Ebreichsdorf
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "aee7611f-716a-4a79-8142-a3732451b9ed", // Freudenau
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Belgium
  {
    trackId: "9b129f42-f724-43d0-a837-2fb75c32d68c", // Ostend
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "782f6731-c814-4ba3-b2b3-dac462f2890a", // Mons
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Czech Republic
  {
    trackId: "d2e5c01a-fcd2-4500-9123-bd405ce2aaf0", // Prague
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "6a05c40a-eb0a-471d-9b6c-d090a38b5461", // Most
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },
  {
    trackId: "113463f4-3c75-4dfd-9c5b-8f40011dc83b", // Karlovy Vary
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Hungary
  {
    trackId: "d0b902b9-a09f-440e-96f7-d3edbd5d7131", // Kincsem Park
    raceDays: [5, 6, 0],
    racesPerDay: [6, 8],
    meetStart: 90,
    meetEnd: 270,
    regionalSystem: "europe",
  },

  // Spain
  {
    trackId: "23e80c06-3df8-4590-b813-116458225a15", // Madrid
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "37510427-a77d-422f-9113-a8362ae808c4", // San Sebastián
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },
  {
    trackId: "8c8eb875-9aa8-4d8b-90ff-066998e57e4f", // Dos Hermanas
    raceDays: [5, 6, 0],
    racesPerDay: [7, 9],
    meetStart: 60,
    meetEnd: 300,
    regionalSystem: "europe",
  },

  // USA
  {
    trackId: "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", // Churchill Downs
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", // Pimlico
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "d3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", // Belmont Park
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a", // Saratoga
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", // Santa Anita
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", // Keeneland
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", // Del Mar
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e", // Aqueduct
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "d9c0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f", // Oaklawn Park
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "e0d1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a", // Gulfstream Park
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "b53304b4-2747-a9df-c4e0-eae0a22d26d6", // Monmouth Park
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "17811b18-c6f8-189a-e337-3059c7141fc1", // Fair Grounds
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "8f50ddd3-8a52-3d59-1a7c-4dbcfc18f687", // Tampa Bay Downs
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "a3c468c5-780d-be43-eb9b-1c52fd9e5293", // Lone Star Park
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },
  {
    trackId: "a03edeab-959e-1f62-a2ab-fe5e4d872b7d", // Belmont at the Big A
    raceDays: [4, 5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "north_america",
  },

  // Australia
  {
    trackId: "a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d", // Flemington
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "b2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e", // Randwick
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "c3d4e5f6-a7b8-4c9d-0e1f-3a4b5c6d7e8f", // Caulfield
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "d4e5f6a7-b8c9-4d0e-1f2a-4b5c6d7e8f9a", // Moonee Valley
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "e5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9a0b", // Rosehill
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "15077747-ba2f-c5e3-b512-df3dc38e5b48", // Eagle Farm
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "af5bb92b-4c42-3ac2-8309-684ae631a644", // Morphettville
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "australia",
  },

  // Saudi Arabia
  {
    trackId: "f6a7b8c9-d0e1-4f2a-3b4c-6d7e8f9a0b1c", // King Abdulaziz Racecourse
    raceDays: [4, 5],
    racesPerDay: [6, 8],
    meetStart: 1,
    meetEnd: 90,
    regionalSystem: "asia",
  },

  // Singapore
  {
    trackId: "a7b8c9d0-e1f2-4a3b-4c5d-7e8f9a0b1c2d", // Kranji
    raceDays: [5, 6, 0],
    racesPerDay: [8, 10],
    meetStart: 1,
    meetEnd: 365,
    regionalSystem: "asia",
  },
];
