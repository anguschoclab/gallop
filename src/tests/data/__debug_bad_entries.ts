import { GRADED_RACES, getCountry, getRaceCountry } from "@/data/gradedRaces";
import { TRACK_BY_ID, TRACK_BY_NAME } from "@/data/tracks";

const badTrack = GRADED_RACES.filter((r) => getCountry(r.track) === "Other").map((r) => ({
  key: r.key,
  track: r.track,
}));
const badTrackId = GRADED_RACES.filter((r) => !TRACK_BY_ID[r.trackId]).map((r) => ({
  key: r.key,
  trackId: r.trackId,
}));
const badCountry = GRADED_RACES.filter((r) => getRaceCountry(r) === "Other").map((r) => ({
  key: r.key,
  track: r.track,
  country: r.country,
}));

console.log("Bad tracks (Other):", JSON.stringify(badTrack, null, 2));
console.log("Bad trackIds:", JSON.stringify(badTrackId, null, 2));
console.log("Bad countries:", JSON.stringify(badCountry, null, 2));
