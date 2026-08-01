import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.TMDB_API_KEY;
const output = new URL("../public/data/movies.json", import.meta.url);
const maxFilms = Math.min(1000, Math.max(1, Number(process.env.TMDB_MAX_FILMS) || 1000));
const discoveryPages = Math.ceil(maxFilms / 20);
const detailBatchSize = 20;

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

const query = {
  api_key: key,
  with_original_language: "ta",
  sort_by: "primary_release_date.desc",
  "primary_release_date.lte": new Date().toISOString().slice(0, 10),
  include_adult: "false",
};

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
const fetchJson = async (url, attempts = 5) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    if (attempt === attempts || (response.status !== 429 && response.status < 500)) {
      throw new Error(`TMDB request failed (${response.status})`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 1000);
  }
};

const pages = [];
for (let start = 1; start <= discoveryPages; start += 10) {
  const pageNumbers = Array.from({ length: Math.min(10, discoveryPages - start + 1) }, (_, index) => start + index);
  const batch = await Promise.all(pageNumbers.map(page => fetchJson(`https://api.themoviedb.org/3/discover/movie?${new URLSearchParams({ ...query, page: String(page) })}`)));
  pages.push(...batch);
}
const discovered = pages.flatMap(page => page.results);

const movies = [];
const selected = discovered.slice(0, maxFilms);
for (let start = 0; start < selected.length; start += detailBatchSize) {
  const batch = await Promise.all(selected.slice(start, start + detailBatchSize).map(async (movie) => {
    const detail = await fetchJson(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${key}&append_to_response=credits`);
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
  movies.push(...batch);
  if (start + detailBatchSize < selected.length) await wait(250);
  console.log(`Prepared ${movies.length}/${selected.length} Tamil films…`);
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify({ movies }, null, 2));
console.log(`Prepared ${movies.length} Tamil films from TMDB.`);
