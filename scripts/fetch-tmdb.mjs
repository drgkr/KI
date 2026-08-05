import { mkdir, readFile, writeFile } from "node:fs/promises";

const key = process.env.TMDB_API_KEY;
const output = new URL("../public/data/movies.json", import.meta.url);
const historyFile = new URL("../public/data/catalogue-history.json", import.meta.url);
const maxFilms = Math.min(1000, Math.max(1, Number(process.env.TMDB_MAX_FILMS) || 1000));
const refreshMode = process.env.CATALOGUE_REFRESH_MODE || "reuse";
const discoveryPages = Math.ceil(maxFilms / 20);
const detailBatchSize = 20;

if (!key) {
  console.log("TMDB_API_KEY is not set; publishing the curated sample catalogue.");
  process.exit(0);
}

const ratingsFile = new URL("../public/data/scores.json", import.meta.url);
let approvedRatings = {};
try {
  const scoreData = JSON.parse(await readFile(ratingsFile, "utf8"));
  approvedRatings = scoreData.ratings || {};
} catch {
  console.log("No approved ratings file found; films will be published as not yet rated.");
}

const query = {
  api_key: key,
  with_original_language: "ta",
  sort_by: "primary_release_date.desc",
  "primary_release_date.lte": new Date().toISOString().slice(0, 10),
  include_adult: "false",
};

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
const titleRatingKey = (movie) => `${movie.title}-${movie.release_date?.slice(0, 4) || ""}`
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");
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

const selected = discovered.slice(0, maxFilms);
let catalogueHistory = { movieIds: [], newMovieIds: [], refreshedAt: null };
try {
  catalogueHistory = { ...catalogueHistory, ...JSON.parse(await readFile(historyFile, "utf8")) };
} catch {
  console.log("No catalogue history found; this run will establish the comparison baseline.");
}

const selectedIds = selected.map(movie => movie.id);
const selectedIdSet = new Set(selectedIds);
let newMovieIds = new Set((catalogueHistory.newMovieIds || []).filter(id => selectedIdSet.has(id)));
if (refreshMode === "weekly") {
  const previousIds = new Set(catalogueHistory.movieIds || []);
  newMovieIds = previousIds.size ? new Set(selectedIds.filter(id => !previousIds.has(id))) : new Set();
} else if (refreshMode === "baseline") {
  newMovieIds = new Set();
}

const movies = [];
for (let start = 0; start < selected.length; start += detailBatchSize) {
  const batch = await Promise.all(selected.slice(start, start + detailBatchSize).map(async (movie) => {
    const detailParams = new URLSearchParams({
      api_key: key,
      append_to_response: "credits,watch/providers,images",
      include_image_language: "ta,en,null",
    });
    const detail = await fetchJson(`https://api.themoviedb.org/3/movie/${movie.id}?${detailParams}`);
    const rating = approvedRatings[String(movie.id)] || approvedRatings[titleRatingKey(movie)];
    const ukWatch = detail["watch/providers"]?.results?.GB;
    const alternatePoster = detail.images?.posters?.find(image => image.file_path)?.file_path;
    const alternateBackdrop = detail.images?.backdrops?.find(image => image.file_path)?.file_path;
    const posterPath = movie.poster_path || detail.poster_path || alternatePoster || movie.backdrop_path || detail.backdrop_path || alternateBackdrop || null;
    const watchProviders = (ukWatch?.flatrate || []).map(provider => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logo: provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : null,
    }));
    return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    year: movie.release_date?.slice(0, 4) || "—",
    releaseDate: movie.release_date || "0000-00-00",
    runtime: detail.runtime,
    poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
    genres: detail.genres?.map((genre) => genre.name) || [],
    cast: detail.credits?.cast?.slice(0, 5).map((person) => person.name) || [],
    overview: movie.overview || "Synopsis unavailable.",
    watchProviders,
    watchLink: ukWatch?.link || null,
    confidence: rating?.confidence || null,
    sourceCount: rating?.sources?.length || 0,
    sources: rating?.sources || [],
    scores: rating?.scores || null,
    ratingStatus: rating ? "rated" : "unrated",
    isNew: newMovieIds.has(movie.id),
    };
  }));
  movies.push(...batch);
  if (start + detailBatchSize < selected.length) await wait(250);
  console.log(`Prepared ${movies.length}/${selected.length} Tamil films…`);
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
const generatedAt = new Date().toISOString();
await writeFile(output, JSON.stringify({ generatedAt, weeklyNewCount: newMovieIds.size, movies }, null, 2));
if (refreshMode === "weekly" || refreshMode === "baseline") {
  await writeFile(historyFile, JSON.stringify({ movieIds: selectedIds, newMovieIds: [...newMovieIds], refreshedAt: generatedAt }, null, 2));
}
console.log(`Prepared ${movies.length} Tamil films from TMDB; ${newMovieIds.size} marked new this week (${refreshMode} mode).`);
