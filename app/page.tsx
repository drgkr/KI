"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scores = { writing: number; emotion: number; pacing: number; performances: number; rewatch: number; critics: number; audience: number };
type EvidenceSource = { name: string; url: string; kind: "Lead critic" | "Second lead critic" | "Additional critic" | "Audience"; weight: number };
type WatchProvider = { id: number; name: string; logo?: string | null };
type Film = { id: number; title: string; originalTitle?: string; year: string; releaseDate: string; runtime?: number; poster?: string; backdrop?: string; genres: string[]; cast: string[]; overview: string; watchProviders?: WatchProvider[]; watchLink?: string | null; confidence: "High" | "Medium" | "Low" | null; scores: Scores | null; sourceCount: number; sources?: EvidenceSource[]; ratingStatus?: "rated" | "unrated" | "draft" };

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
  { id: 1, title: "Meiyazhagan", originalTitle: "மெய்யழகன்", year: "2024", releaseDate: "2024-09-27", runtime: 158, genres: ["Drama", "Family"], cast: ["Karthi", "Arvind Swamy", "Sri Divya", "Rajkiran"], overview: "A man returns to his hometown and encounters a warm, insistent stranger who seems to know everything about his past.", confidence: null, sourceCount: 0, scores: null, ratingStatus: "unrated" },
];

const total = (scores: Scores | null) => scores ? Math.round(weights.reduce((sum, item) => sum + scores[item.key] * item.weight / 100, 0)) : null;
const scoreColour = (score: number) => {
  const hue = score <= 50 ? score * 0.96 : 48 + (score - 50) * 1.74;
  return `hsl(${hue} 72% 42%)`;
};

function Poster({ film }: { film: Film }) {
  if (film.poster) return <img src={film.poster} alt={`${film.title} poster`} loading="lazy" decoding="async" />;
  return <div className="poster-art" aria-label={`${film.title} poster placeholder`}><span>{film.originalTitle || "தமிழ்"}</span><strong>{film.title}</strong><i>{film.year}</i></div>;
}

function ScoreMeter({ film }: { film: Film }) {
  const score = total(film.scores);
  return <div className={`score-meter ${score === null ? "unrated" : ""}`} aria-label={score === null ? "Not rated" : `Score ${score} out of 100`}>
    <div className="score-capsule">
      {score === null
        ? <span className="score-value">NR</span>
        : <strong className="score-bubble" style={{ left: `clamp(17px, ${score}%, calc(100% - 17px))`, backgroundColor: scoreColour(score) }}>{score}</strong>}
    </div>
  </div>;
}

export default function Home() {
  const [films, setFilms] = useState<Film[]>(samples);
  const [selected, setSelected] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<"sample" | "tmdb">("sample");
  const [sortBy, setSortBy] = useState<"year" | "rating" | "title">("year");
  const [catalogueFilter, setCatalogueFilter] = useState<"all" | "rated" | "netflix" | "prime">("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(500);
  const [draftScores, setDraftScores] = useState<Partial<Scores>>({});
  const rail = useRef<HTMLDivElement>(null);
  const film = films[selected] || films[0];

  useEffect(() => {
    const saved = localStorage.getItem("kollywood-index-scores");
    if (saved) { try { const parsed = JSON.parse(saved); setFilms(current => current.map(item => parsed[item.id] ? { ...item, scores: parsed[item.id], ratingStatus: "draft" } : item)); } catch {} }
    fetch(`./data/movies.json?v=${Date.now()}`, { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(data => { if (data.movies?.length) { setFilms(data.movies); setSelected(0); setSource("tmdb"); } }).catch(() => {});
  }, []);

  const newest = useMemo(() => [...films].sort((a,b) => b.releaseDate.localeCompare(a.releaseDate)), [films]);
  const latest = useMemo(() => newest.filter(item => item.scores !== null).slice(0, 20), [newest]);
  const availableYears = useMemo(() => [...new Set(films.map(item => item.year).filter(Boolean))].sort((a,b) => b.localeCompare(a)), [films]);
  const library = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matches = films.filter(item => {
      const providers = (item.watchProviders || []).map(provider => provider.name.toLocaleLowerCase());
      const matchesText = !term || [item.title, item.originalTitle, item.year, ...item.genres, ...item.cast].some(value => value?.toLocaleLowerCase().includes(term));
      const matchesYear = yearFilter === "all" || item.year === yearFilter;
      const matchesCatalogue = catalogueFilter === "all"
        || (catalogueFilter === "rated" && item.scores !== null)
        || (catalogueFilter === "netflix" && providers.some(name => name.includes("netflix")))
        || (catalogueFilter === "prime" && providers.some(name => name.includes("prime video") || name.includes("amazon prime")));
      return matchesText && matchesYear && matchesCatalogue;
    });
    return matches.sort((a,b) => {
      if (sortBy === "year") return b.releaseDate.localeCompare(a.releaseDate);
      if (sortBy === "title") return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
      const aScore = total(a.scores), bScore = total(b.scores);
      if (aScore === null && bScore === null) return b.releaseDate.localeCompare(a.releaseDate);
      if (aScore === null) return 1;
      if (bScore === null) return -1;
      return bScore - aScore || b.releaseDate.localeCompare(a.releaseDate);
    });
  }, [films, query, sortBy, catalogueFilter, yearFilter]);
  const visibleLibrary = library.slice(0, visibleCount);
  useEffect(() => setVisibleCount(500), [query, sortBy, catalogueFilter, yearFilter]);
  const activeIndex = newest.findIndex(f => f.id === film.id);
  const choose = (chosen: Film) => { setSelected(films.findIndex(f => f.id === chosen.id)); setEditing(false); setDraftScores({}); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); setEditing(false); setDraftScores({}); };
  useEffect(() => {
    if (!detailOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("modal-open"); };
  }, [detailOpen]);
  const beginEditing = () => { setDraftScores(film.scores || {}); setEditing(true); };
  const draftComplete = weights.every(item => typeof draftScores[item.key] === "number");
  const saveDraft = () => {
    if (!draftComplete) return;
    const completed = draftScores as Scores;
    const next = films.map((item) => item.id === film.id ? { ...item, scores: completed, ratingStatus: "draft" as const } : item);
    setFilms(next);
    localStorage.setItem("kollywood-index-scores", JSON.stringify(Object.fromEntries(next.filter(item => item.ratingStatus === "draft" && item.scores).map(item => [item.id, item.scores]))));
    setEditing(false);
  };
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * Math.min(720, window.innerWidth * .72), behavior: "smooth" });

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Kollywood Index home"><span className="brand-mark">KI</span><span>KOLLYWOOD<br/>INDEX</span></a>
      <nav><a href="#films">Just arrived</a><a href="#library" onClick={() => setCatalogueFilter("all")}>Browse films</a><a href="#library" onClick={() => setCatalogueFilter("rated")}>Browse films (Rated)</a><a href="#methodology">Our rating system</a></nav>
      <span className={`source ${source}`}>{source === "tmdb" ? "Live cinema catalogue" : "Catalogue preview"}</span>
    </header>

    <section className="featured-strip" id="films">
      <div className="section-heading"><div><span className="kicker">RECENTLY REVIEWED</span><h2>Twenty new rated films</h2><p>Explore the most recently released films with a completed Kollywood Index assessment.</p></div><div className="rail-actions"><button onClick={() => scroll(-1)} aria-label="View earlier posters">←</button><button onClick={() => scroll(1)} aria-label="View more posters">→</button></div></div>
      <div className="poster-rail" ref={rail} tabIndex={0} aria-label="20 most recent rated films ordered newest first">
        {latest.map(item => <button className={`poster-card ${item.id === film.id ? "active" : ""}`} key={item.id} onClick={() => choose(item)}>
          <div className="poster-wrap"><Poster film={item}/></div>
          <ScoreMeter film={item}/>
          <div className="poster-meta"><strong>{item.title}</strong><span>{item.year} · {item.genres[0]}</span></div>
        </button>)}
      </div>
    </section>

    <section className="hero" id="top">
      <div className="eyebrow">Tamil cinema, considered carefully</div>
      <h1>Your next great<br/><em>film starts here.</em></h1>
      <p>Explore a focused selection of Tamil films, search the complete archive, and understand every published score at a glance.</p>
      <a className="text-link" href="#library">Explore the collection <span>↘</span></a>
      <div className="film-reel" aria-hidden="true">
        <svg viewBox="0 0 280 245" role="presentation">
          <defs><linearGradient id="reel-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d5b270"/><stop offset=".5" stopColor="#795931"/><stop offset="1" stopColor="#e1c58c"/></linearGradient></defs>
          <g className="reel-disc"><circle cx="116" cy="105" r="82"/><circle className="reel-rim" cx="116" cy="105" r="72"/><circle className="reel-hole" cx="116" cy="53" r="21"/><circle className="reel-hole" cx="165" cy="89" r="21"/><circle className="reel-hole" cx="147" cy="148" r="21"/><circle className="reel-hole" cx="85" cy="148" r="21"/><circle className="reel-hole" cx="66" cy="89" r="21"/><circle className="reel-hub" cx="116" cy="105" r="12"/></g>
          <path className="film-tail" d="M166 164 C217 170 246 191 238 221 C230 242 190 236 197 211 C202 194 226 198 263 207"/>
          <path className="film-edge" d="M168 174 C210 178 228 193 224 211"/>
        </svg>
      </div>
    </section>

    <section className="film-section">
      <section className="library" id="library">
        <div className="library-heading"><div><span className="kicker">THE COLLECTION</span><h2>Browse Tamil cinema</h2><p>Search and filter by rating, streaming service, year or title.</p></div><span className="result-count">{query.trim() || catalogueFilter !== "all" || yearFilter !== "all" ? `${library.length} matches` : `${films.length} films available`}</span></div>
        <div className="library-controls">
          <label className="search-control"><span>Search the full archive</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Film, performer, year or genre…"/></label>
          <label><span>Show movies</span><select value={catalogueFilter} onChange={event => setCatalogueFilter(event.target.value as "all" | "rated" | "netflix" | "prime")}><option value="all">All movies</option><option value="rated">Rated movies</option><option value="netflix">Movies on Netflix</option><option value="prime">Movies on Prime Video</option></select></label>
          <label><span>Movies by year</span><select value={yearFilter} onChange={event => setYearFilter(event.target.value)}><option value="all">All years</option>{availableYears.map(year => <option value={year} key={year}>{year}</option>)}</select></label>
          <label className="sort-control"><span>Arrange films</span><select value={sortBy} onChange={event => setSortBy(event.target.value as "year" | "rating" | "title")}><option value="year">Latest releases first</option><option value="rating">Highest rated first</option><option value="title">Title A to Z</option></select></label>
        </div>
        {library.length ? <div className="movie-grid" aria-label="All films">
          {visibleLibrary.map(item => <button className={`grid-card ${item.id === film.id ? "active" : ""}`} key={item.id} onClick={() => choose(item)}>
            <div className="poster-wrap"><Poster film={item}/></div>
            <ScoreMeter film={item}/>
            <div className="poster-meta"><strong>{item.title}</strong><span>{item.year} · {item.genres[0]}</span></div>
          </button>)}
        </div> : <div className="empty-state"><strong>No matching film</strong><span>Try another title, performer, year or genre.</span></div>}
        {visibleLibrary.length < library.length && <button className="load-more" onClick={() => setVisibleCount(count => Math.min(count + 100, library.length))}>Show 100 more matches <span>{visibleLibrary.length} of {library.length}</span></button>}
      </section>
    </section>

    {detailOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeDetail(); }}>
    <section className="detail detail-modal" id="film-detail" role="dialog" aria-modal="true" aria-labelledby="film-detail-title">
      <button className="modal-close" onClick={closeDetail} aria-label="Close film details">Close <span>×</span></button>
      <div className="detail-poster"><Poster film={film}/><span className="selection">INDEX {String(activeIndex + 1).padStart(2,"0")}</span></div>
      <div className="detail-copy">
        <div className="detail-top"><div><span className="kicker">{film.year} · {film.runtime ? `${film.runtime} MIN · ` : ""}{film.genres.join(" / ")}</span><h2 id="film-detail-title">{film.title}</h2><p className="tamil-title">{film.originalTitle}</p></div><div className={`final-score ${film.scores ? "" : "unrated"}`}><strong>{total(film.scores) ?? "NR"}</strong><span>{film.scores ? "OUT OF 100" : "ASSESSMENT PENDING"}</span></div></div>
        <p className="overview">{film.overview}</p>
        <div className="cast"><span>CAST</span><p>{film.cast.join(" · ")}</p></div>
        <section className="streaming" aria-label="UK streaming availability">
          <div className="streaming-heading"><div><span className="kicker">WATCH IN THE UK</span><h3>Currently streaming</h3></div>{film.watchLink && <a href={film.watchLink} target="_blank" rel="noreferrer">Check availability ↗</a>}</div>
          {film.watchProviders?.length ? <div className="provider-list">{film.watchProviders.map(provider => <div className="provider" key={provider.id}>{provider.logo ? <img src={provider.logo} alt={`${provider.name} logo`} loading="lazy"/> : <span aria-hidden="true">▶</span>}<strong>{provider.name}</strong></div>)}</div> : <p className="streaming-empty">No UK subscription-streaming listing is currently available.</p>}
          <small>Streaming data supplied by JustWatch via TMDB. Availability can change.</small>
        </section>
        <div className="score-head"><div><span className="kicker">SCORE BREAKDOWN</span><p>{film.scores ? "Seven measures combine to create the published result." : "A score appears only after all seven measures have supporting evidence."}</p></div>{editing ? <button className="edit" disabled={!draftComplete} onClick={saveDraft}>Keep private draft</button> : <button className="edit" onClick={beginEditing}>{film.scores ? "Test different scores" : "Try a private score"}</button>}</div>
        <div className="score-list">
          {weights.map(item => { const metricValue = editing ? draftScores[item.key] : film.scores?.[item.key]; return <div className="score-row" key={item.key}>
            <div className="metric"><div><strong>{item.label}</strong><span>{item.weight}% weight</span></div><div className="bar"><i style={{width: `${metricValue ?? 0}%`, backgroundColor: metricValue === undefined ? "#52656a" : scoreColour(metricValue)}}/></div></div>
            {editing ? <input aria-label={`${item.label} score`} type="number" min="0" max="100" value={draftScores[item.key] ?? ""} placeholder="—" onChange={e => setDraftScores(current => ({ ...current, [item.key]: Math.max(0, Math.min(100, Number(e.target.value))) }))}/> : <strong className="metric-score">{film.scores?.[item.key] ?? "—"}</strong>}
            <small>{(editing ? draftScores[item.key] : film.scores?.[item.key]) === undefined ? "—" : `+${(((editing ? draftScores[item.key] : film.scores?.[item.key]) || 0) * item.weight / 100).toFixed(1)}`}</small>
          </div>})}
        </div>
        <div className={`confidence ${film.ratingStatus === "draft" ? "draft" : film.confidence?.toLowerCase() || "unrated"}`}><span>EVIDENCE</span><strong>{film.ratingStatus === "draft" ? "Local draft" : film.confidence || "Awaiting review"}</strong><p>{film.ratingStatus === "draft" ? "Saved only on this device; not an approved published rating" : film.confidence ? `${film.sourceCount} sources considered · ${film.confidence === "High" ? "Broad agreement across major reviews" : film.confidence === "Medium" ? "Useful coverage with a mixed verdict" : "A preliminary view based on limited coverage"}` : "No approved assessment or source record has been published yet"}</p></div>
        {!!film.sources?.length && <div className="evidence-list"><span className="kicker">SOURCES USED</span>{film.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><span>{source.kind} · {source.weight}% of evidence panel ↗</span></a>)}</div>}
      </div>
    </section></div>}

    <section className="method" id="methodology">
      <div className="method-intro"><span className="kicker">BEHIND THE NUMBER</span><h2>Seven measures.<br/>One comparable score.</h2><p>Every assessed film follows the same weighted framework, bringing together filmmaking craft, critical response and audience evidence.</p></div>
      <div className="formula">
        {weights.map((item, i) => <div className="formula-row" key={item.key}><span>0{i+1}</span><strong>{item.label}</strong><b>{item.weight}%</b></div>)}
        <div className="equation"><span>OVERALL RATING</span><code>Σ (measure × weight) = rating out of 100</code></div>
      </div>
    </section>

    <section className="critic-model">
      <div><span className="kicker">WHO INFORMS THE SCORE</span><h2>Critics close to<br/>the cinema they cover.</h2><p>Each Indian film industry has its own language, history and reviewing culture. Our evidence panels reflect that local expertise.</p><p>For Tamil cinema, established voices may lead the panel, supported by a wider critical sample and carefully separated audience signals.</p></div>
      <div className="weight-stack">
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Lead critic</span><b>~20%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Second lead critic</span><b>~20%</b></div>
        <div style={{"--size":"40%"} as React.CSSProperties}><span>Additional reputable critics</span><b>~40%</b></div>
        <div style={{"--size":"20%"} as React.CSSProperties}><span>Audience signal <small>Reddit · Letterboxd</small></span><b>~20%</b></div>
      </div>
    </section>

    <section className="confidence-explain"><div><span className="kicker">HOW CERTAIN IS IT?</span><h2>Every score carries<br/>an evidence signal.</h2><p>Confidence describes the depth and agreement of the available material—not whether a film is good or bad.</p></div><div className="confidence-grid"><article><i></i><strong>High</strong><p>Many credible sources point in a similar direction</p></article><article><i></i><strong>Medium</strong><p>Useful coverage exists, but the response is divided</p></article><article><i></i><strong>Low</strong><p>The early view rests on a small evidence base</p></article></div></section>

    <footer id="about">
      <div className="brand footer-brand"><span className="brand-mark">KI</span><span>KOLLYWOOD<br/>INDEX</span></div>
      <div className="disclaimer"><strong>Technology, data and attribution</strong><p>Film titles, release information, cast details, genres, posters and imagery are supplied through the TMDB API. UK streaming availability is supplied by <a href="https://www.justwatch.com/uk" target="_blank" rel="noreferrer">JustWatch</a> through TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p><p>Kollywood Index is an independent, non-commercial project for cinema discovery, criticism and cultural commentary. It is not affiliated with TMDB, JustWatch, any streaming service, film studio, distributor, critic, Reddit or Letterboxd. Film artwork, service logos, names and trademarks remain the property of their respective owners.</p></div>
      <div className="technology"><strong>Built with</strong><ul><li>Next.js 16 and React 19</li><li>TypeScript, HTML and responsive CSS</li><li>TMDB API and structured JSON data</li><li>GitHub source control</li><li>GitHub Actions automation</li><li>GitHub Pages hosting</li><li>Browser local storage for private drafts</li><li>ChatGPT and Codex-assisted development</li></ul></div>
      <p className="copyright">© {new Date().getFullYear()} Kollywood Index<br/>A clearer way to explore Tamil cinema.</p>
    </footer>
  </main>;
}
