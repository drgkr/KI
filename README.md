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

## Data and attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters and images are provided by The Movie Database (TMDB). This independent, non-commercial project is for cultural discovery and commentary. It is not affiliated with any film studio, distributor, critic, Reddit or Letterboxd. All film artwork and trademarks remain the property of their respective owners.
