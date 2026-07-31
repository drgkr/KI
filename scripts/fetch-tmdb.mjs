import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.TMDB_API_KEY;
const output = new URL("../public/data/movies.json", import.meta.url);

if (!key) {
  console.log("TMDB_API_KEY is not set; publishing the curated sample catalogue.");
  process.exit(0);
}

const defaultScores = {
  writing: 75,
  emotion: 75,
  pacing: 75,
  performances: 75,
  rewatch: 75,
  critics: 75,
  audience: 75,
};

const query = new URLSearchParams({
  api_key: key,
  with_original_language: "ta",
  sort_by: "primary_release_date.desc",
  "primary_release_date.lte": new Date().toISOString().slice(0, 10),
  include_adult: "false",
  page: "1",
});

const discovery = await fetch(`https://api.themoviedb.org/3/discover/movie?${query}`);
if (!discovery.ok) throw new Error(`TMDB discovery failed (${discovery.status})`);
const data = await discovery.json();

const movies = await Promise.all(data.results.slice(0, 16).map(async (movie) => {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${key}&append_to_response=credits`);
  if (!response.ok) throw new Error(`TMDB details failed for ${movie.id}`);
  const detail = await response.json();
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    year: movie.release_date?.slice(0, 4) || "—",
    releaseDate: movie.release_date || "0000-00-00",
    runtime: detail.runtime,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
    genres: detail.genres?.map((genre) => genre.name) || [],
    cast: detail.credits?.cast?.slice(0, 5).map((person) => person.name) || [],
    overview: movie.overview || "Synopsis unavailable.",
    confidence: "Low",
    sourceCount: 0,
    scores: defaultScores,
  };
}));

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify({ movies }, null, 2));
console.log(`Prepared ${movies.length} Tamil films from TMDB.`);
