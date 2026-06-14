/**
 * trackKoppenMappings.ts - Maps all 124 tracks to their Koppen climate codes
 *
 * Based on real-world climate classification data.
 */

import type { KoppenCode } from "./koppenTypes";

/** Maps track IDs to their Koppen climate code */
export const TRACK_KOPPEN_MAP: Record<string, KoppenCode> = {
  // ===========================================================================
  // CANADA (4 tracks)
  // ===========================================================================
  "a4e790db-a9ad-458d-9191-817b61b9069c": "Dfa", // Woodbine (Toronto) - Hot-summer humid continental
  "2ba12f6e-dc0d-47e9-9c95-af87fae00890": "Dfa", // Fort Erie - Humid continental
  "98c77f6a-f5b7-4791-aac1-afe5e5969aa3": "Dfb", // Century Mile (Edmonton) - Cooler, Dfb
  "c7447323-b2df-46be-9f99-28e56a41e584": "Cfb", // Hastings (Vancouver) - Oceanic influence

  // ===========================================================================
  // UAE (3 tracks) - Hot Desert
  // ===========================================================================
  "85a3d0b8-a4a9-4ff7-bc18-705874d8da31": "BWh", // Meydan (Dubai)
  "21815495-916b-4f3f-a2d9-51a3f6640152": "BWh", // Abu Dhabi
  "7e62ba21-8d46-41ee-95ce-3a42b0f13dcc": "BWh", // Jebel Ali

  // ===========================================================================
  // SAUDI ARABIA (1 track) - Hot Desert
  // ===========================================================================
  "f6a7b8c9-d0e1-4f2a-3b4c-6d7e8f9a0b1c": "BWh", // King Abdulaziz Racecourse (Riyadh)

  // ===========================================================================
  // ARGENTINA (3 tracks) - Humid Subtropical
  // ===========================================================================
  "271e4541-1500-4872-9340-4ed791fd28b7": "Cfa", // Hipódromo de San Isidro (Buenos Aires)
  "1e1beb62-f786-44a9-8441-b23aa0db1eec": "Cfa", // Hipódromo Argentino de Palermo
  "6546c784-dfb3-4d28-999f-99dc82e90e9a": "Cfa", // Hipódromo de La Plata

  // ===========================================================================
  // BRAZIL (2 tracks) - Tropical Savanna/Rainforest
  // ===========================================================================
  "ce7714db-fa90-4ded-8477-40eec676bb12": "Af", // Hipódromo da Gávea (Rio) - Rainforest
  "06b1dfcf-f3ae-4db3-ab25-04e29865ff8d": "Aw", // Hipódromo Cidade Jardim (São Paulo) - Savanna

  // ===========================================================================
  // CHILE (3 tracks) - Warm-Summer Mediterranean
  // ===========================================================================
  "b7fef5f2-2fe4-4814-a528-fba3d6bbee01": "Csb", // Valparaiso Sporting Club
  "61a34612-26fc-4336-8c71-c3239098ee26": "Csb", // Club Hípico de Santiago
  "8cd8068a-d06f-4b40-a8a7-b9d6012afd0f": "Csb", // Hipódromo Chile

  // ===========================================================================
  // SCANDINAVIA (4 tracks) - Temperate Oceanic
  // ===========================================================================
  "2a3d24c8-10ff-4a5a-836f-cb4ed2d122dc": "Cfb", // Bro Park (Sweden)
  "60a39c4a-3c65-4ca1-98ba-7bee7a726d43": "Cfb", // Øvrevoll (Norway)
  "f1bee849-78d8-4b25-9673-50ded746fa6a": "Cfb", // Klampenborg (Denmark)
  "ff31fa2d-9594-4cfd-bb3f-a4794eb3c435": "Cfb", // Jägersro (Sweden)

  // ===========================================================================
  // JAPAN (28 tracks) - Mostly Humid Subtropical (Cfa), northern are Dfb
  // ===========================================================================
  "09aea125-88e4-4e51-b8d7-0475869c6269": "Cfa", // Tokyo
  "075b214f-ebc8-4d46-9e27-154723cedc2a": "Cfa", // Oi
  "d972ca06-de48-474e-a2cf-84afd2f33863": "Cfa", // Kochi
  "9cf4d0aa-31ff-41e7-a581-54d9408a29e3": "Cfa", // Saga
  "184c95d8-cb34-428c-81f3-adfa7179f035": "Cfa", // Chukyo
  "ddd59f86-d11f-4374-90a6-134a861f16bc": "Cfa", // Hanshin
  "7e899665-ba3d-4fa2-88ba-37d6828ec6a4": "Dfb", // Nakayama (northern Honshu)
  "92caacd1-e771-49a7-9fe8-0de78b3d22a5": "Dfb", // Kyoto (inland, cooler winters)
  "84abb980-cc9b-4a62-b825-7b40e9079e88": "Dfb", // Kanazawa (Sea of Japan side, snowy)
  "d11ab0e2-492a-4f90-9cd9-9323fece32f5": "Cfa", // Monbetsu (coastal, moderated)
  "5d64970b-7d53-4ce7-82eb-565519c87425": "Cfa", // Nagoya
  "e55abf82-49b9-4c1a-9d79-5387e123045a": "Dfb", // Sonoda (inland Kansai, colder)
  "f5704159-e4e5-4966-88b3-ad6338f92a5f": "Dfb", // Morioka (northern, snowy)
  "4ebe446a-b55d-43b3-b589-cf710de809a7": "Cfa", // Kawasaki
  "19c425f0-da5c-49aa-b419-d51050c5984c": "Cfa", // Funabashi
  "5417f98a-9404-41ac-8d94-9af57c227f47": "Dfb", // Urawa (northern Kanto)
  "e252ed6b-94c0-4d5f-82a2-6325c312331a": "Dfb", // Ohi
  "349564e3-4eff-425e-8207-21f181ee4fc9": "Dfb", // Saga (NAR, northern)
  "e5575f66-1c09-4385-9b1a-83bf2d538d90": "Cfa", // Saga (southern)
  "838abcdc-ff27-44cf-9212-183e2edb66c0": "Cfa", // Kawasaki (central)
  "dc2854c2-b22e-4fde-8052-81b63b0ceb45": "Cfa", // Funabashi (central)
  "8b58953a-b5ad-41ec-a36c-b0feb5625370": "Cfa", // Urawa (central Kanto)
  "9c876506-79bd-4450-8321-a1d65a01658e": "Dfb", // Morioka (northern)
  "99a1a2ec-3ef9-4f65-9c5f-13650eb71d8b": "Cfa", // Various (default)
  "8b562557-55ca-4d38-b59f-72fe64ef3861": "Cfa", // Saga (southern)
  "4e5db0cb-d4b2-4c6f-b675-903139668491": "Cfa", // Urawa Kinen

  // ===========================================================================
  // ITALY (2 tracks) - Mediterranean
  // ===========================================================================
  "1c52aaa3-3172-4a8c-8b10-fba1f26591a5": "Csa", // Capannelle (Rome)
  "24110cb2-5781-46ad-9117-129ec9c3ed95": "Csa", // San Siro (Milan - transitional, but Csa)

  // ===========================================================================
  // HONG KONG (2 tracks) - Tropical Savanna
  // ===========================================================================
  "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec": "Aw", // Sha Tin
  "352ca343-eb29-4910-bfa4-e78198d0dc8b": "Aw", // Happy Valley

  // ===========================================================================
  // GREAT BRITAIN (19 tracks) - Temperate Oceanic
  // ===========================================================================
  "e8a9c43d-0aa9-45ba-830d-c3ab0d328cbb": "Cfb", // Newmarket
  "30b245c0-68b9-47eb-aef1-03f3c3e4863a": "Cfb", // Newmarket (July)
  "643f2051-687d-4112-88f1-cbbe24620cda": "Cfb", // Newbury
  "b4f6659e-dcf3-4312-bde1-4052492673aa": "Cfb", // Epsom
  "bf517cc6-2210-42ad-a6de-7115abc4ef08": "Cfb", // Ascot
  "02e1e70b-eb7c-49fb-98d8-6646ffc39254": "Cfb", // Sandown
  "20836f34-3da8-4784-89aa-1a8fc313c86f": "Cfb", // York
  "2dab9baa-84dd-437e-ade7-cbd8c320fbd1": "Cfb", // Haydock
  "8c165617-0438-496a-9b10-9a941465b298": "Cfb", // Chester
  "3e89fd5e-9b6a-49e8-8cfd-81a2641bf583": "Cfb", // Doncaster
  "b4480660-0b69-4fd7-9cde-2f15a95c52d7": "Cfb", // Goodwood
  "a38d2b3b-b048-44a6-b344-6506490f7994": "Cfb", // Newmarket
  "6aef6140-61e5-4262-806e-9cd9008457ba": "Cfb", // York
  "47d7eb08-478c-47ce-bca3-e1ff36affa9d": "Cfb", // Newcastle
  "c2dadc93-81e8-4844-8b8c-380dfafb8726": "Cfb", // Ayr
  "a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9e": "Cfb", // Kempton
  "1bf057f7-6597-4f69-b0f4-693a142470f7": "Cfb", // Lingfield
  "9d2f4d54-a2a2-4a6d-a442-1dec22bea1c2": "Cfb", // Salisbury
  "80f0810c-bcd8-42ee-8411-99b75f53270e": "Cfb", // Windsor

  // ===========================================================================
  // FRANCE (6 tracks) - Temperate Oceanic
  // ===========================================================================
  "003f1249-f839-4831-aceb-f46a27d67f36": "Cfb", // Saint-Cloud
  "38ebbdbd-9247-4085-845f-ad02896c4161": "Cfb", // Longchamp (Paris)
  "43e4a14e-8c8c-4b4d-98f7-f9a47a496b5e": "Cfb", // Deauville (coastal, moderated)
  "3991d574-f943-4a97-b234-1422ac776412": "Cfb", // Chantilly
  "719cf456-9864-47b7-9c82-506eaeb254a7": "Cfb", // Vichy (central, slightly continental)
  "f74061a1-adfd-4fb1-aded-843109961953": "Cfb", // Toulouse (south, transitional)

  // ===========================================================================
  // IRELAND (10 tracks) - Temperate Oceanic
  // ===========================================================================
  "20175183-67a8-4d6b-9c4d-0942856f8860": "Cfb", // Curragh
  "73892381-380b-4362-bc0e-b499a31efe12": "Cfb", // Leopardstown
  "fa612877-e790-4f68-bec8-3cade3f1e670": "Cfb", // Navan
  "a5b184f5-f04b-4ea7-a0a0-497349edb869": "Cfb", // Naas
  "ec53a32b-9c86-4f8e-8737-28c8b8ddb1d9": "Cfb", // Cork
  "94c11808-6b19-41fe-bf0b-b2f802d0f5c1": "Cfb", // Gowran Park
  "1ac5e4ac-7ddf-4b35-a28f-a2bc7a8107fd": "Cfb", // Fairyhouse
  "bbcc75ec-8d32-466c-9686-1b9deaa116f9": "Cfb", // Dundalk
  "9ed3a611-6bf3-4583-a002-70441a0fc3f4": "Cfb", // Longchamp (Ireland entry - likely error in data)

  // ===========================================================================
  // GERMANY (10 tracks) - Humid Continental
  // ===========================================================================
  "f9e9b465-6bf9-4767-a866-588e17ecbdb0": "Dfb", // Düsseldorf
  "5921a518-0a80-4133-a438-86067989b1a5": "Dfb", // Cologne
  "739ee5fa-588c-481c-8e8a-529291ba6644": "Dfb", // Baden-Baden
  "49010038-8c9b-4d39-9b51-69461f034924": "Dfb", // Hanover
  "4b6b97b3-ad2e-4039-8acf-fc10347e3452": "Dfb", // Krefeld
  "31458ac8-25d6-4776-9459-3ef1ce2ce6ae": "Cfb", // Hamburg (coastal, oceanic influence)
  "cf2e39ce-7def-41c7-b187-1ca35fdd66c3": "Dfb", // Munich (inland, more continental)
  "784442f3-6a95-4629-ab99-3dc564a7b71b": "Dfb", // Hoppegarten (Berlin area)
  "d3933648-9640-437a-860b-dfe960d6a0c1": "Dfb", // Dortmund

  // ===========================================================================
  // TURKEY (1 track) - Mediterranean/Humid Continental transitional
  // ===========================================================================
  "841f8821-1eb1-4c88-b3f1-a5c4374cbbbc": "Csa", // Veliefendi (Istanbul)

  // ===========================================================================
  // AUSTRIA (4 tracks) - Humid Continental
  // ===========================================================================
  "6b308b0c-6fd9-4416-b06e-7dae37a386ad": "Dfb", // Vienna
  "96921361-a2a0-41db-abc9-3faada7f379c": "Dfb", // Klagenfurt
  "a1a9dede-5d0b-4a84-86c5-0805c4b0b590": "Dfb", // Ebreichsdorf
  "aee7611f-716a-4a79-8142-a3732451b9ed": "Dfb", // Freudenau

  // ===========================================================================
  // BELGIUM (2 tracks) - Temperate Oceanic
  // ===========================================================================
  "9b129f42-f724-43d0-a837-2fb75c32d68c": "Cfb", // Ostend (coastal)
  "782f6731-c814-4ba3-b2b3-dac462f2890a": "Cfb", // Mons (inland)

  // ===========================================================================
  // CZECH REPUBLIC (4 tracks) - Humid Continental
  // ===========================================================================
  "d2e5c01a-fcd2-4500-9123-bd405ce2aaf0": "Dfb", // Prague
  "6a05c40a-eb0a-471d-9b6c-d090a38b5461": "Dfb", // Most
  "113463f4-3c75-4dfd-9c5b-8f40011dc83b": "Dfb", // Karlovy Vary
  "ae2104a8-5dc8-4609-9ee9-50b0aa4fadd4": "Dfb", // Prague (duplicate?)

  // ===========================================================================
  // HUNGARY (1 track) - Humid Continental
  // ===========================================================================
  "d0b902b9-a09f-440e-96f7-d3edbd5d7131": "Dfb", // Kincsem Park (Budapest)

  // ===========================================================================
  // SPAIN (3 tracks) - Mediterranean (Csa)
  // ===========================================================================
  "23e80c06-3df8-4590-b813-116458225a15": "Csa", // Madrid
  "37510427-a77d-422f-9113-a8362ae808c4": "Csa", // San Sebastián (Basque, wetter but still Csa)
  "8c8eb875-9aa8-4d8b-90ff-066998e57e4f": "Csa", // Dos Hermanas (Andalusia, hotter)

  // ===========================================================================
  // USA (10 tracks) - Mix of Cfa, Dfa, Csa, Aw
  // ===========================================================================
  "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d": "Dfa", // Churchill Downs (Louisville)
  "c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e": "Dfa", // Pimlico (Baltimore area)
  "d3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f": "Dfa", // Belmont Park (NY)
  "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a": "Dfa", // Saratoga (upstate NY)
  "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b": "Csa", // Santa Anita (Southern California)
  "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c": "Dfa", // Keeneland (Kentucky)
  "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d": "Csa", // Del Mar (Southern California)
  "c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e": "Dfa", // Aqueduct (NY)
  "d9c0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f": "Dfa", // Oaklawn Park (Arkansas)
  "e0d1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a": "Aw", // Gulfstream Park (Florida)

  // ===========================================================================
  // AUSTRALIA (5 tracks) - Humid Subtropical / Temperate Oceanic
  // ===========================================================================
  "a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d": "Cfb", // Flemington (Melbourne)
  "b2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e": "Cfa", // Randwick (Sydney)
  "c3d4e5f6-a7b8-4c9d-0e1f-3a4b5c6d7e8f": "Cfb", // Caulfield (Melbourne)
  "d4e5f6a7-b8c9-4d0e-1f2a-4b5c6d7e8f9a": "Cfb", // Moonee Valley (Melbourne)
  "e5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9a0b": "Cfa", // Rosehill (Sydney)

  // ===========================================================================
  // SINGAPORE (1 track) - Tropical Rainforest
  // ===========================================================================
  "a7b8c9d0-e1f2-4a3b-4c5d-7e8f9a0b1c2d": "Af", // Kranji
};

/**
 * Get Koppen code for a track ID
 * @param trackId
 */
export function getTrackKoppen(trackId: string | undefined): KoppenCode {
  if (!trackId) return "Cfb"; // Default to temperate oceanic
  return TRACK_KOPPEN_MAP[trackId] ?? "Cfb";
}
