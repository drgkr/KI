# Kollywood Index

A modern, responsive Tamil cinema catalogue with TMDB-powered metadata and a transparent seven-dimension scoring model.

## Features

- Tamil releases pulled from TMDB and sorted newest-first
- Touch-friendly horizontal poster carousel
- Film details, genres, cast, synopsis, confidence and source count
- Editable dimension scores saved in the visitor's browser
- Automatically calculated weighted final score out of 100
- Responsive, accessible editorial design
- Graceful sample catalogue when TMDB is not configured

## Scoring schema

Each movie has a `scores` object with `writing`, `emotion`, `pacing`, `performances`, `rewatch`, `critics`, and `audience`, each an integer from 0–100. The weighted final score is:

```text
(writing × .20) + (emotion × .20) + (pacing × .15) +
(performances × .15) + (rewatch × .15) +
(critics × .10) + (audience × .05)
```

Movie records also include TMDB ID, titles, release date, runtime, poster/backdrop URLs, genres, cast, overview, confidence (`High`, `Medium`, or `Low`) and source count. Scores are intentionally separate from TMDB's audience rating.

## Local setup

1. Install Node.js 22 or later.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Create a free TMDB API key and set `TMDB_API_KEY` in `.env.local`.
5. Start with `npm run dev`, then open the local address shown.

Never commit `.env.local` or a real API key.

## Deployment

### Cloudflare / OpenAI Sites

Connect the GitHub repository and add `TMDB_API_KEY` as a runtime environment variable. The included Vinext configuration produces a Cloudflare Worker-compatible deployment.

### Vercel

Import the repository, add `TMDB_API_KEY` under Environment Variables, and deploy. The included API route keeps the key server-side.

### GitHub Pages

The repository includes a GitHub Actions workflow that builds and publishes the site automatically. In **Settings → Secrets and variables → Actions**, create a repository secret named `TMDB_API_KEY`. Then open **Settings → Pages** and choose **GitHub Actions** as the source. Every push to `main` republishes the site, and a weekly scheduled build refreshes the Tamil catalogue. The key is used only during the private build and is never shipped to visitors.

The catalogue refresh runs every Monday. It retrieves up to 1,000 Tamil films from TMDB, with the newest first, and automatically updates metadata, posters and cast information in that deployment. Films without an approved editorial assessment remain clearly marked **NR**.

## Preparing and approving scores

Public scores use a two-stage process so an unfinished or unverified assessment cannot appear accidentally:

1. Add the proposed record to `public/data/pending-scores.json`, keyed by its numeric TMDB movie ID.
2. Open **Actions → Approve film rating → Run workflow** in GitHub.
3. Enter that TMDB movie ID and run the workflow.
4. The workflow validates all seven scores, the confidence level, source links and a source-weight total of exactly 100.
5. A valid record is moved into `public/data/scores.json`, committed, and published through the normal Pages deployment.

You can still use **Edit scores** on the film detail screen for private experimentation. Browser edits remain only on that device and never overwrite an approved public assessment.

## Automated Gemini research batches

The repository includes an optional evidence-first Gemini workflow. It uses Google Search grounding to discover current review coverage, then makes a separate structured-output request to produce the seven dimension scores. Source URLs must come from the grounded allow-list; the validator rejects invented URLs, duplicate sources, invalid scores, source weights that do not total 100, fewer than three professional critics, or a missing audience signal. Films that fail these checks remain **NR**.

### One-time setup

1. Create a Gemini API key in Google AI Studio.
2. In GitHub, open **Settings → Secrets and variables → Actions**.
3. Add a repository secret named `GEMINI_API_KEY`.
4. Keep the existing `TMDB_API_KEY` secret in the same location.
5. Optionally add an Actions variable named `GEMINI_MODEL`; the default is `gemini-2.5-flash`.

### Prepare a batch

1. Open **Actions → Prepare Gemini film ratings → Run workflow**.
2. Start with a batch size of `10` and start index `0`.
3. Open the completed run summary. It lists prepared ratings and films kept as NR with reasons.
4. Inspect `public/data/pending-scores.json` before approval.

The workflow refreshes the 1,000-film TMDB catalogue privately during the run, skips films that already have approved or pending assessments, and processes at most 25 films per run. It commits only prepared drafts and the audit report—not the temporary catalogue refresh.

### Approve a reviewed batch

Open **Actions → Approve film rating → Run workflow** and enter one of:

- one numeric TMDB movie ID;
- several IDs separated by commas; or
- `all` to approve every currently prepared rating.

Approval performs a second deterministic validation before moving records into the public score database. Use `all` only after reviewing the entire pending batch.

Google Search grounding and Gemini model usage may be billable. A single film can trigger multiple search queries, so use small batches and monitor Google AI Studio usage.

## Data and attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters and images are provided by The Movie Database (TMDB). This independent, non-commercial project is for cultural discovery and commentary. It is not affiliated with any film studio, distributor, critic, Reddit or Letterboxd. All film artwork and trademarks remain the property of their respective owners.
