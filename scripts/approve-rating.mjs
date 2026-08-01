import { readFile, writeFile } from "node:fs/promises";

const selection = String(process.env.TMDB_MOVIE_ID || process.argv[2] || "").trim();
const pendingFile = new URL("../public/data/pending-scores.json", import.meta.url);
const approvedFile = new URL("../public/data/scores.json", import.meta.url);
const scoreKeys = ["writing", "emotion", "pacing", "performances", "rewatch", "critics", "audience"];
const allowedKinds = ["Lead critic", "Second lead critic", "Additional critic", "Audience"];

const pending = JSON.parse(await readFile(pendingFile, "utf8"));
const approved = JSON.parse(await readFile(approvedFile, "utf8"));
const pendingIds = Object.keys(pending.ratings || {});
const ids = selection.toLowerCase() === "all"
  ? pendingIds
  : selection.split(",").map(value => value.trim()).filter(Boolean);

if (!ids.length || ids.some(id => !/^\d+$/.test(id))) {
  throw new Error("Provide one numeric TMDB ID, comma-separated IDs, or all.");
}

function validate(candidate, movieId) {
  if (!candidate) throw new Error(`No pending rating exists for TMDB movie ${movieId}.`);
  if (!candidate.title || !["High", "Medium", "Low"].includes(candidate.confidence)) {
    throw new Error(`${movieId}: rating needs a title and High, Medium or Low confidence.`);
  }
  for (const key of scoreKeys) {
    const value = candidate.scores?.[key];
    if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error(`${movieId}: ${key} must be an integer from 0 to 100.`);
  }
  if (!Array.isArray(candidate.sources) || candidate.sources.length < 4 || candidate.sources.length > 10) {
    throw new Error(`${movieId}: rating must include 4–10 attributed sources.`);
  }
  let criticCount = 0;
  let audienceCount = 0;
  const seen = new Set();
  const sourceWeight = candidate.sources.reduce((total, source) => {
    if (!source.name || !/^https:\/\//.test(source.url || "") || seen.has(source.url)) throw new Error(`${movieId}: every source needs a unique HTTPS URL and name.`);
    if (!allowedKinds.includes(source.kind)) throw new Error(`${movieId}: invalid source kind.`);
    if (!Number.isFinite(source.weight) || source.weight <= 0) throw new Error(`${movieId}: every source needs a positive weight.`);
    seen.add(source.url);
    if (source.kind === "Audience") audienceCount += 1; else criticCount += 1;
    return total + source.weight;
  }, 0);
  if (sourceWeight !== 100) throw new Error(`${movieId}: source weights total ${sourceWeight}, not 100.`);
  if (criticCount < 3 || audienceCount < 1) throw new Error(`${movieId}: needs at least 3 critic sources and 1 audience source.`);
}

for (const movieId of ids) validate(pending.ratings?.[movieId], movieId);
approved.ratings ||= {};
for (const movieId of ids) {
  approved.ratings[movieId] = { ...pending.ratings[movieId], assessedAt: new Date().toISOString().slice(0, 10) };
  delete pending.ratings[movieId];
}

await writeFile(approvedFile, `${JSON.stringify(approved, null, 2)}\n`);
await writeFile(pendingFile, `${JSON.stringify(pending, null, 2)}\n`);
console.log(`Approved ${ids.length} rating${ids.length === 1 ? "" : "s"}: ${ids.join(", ")}.`);
