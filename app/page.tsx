"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scores = { writing: number; emotion: number; pacing: number; performances: number; rewatch: number; critics: number; audience: number };
type Film = { id: number; title: string; originalTitle?: string; year: string; releaseDate: string; runtime?: number; poster?: string; backdrop?: string; genres: string[]; cast: string[]; overview: string; confidence: "High" | "Medium" | "Low"; scores: Scores; sourceCount: number };

const weights: { key: keyof Scores; label: string; weight: number; short: string }[] = [
  { key: "writing", label: "Writing Quality", weight: 20, short: "WR" },
  { key: "emotion", label: "Emotional Impact", weight: 20, short: "EM" },
  { key: "pacing", label: "Engagement & Pacing", weight: 15, short: "EP" },
  { key: "performances", label: "Performances", weight: 15, short: "PF" },
  { key: "rewatch", label: "Rewatchability", weight: 15, short: "RW" },
  { key: "critics", label: "Critical Consensus", weight: 10, short: "CC" },
  { key: "audience", label: "Audience Reception", weight: 5, short: "AR" },
];

const samples: Film[] = [
  { id: 1, title: "Meiyazhagan", originalTitle: "மெய்யழகன்", year: "2024", releaseDate: "2024-09-27", runtime: 158, genres: ["Drama", "Family"], cast: ["Karthi", "Arvind Swamy", "Sri Divya", "Rajkiran"], overview: "A man returns to his hometown and encounters a warm, insistent stranger who seems to know everything about his past.", confidence: "High", sourceCount: 12, scores: { writing: 92, emotion: 95, pacing: 78, performances: 94, rewatch: 88, critics: 91, audience: 90 } },
  { id: 2, title: "Maharaja", originalTitle: "மகாராஜா", year: "2024", releaseDate: "2024-06-14", runtime: 141, genres: ["Thriller", "Drama"], cast: ["Vijay Sethupathi", "Anurag Kashyap", "Mamta Mohandas", "Natarajan Subramaniam"], overview: "A quiet barber walks into a police station to report a peculiar theft, setting off a tightly wound chain of revelations.", confidence: "High", sourceCount: 14, scores: { writing: 88, emotion: 90, pacing: 91, performances: 93, rewatch: 84, critics: 87, audience: 92 } },
  { id: 3, title: "Raayan", originalTitle: "ராயன்", year: "2024", releaseDate: "2024-07-26", runtime: 145, genres: ["Action", "Drama"], cast: ["Dhanush", "S. J. Suryah", "Sundeep Kishan", "Kalidas Jayaram"], overview: "A protective brother is drawn into the violent underworld he tried to escape when his family is threatened.", confidence: "Medium", sourceCount: 8, scores: { writing: 74, emotion: 77, pacing: 80, performances: 86, rewatch: 76, critics: 72, audience: 79 } },
  { id: 4, title: "Garudan", originalTitle: "கருடன்", year: "2024", releaseDate: "2024-05-31", runtime: 135, genres: ["Action", "Drama"], cast: ["Soori", "M. Sasikumar", "Unni Mukundan", "Roshini Haripriyan"], overview: "Loyalties are tested when two childhood friends and their trusted confidant are pulled into a conflict over land and legacy.", confidence: "Medium", sourceCount: 7, scores: { writing: 79, emotion: 82, pacing: 84, performances: 88, rewatch: 77, critics: 80, audience: 84 } },
  { id: 5, title: "Jigarthanda DoubleX", originalTitle: "ஜிகர்தண்டா டபுள்எக்ஸ்", year: "2023", releaseDate: "2023-11-10", runtime: 172, genres: ["Drama", "Action", "Western"], cast: ["Raghava Lawrence", "S. J. Suryah", "Nimisha Sajayan", "Ilavarasu"], overview: "An aspiring filmmaker and a feared gangster find their ambitions entangled in a story about cinema, power and resistance.", confidence: "High", sourceCount: 15, scores: { writing: 91, emotion: 88, pacing: 83, performances: 92, rewatch: 89, critics: 94, audience: 91 } },
];

const total = (scores: Scores) => Math.round(weights.reduce((sum, item) => sum + scores[item.key] * item.weight / 100, 0));

function Poster({ film }: { film: Film }) {
  if (film.poster) return <img src={film.poster} alt={`${film.title} poster`} loading="lazy" decoding="async" />;
  return <div className="poster-art" aria-label={`${film.title} poster placeholder`}><span>{film.originalTitle || "தமிழ்"}</span><strong>{film.title}</strong><i>{film.year}</i></div>;
}

export default function Home() {
  const [films, setFilms] = useState<Film[]>(samples);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<"sample" | "tmdb">("sample");
  const [sortBy, setSortBy] = useState<"year" | "rating">("year");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const rail = useRef<HTMLDivElement>(null);
  const film = films[selected] || films[0];

  useEffect(() => {
    const saved = localStorage.getItem("kollywood-index-scores");
    if (saved) { try { const parsed = JSON.parse(saved); setFilms(current => current.map(item => parsed[item.id] ? { ...item, scores: parsed[item.id] } : item)); } catch {} }
    fetch(`./data/movies.json?v=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(data => { if (data.movies?.length) { setFilms(data.movies); setSelected(0); setSource("tmdb"); } }).catch(() => {});
  }, []);

  const newest = useMemo(() => [...films].sort((a,b) => b.releaseDate.localeCompare(a.releaseDate)), [films]);
  const latest = newest.slice(0, 20);
  const library = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matches = films.filter(item => !term || [item.title, item.originalTitle, item.year, ...item.genres, ...item.cast].some(value => value?.toLocaleLowerCase().includes(term)));
    return matches.sort((a,b) => sortBy === "rating" ? total(b.scores) - total(a.scores) || b.releaseDate.localeCompare(a.releaseDate) : b.releaseDate.localeCompare(a.releaseDate));
  }, [films, query, sortBy]);
  const visibleLibrary = library.slice(0, visibleCount);
  useEffect(() => setVisibleCount(60), [query, sortBy]);
  const activeIndex = newest.findIndex(f => f.id === film.id);
  const choose = (chosen: Film) => { setSelected(films.findIndex(f => f.id === chosen.id)); setEditing(false); document.getElementById("film-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const updateScore = (key: keyof Scores, value: number) => {
    const next = films.map((item) => item.id === film.id ? { ...item, scores: { ...item.scores, [key]: value } } : item);
    setFilms(next);
    localStorage.setItem("kollywood-index-scores", JSON.stringify(Object.fromEntries(next.map(item => [item.id, item.scores]))));
  };
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * Math.min(720, window.innerWidth * .72), behavior: "smooth" });

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Kollywood Index home"><span className="brand-mark">KI</span><span>KOLLYWOOD<br/>INDEX</span></a>
      <nav><a href="#films">New releases</a><a href="#library">Film library</a><a href="#methodology">How we score</a></nav>
      <span className={`source ${source}`}>{source === "tmdb" ? "TMDB catalogue connected" : "Preview catalogue"}</span>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">A curated guide to Tamil cinema</div>
      <h1>Find films worth<br/><em>your time.</em></h1>
      <p>Discover new Tamil releases, compare their strengths and explore every rating through one consistent, transparent method.</p>
      <a className="text-link" href="#library">Browse every film <span>↘</span></a>
      <div className="hero-score" aria-hidden="true"><span>ONE METHOD</span><strong>7</strong><small>measures<br/>per film</small></div>
    </section>

    <section className="film-section" id="films">
      <div className="section-heading"><div><span className="kicker">RECENTLY RELEASED</span><h2>The latest 20 films</h2><p>Scroll through the newest additions, ordered by release date.</p></div><div className="rail-actions"><button onClick={() => scroll(-1)} aria-label="Scroll posters left">←</button><button onClick={() => scroll(1)} aria-label="Scroll posters right">→</button></div></div>
      <div className="poster-rail" ref={rail} tabIndex={0} aria-label="Latest 20 films ordered newest first">
        {latest.map((item, index) => <button className={`poster-card ${item.id === film.id ? "active" : ""}`} key={item.id} onClick={() => choose(item)}>
          <div className="poster-wrap"><Poster film={item}/><span className="rank">{String(index + 1).padStart(2,"0")}</span><span className="card-score">{total(item.scores)}</span></div>
          <div className="poster-meta"><strong>{item.title}</strong><span>{item.year} · {item.genres[0]}</span></div>
        </button>)}
      </div>
      <section className="library" id="library">
        <div className="library-heading"><div><span className="kicker">FULL CATALOGUE</span><h2>Explore all films</h2><p>Search by title, cast or genre, then arrange the collection your way.</p></div><span className="result-count">{library.length} {library.length === 1 ? "film" : "films"}</span></div>
        <div className="library-controls">
          <label className="search-control"><span>Search</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title, actor or genre…"/></label>
          <label className="sort-control"><span>Sort by</span><select value={sortBy} onChange={event => setSortBy(event.target.value as "year" | "rating")}><option value="year">Newest year</option><option value="rating">Highest rated</option></select></label>
        </div>
        {library.length ? <div className="movie-grid" aria-label="All films">
          {visibleLibrary.map(item => <button className={`grid-card ${item.id === film.id ? "active" : ""}`} key={item.id} onClick={() => choose(item)}>
            <div className="poster-wrap"><Poster film={item}/><span className="card-score">{total(item.scores)}</span></div>
            <div className="poster-meta"><strong>{item.title}</strong><span>{item.year} · {item.genres[0]}</span></div>
          </button>)}
        </div> : <div className="empty-state"><strong>No films found</strong><span>Try a different title, actor or genre.</span></div>}
        {visibleLibrary.length < library.length && <button className="load-more" onClick={() => setVisibleCount(count => Math.min(count + 60, library.length))}>Show 60 more films <span>{visibleLibrary.length} of {library.length}</span></button>}
      </section>
    </section>

    <section className="detail" id="film-detail">
      <div className="detail-poster"><Poster film={film}/><span className="selection">INDEX {String(activeIndex + 1).padStart(2,"0")}</span></div>
      <div className="detail-copy">
        <div className="detail-top"><div><span className="kicker">{film.year} · {film.runtime ? `${film.runtime} MIN · ` : ""}{film.genres.join(" / ")}</span><h2>{film.title}</h2><p className="tamil-title">{film.originalTitle}</p></div><div className="final-score"><strong>{total(film.scores)}</strong><span>/100</span></div></div>
        <p className="overview">{film.overview}</p>
        <div className="cast"><span>FEATURING</span><p>{film.cast.join(" · ")}</p></div>
        <div className="score-head"><div><span className="kicker">RATING PROFILE</span><p>Each measure contributes according to its published weight.</p></div><button className="edit" onClick={() => setEditing(!editing)}>{editing ? "Save ratings" : "Adjust ratings"}</button></div>
        <div className="score-list">
          {weights.map(item => <div className="score-row" key={item.key}>
            <span className="abbr">{item.short}</span><div className="metric"><div><strong>{item.label}</strong><span>{item.weight}% weight</span></div><div className="bar"><i style={{width: `${film.scores[item.key]}%`}}/></div></div>
            {editing ? <input aria-label={`${item.label} score`} type="number" min="0" max="100" value={film.scores[item.key]} onChange={e => updateScore(item.key, Math.max(0, Math.min(100, Number(e.target.value))))}/> : <strong className="metric-score">{film.scores[item.key]}</strong>}
            <small>+{(film.scores[item.key] * item.weight / 100).toFixed(1)}</small>
          </div>)}
        </div>
        <div className={`confidence ${film.confidence.toLowerCase()}`}><span>EVIDENCE</span><strong>{film.confidence}</strong><p>{film.sourceCount} sources considered · {film.confidence === "High" ? "Broad agreement across major reviews" : film.confidence === "Medium" ? "Useful coverage with a mixed verdict" : "A preliminary view based on limited coverage"}</p></div>
      </div>
    </section>

    <section className="method" id="methodology">
      <div className="method-intro"><span className="kicker">HOW RATINGS WORK</span><h2>One clear standard.<br/>Every release.</h2><p>Each film is assessed across the same seven measures. The result combines critical evidence, audience response and craft—not a single reviewer’s personal preference.</p></div>
      <div className="formula">
        {weights.map((item, i) => <div className="formula-row" key={item.key}><span>0{i+1}</span><strong>{item.label}</strong><b>{item.weight}%</b></div>)}
        <div className="equation"><span>OVERALL RATING</span><code>Σ (measure × weight) = rating out of 100</code></div>
      </div>
    </section>

    <section className="critic-model">
      <div><span className="kicker">REVIEWER BALANCE</span><h2>Industry knowledge.<br/>Local perspective.</h2><p>Every language has its own reviewing culture. Tamil, Telugu, Hindi, Malayalam and Kannada films therefore draw on critics who understand that specific industry.</p><p>For Tamil cinema, the panel may include established voices such as Baradwaj Rangan and Blue Sattai Maran. Experience and consistency carry weight, while a broader mix of reviewers prevents one opinion from dominating.</p></div>
      <div className="weight-stack">
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Lead critic</span><b>~20%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Second lead critic</span><b>~20%</b></div>
        <div style={{"--size":"40%"} as React.CSSProperties}><span>Additional reputable critics</span><b>~40%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Audience signal <small>Reddit · Letterboxd</small></span><b>~20%</b></div>
      </div>
    </section>

    <section className="confidence-explain"><div><span className="kicker">EVIDENCE LEVEL</span><h2>Know how firmly<br/>a rating stands.</h2><p>This separate indicator shows how much trustworthy material supports a rating. Strong films with sparse coverage remain clearly marked as provisional.</p></div><div className="confidence-grid"><article><i></i><strong>High</strong><p>Extensive coverage with broad agreement</p></article><article><i></i><strong>Medium</strong><p>Good coverage with a divided response</p></article><article><i></i><strong>Low</strong><p>Early assessment from limited material</p></article></div></section>

    <footer id="about"><div className="brand footer-brand"><span className="brand-mark">KI</span><span>KOLLYWOOD<br/>INDEX</span></div><p className="disclaimer"><strong>Data & attribution</strong><br/>This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters and images are provided by The Movie Database (TMDB). This independent, non-commercial project is for cultural discovery and commentary. It is not affiliated with any film studio, distributor, critic, Reddit or Letterboxd. All film artwork and trademarks remain the property of their respective owners.</p><p className="copyright">© {new Date().getFullYear()} Kollywood Index<br/>Built for thoughtful cinema discovery.</p></footer>
  </main>;
}
