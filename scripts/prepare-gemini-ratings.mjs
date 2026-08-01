import { readFile, writeFile } from "node:fs/promises";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const batchSize = Math.min(25, Math.max(1, Number(process.env.RATING_BATCH_SIZE) || 10));
const startIndex = Math.max(0, Number(process.env.RATING_START_INDEX) || 0);
const moviesFile = new URL("../public/data/movies.json", import.meta.url);
const approvedFile = new URL("../public/data/scores.json", import.meta.url);
const pendingFile = new URL("../public/data/pending-scores.json", import.meta.url);
const reportFile = new URL("../public/data/scoring-report.json", import.meta.url);
const scoreKeys = ["writing", "emotion", "pacing", "performances", "rewatch", "critics", "audience"];

if (!apiKey) throw new Error("GEMINI_API_KEY is required.");

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const titleKey = movie => `${movie.title}-${movie.year || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const cleanUrl = value => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
};

async function callGemini(body, attempts = 5) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (response.ok) return response.json();
    const message = await response.text();
    if (attempt === attempts || (response.status !== 429 && response.status < 500)) {
      throw new Error(`Gemini request failed (${response.status}): ${message.slice(0, 300)}`);
    }
    await wait(attempt * 2500);
  }
}

function responseText(response) {
  return response.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n").trim() || "";
}

function groundedSources(response) {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  return chunks.flatMap(chunk => {
    const url = cleanUrl(chunk.web?.uri);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ title: chunk.web?.title || new URL(url).hostname, url }];
  }).slice(0, 15);
}

function distribute(total, count) {
  if (!count) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function weightSources(sources) {
  const critics = sources.filter(source => source.category === "critic");
  const audience = sources.filter(source => source.category === "audience");
  const extraWeights = distribute(40, Math.max(0, critics.length - 2));
  const audienceWeights = distribute(20, audience.length);
  return [
    ...critics.map((source, index) => ({
      name: source.name,
      url: source.url,
      kind: index === 0 ? "Lead critic" : index === 1 ? "Second lead critic" : "Additional critic",
      weight: index < 2 ? 20 : extraWeights[index - 2],
    })),
    ...audience.map((source, index) => ({ name: source.name, url: source.url, kind: "Audience", weight: audienceWeights[index] })),
  ];
}

const scoringSchema = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "consensus", "selectedSources"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: scoreKeys,
      properties: Object.fromEntries(scoreKeys.map(key => [key, { type: "integer", minimum: 0, maximum: 100 }])),
    },
    consensus: { type: "string", enum: ["broad", "mixed", "limited"] },
    selectedSources: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceIndex", "name", "category"],
        properties: {
          sourceIndex: { type: "integer", minimum: 0 },
          name: { type: "string" },
          category: { type: "string", enum: ["critic", "audience"] },
        },
      },
    },
  },
};

async function prepareMovie(movie) {
  const identity = `${movie.title} (${movie.year}), original Tamil title: ${movie.originalTitle || "unknown"}, director/cast context: ${(movie.cast || []).join(", ")}`;
  const researchPrompt = `Research the Tamil film ${identity} for a transparent film-rating database. Find up to 10 distinct, attributable sources: prioritise established Tamil/Indian professional reviews (The Hindu, Indian Express, Cinema Express, Times of India, India Today, NDTV, Hollywood Reporter India, Baradwaj Rangan/Galatta Plus and comparable publications), then audience signals such as IMDb, Letterboxd, Rotten Tomatoes and a relevant r/kollywood discussion. Verify every result is about this exact film and release year. Summarise only evidence relevant to writing, emotional impact, pacing, performances, rewatchability, critical consensus and audience reception. Do not invent reviews, ratings, quotations or URLs. Ignore piracy, download and low-quality SEO pages. If coverage is thin, say so clearly.`;
  const research = await callGemini({ contents: [{ role: "user", parts: [{ text: researchPrompt }] }], tools: [{ google_search: {} }] });
  const sources = groundedSources(research);
  if (sources.length < 4) throw new Error(`Only ${sources.length} grounded sources were returned.`);

  const analysisPrompt = `You are scoring ${identity}. Use ONLY the grounded research and numbered source allow-list below. Never add a source that is not in the allow-list. Select no more than 10 sources, including at least 3 professional critic sources and at least 1 audience source. Scores must be independently justified by the evidence; do not copy an aggregate rating into every dimension. Apply a conservative 0-100 scale where 50 is mixed/average, 70 is good, 80 is very good and 90+ is exceptional. Rewatchability is an evidence-based estimate, not a popularity synonym.\n\nGROUNDED RESEARCH:\n${responseText(research)}\n\nSOURCE ALLOW-LIST:\n${sources.map((source, index) => `${index}: ${source.title} — ${source.url}`).join("\n")}`;
  const analysis = await callGemini({
    contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: scoringSchema, temperature: 0.15 },
  });
  const parsed = JSON.parse(responseText(analysis));
  const selected = [];
  const used = new Set();
  for (const item of parsed.selectedSources || []) {
    const source = sources[item.sourceIndex];
    if (!source || used.has(source.url)) continue;
    used.add(source.url);
    selected.push({ name: String(item.name || source.title).slice(0, 140), url: source.url, category: item.category });
  }
  const criticCount = selected.filter(source => source.category === "critic").length;
  const audienceCount = selected.filter(source => source.category === "audience").length;
  if (criticCount < 3 || audienceCount < 1) throw new Error(`Insufficient source mix (${criticCount} critics, ${audienceCount} audience).`);
  for (const key of scoreKeys) {
    if (!Number.isInteger(parsed.scores?.[key]) || parsed.scores[key] < 0 || parsed.scores[key] > 100) throw new Error(`Invalid ${key} score.`);
  }
  const weighted = weightSources(selected);
  if (weighted.reduce((sum, source) => sum + source.weight, 0) !== 100) throw new Error("Source weights did not total 100.");
  const confidence = selected.length >= 6 && criticCount >= 4 && parsed.consensus === "broad" ? "High" : "Medium";
  return { title: movie.title, assessedAt: new Date().toISOString().slice(0, 10), confidence, scores: parsed.scores, sources: weighted };
}

const [catalogue, approved, pending] = await Promise.all([readJson(moviesFile), readJson(approvedFile), readJson(pendingFile)]);
pending.ratings ||= {};
const candidates = (catalogue.movies || [])
  .filter(movie => !approved.ratings?.[String(movie.id)] && !approved.ratings?.[titleKey(movie)] && !pending.ratings?.[String(movie.id)] && !pending.ratings?.[titleKey(movie)])
  .slice(startIndex, startIndex + batchSize);
if (!candidates.length) throw new Error("No unscored films were found in the requested batch.");

const report = { generatedAt: new Date().toISOString(), model, startIndex, batchSize, prepared: [], notRated: [] };
for (const [index, movie] of candidates.entries()) {
  console.log(`Researching ${index + 1}/${candidates.length}: ${movie.title} (${movie.year})`);
  try {
    const rating = await prepareMovie(movie);
    pending.ratings[String(movie.id)] = rating;
    report.prepared.push({ id: movie.id, title: movie.title, confidence: rating.confidence, sources: rating.sources.length });
  } catch (error) {
    report.notRated.push({ id: movie.id, title: movie.title, reason: error.message });
  }
  if (index + 1 < candidates.length) await wait(1500);
}

await writeFile(pendingFile, `${JSON.stringify(pending, null, 2)}\n`);
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Prepared ${report.prepared.length}; kept ${report.notRated.length} as NR.`);
