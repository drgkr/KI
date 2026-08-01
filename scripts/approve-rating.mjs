import { readFile, writeFile } from "node:fs/promises";

const movieId = String(process.env.TMDB_MOVIE_ID || process.argv[2] || "").trim();
const pendingFile = new URL("../public/data/pending-scores.json", import.meta.url);
const approvedFile = new URL("../public/data/scores.json", import.meta.url);
const scoreKeys = ["writing", "emotion", "pacing", "performances", "rewatch", "critics", "audience"];

if (!/^\d+$/.test(movieId)) {
  throw new Error("Provide a numeric TMDB movie ID.");
}

const pending = JSON.parse(await readFile(pendingFile, "utf8"));
const approved = JSON.parse(await readFile(approvedFile, "utf8"));
const candidate = pending.ratings?.[movieId];

if (!candidate) {
  throw new Error(`No pending rating exists for TMDB movie ${movieId}.`);
}

if (!candidate.title || !["High", "Medium", "Low"].includes(candidate.confidence)) {
  throw new Error("The proposed rating needs a title and a High, Medium or Low confidence level.");
}

for (const key of scoreKeys) {
  const value = candidate.scores?.[key];
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`${key} must be an integer from 0 to 100.`);
  }
}

if (!Array.isArray(candidate.sources) || candidate.sources.length === 0) {
  throw new Error("The proposed rating must include at least one attributed source.");
}

const sourceWeight = candidate.sources.reduce((total, source) => {
  if (!source.name || !/^https:\/\//.test(source.url || "")) {
    throw new Error("Every source needs a name and an HTTPS URL.");
  }
  if (!Number.isFinite(source.weight) || source.weight <= 0) {
    throw new Error("Every source needs a positive numeric weight.");
  }
  return total + source.weight;
}, 0);

if (sourceWeight !== 100) {
  throw new Error(`Source weights must total 100; found ${sourceWeight}.`);
}

approved.ratings ||= {};
approved.ratings[movieId] = {
  ...candidate,
  assessedAt: new Date().toISOString().slice(0, 10),
};
delete pending.ratings[movieId];

await writeFile(approvedFile, `${JSON.stringify(approved, null, 2)}\n`);
await writeFile(pendingFile, `${JSON.stringify(pending, null, 2)}\n`);
console.log(`Approved ${candidate.title} (${movieId}).`);
