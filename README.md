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

## Editing scores

Select a film, choose **Edit scores**, and enter values from 0–100. Changes persist in that browser using local storage. For a shared production database, connect the same schema to D1, Supabase, or another datastore and add administrator authentication.

## Data and attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters and images are provided by The Movie Database (TMDB). This independent, non-commercial project is for cultural discovery and commentary. It is not affiliated with any film studio, distributor, critic, Reddit or Letterboxd. All film artwork and trademarks remain the property of their respective owners.
