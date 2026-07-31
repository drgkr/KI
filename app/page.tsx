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
  if (film.poster) return <img src={film.poster} alt={`${film.title} poster`} />;
  return <div className="poster-art" aria-label={`${film.title} poster placeholder`}><span>{film.originalTitle || "தமிழ்"}</span><strong>{film.title}</strong><i>{film.year}</i></div>;
}

export default function Home() {
  const [films, setFilms] = useState<Film[]>(samples);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<"sample" | "tmdb">("sample");
  const rail = useRef<HTMLDivElement>(null);
  const film = films[selected] || films[0];

  useEffect(() => {
    const saved = localStorage.getItem("kollywood-index-scores");
    if (saved) { try { const parsed = JSON.parse(saved); setFilms(current => current.map(item => parsed[item.id] ? { ...item, scores: parsed[item.id] } : item)); } catch {} }
    fetch("./data/movies.json").then(r => r.ok ? r.json() : Promise.reject()).then(data => { if (data.movies?.length) { setFilms(data.movies); setSelected(0); setSource("tmdb"); } }).catch(() => {});
  }, []);

  const sorted = useMemo(() => [...films].sort((a,b) => b.releaseDate.localeCompare(a.releaseDate)), [films]);
  const activeIndex = sorted.findIndex(f => f.id === film.id);
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
      <nav><a href="#films">Films</a><a href="#methodology">Methodology</a><a href="#about">About</a></nav>
      <span className={`source ${source}`}>{source === "tmdb" ? "Live TMDB catalogue" : "Sample catalogue"}</span>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow">Tamil cinema, scored with context.</div>
      <h1>Beyond the<br/><em>first-day verdict.</em></h1>
      <p>A considered index of Tamil films. Seven dimensions, one transparent formula, and the context to understand every score.</p>
      <a className="text-link" href="#films">Explore the index <span>↘</span></a>
      <div className="hero-score" aria-hidden="true"><span>THE FORMULA</span><strong>7</strong><small>dimensions<br/>one score</small></div>
    </section>

    <section className="film-section" id="films">
      <div className="section-heading"><div><span className="kicker">THE LATEST</span><h2>New to the index</h2></div><div className="rail-actions"><button onClick={() => scroll(-1)} aria-label="Scroll posters left">←</button><button onClick={() => scroll(1)} aria-label="Scroll posters right">→</button></div></div>
      <div className="poster-rail" ref={rail} tabIndex={0} aria-label="Films ordered newest first">
        {sorted.map((item, index) => <button className={`poster-card ${item.id === film.id ? "active" : ""}`} key={item.id} onClick={() => choose(item)}>
          <div className="poster-wrap"><Poster film={item}/><span className="rank">{String(index + 1).padStart(2,"0")}</span><span className="card-score">{total(item.scores)}</span></div>
          <div className="poster-meta"><strong>{item.title}</strong><span>{item.year} · {item.genres[0]}</span></div>
        </button>)}
      </div>
    </section>

    <section className="detail" id="film-detail">
      <div className="detail-poster"><Poster film={film}/><span className="selection">INDEX {String(activeIndex + 1).padStart(2,"0")}</span></div>
      <div className="detail-copy">
        <div className="detail-top"><div><span className="kicker">{film.year} · {film.runtime ? `${film.runtime} MIN · ` : ""}{film.genres.join(" / ")}</span><h2>{film.title}</h2><p className="tamil-title">{film.originalTitle}</p></div><div className="final-score"><strong>{total(film.scores)}</strong><span>/100</span></div></div>
        <p className="overview">{film.overview}</p>
        <div className="cast"><span>CAST</span><p>{film.cast.join(" · ")}</p></div>
        <div className="score-head"><div><span className="kicker">SCORE BREAKDOWN</span><p>Weighted contribution shown at right</p></div><button className="edit" onClick={() => setEditing(!editing)}>{editing ? "Done editing" : "Edit scores"}</button></div>
        <div className="score-list">
          {weights.map(item => <div className="score-row" key={item.key}>
            <span className="abbr">{item.short}</span><div className="metric"><div><strong>{item.label}</strong><span>{item.weight}% weight</span></div><div className="bar"><i style={{width: `${film.scores[item.key]}%`}}/></div></div>
            {editing ? <input aria-label={`${item.label} score`} type="number" min="0" max="100" value={film.scores[item.key]} onChange={e => updateScore(item.key, Math.max(0, Math.min(100, Number(e.target.value))))}/> : <strong className="metric-score">{film.scores[item.key]}</strong>}
            <small>+{(film.scores[item.key] * item.weight / 100).toFixed(1)}</small>
          </div>)}
        </div>
        <div className={`confidence ${film.confidence.toLowerCase()}`}><span>CONFIDENCE</span><strong>{film.confidence}</strong><p>{film.sourceCount} sources reviewed · {film.confidence === "High" ? "Multiple major critics broadly agree" : film.confidence === "Medium" ? "Some coverage, with mixed consensus" : "Limited critic coverage"}</p></div>
      </div>
    </section>

    <section className="method" id="methodology">
      <div className="method-intro"><span className="kicker">OUR METHODOLOGY</span><h2>Same formula.<br/>Every film.</h2><p>Every film is run through the same weighted process. The score is a synthesis of evidence—not one person’s taste, star rating or opening-weekend noise.</p></div>
      <div className="formula">
        {weights.map((item, i) => <div className="formula-row" key={item.key}><span>0{i+1}</span><strong>{item.label}</strong><b>{item.weight}%</b></div>)}
        <div className="equation"><span>FINAL SCORE</span><code>Σ (dimension score × weight) = score / 100</code></div>
      </div>
    </section>

    <section className="critic-model">
      <div><span className="kicker">CRITIC WEIGHTING MODEL</span><h2>Local voices.<br/>Properly weighted.</h2><p>Critic panels are language-specific. Tamil, Telugu, Hindi, Malayalam and Kannada releases each draw on established voices local to that industry—not one fixed global list.</p><p>For Tamil cinema, a representative panel may include critics such as Baradwaj Rangan and Blue Sattai Maran. Reputation, body of work and industry context matter; weighting limits the effect of a small or unrepresentative sample.</p></div>
      <div className="weight-stack">
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Lead critic</span><b>~20%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Second lead critic</span><b>~20%</b></div>
        <div style={{"--size":"40%"} as React.CSSProperties}><span>Additional reputable critics</span><b>~40%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Audience signal <small>Reddit · Letterboxd</small></span><b>~20%</b></div>
      </div>
    </section>

    <section className="confidence-explain"><div><span className="kicker">CONFIDENCE SCORE</span><h2>A score needs context.</h2><p>Confidence measures how much reliable source material informed the score. It is separate from quality: a brilliant score built on thin coverage is still flagged.</p></div><div className="confidence-grid"><article><i></i><strong>High</strong><p>Multiple major critics broadly agree</p></article><article><i></i><strong>Medium</strong><p>Some coverage, mixed consensus</p></article><article><i></i><strong>Low</strong><p>Limited critic coverage</p></article></div></section>

    <footer id="about"><div className="brand footer-brand"><span className="brand-mark">KI</span><span>KOLLYWOOD<br/>INDEX</span></div><p className="disclaimer"><strong>Data & attribution</strong><br/>This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data, posters and images are provided by The Movie Database (TMDB). This independent, non-commercial project is for cultural discovery and commentary. It is not affiliated with any film studio, distributor, critic, Reddit or Letterboxd. All film artwork and trademarks remain the property of their respective owners.</p><p className="copyright">© {new Date().getFullYear()} Kollywood Index<br/>Built for thoughtful cinema discovery.</p></footer>
  </main>;
}
