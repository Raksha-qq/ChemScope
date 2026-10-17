
import { useState } from "react";
import "./App.css";

const API = "http://localhost:8000";

const starterCompounds = [
  { name: "Caffeine", cid: 2519, formula: "C8H10N4O2", mass: "194.19", type: "Stimulant" },
  { name: "Aspirin", cid: 2244, formula: "C9H8O4", mass: "180.16", type: "Analgesic" },
  { name: "Glucose", cid: 5793, formula: "C6H12O6", mass: "180.16", type: "Carbohydrate" },
  { name: "Ibuprofen", cid: 3672, formula: "C13H18O2", mass: "206.28", type: "NSAID" },
  { name: "Paracetamol", cid: 1983, formula: "C8H9NO2", mass: "151.16", type: "Analgesic" },
];

function structureUrl(cid) {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
}

function App() {
  const [query, setQuery] = useState("caffeine");
  const [compound, setCompound] = useState(null);
  const [recent, setRecent] = useState(starterCompounds);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("2D");
  const [activeTab, setActiveTab] = useState("Discover");

  async function searchCompound(event, selectedName) {
    if (event) event.preventDefault();

    const name = (selectedName || query).trim();
    if (!name) {
      setError("Enter a compound name to begin.");
      return;
    }

    setQuery(name);
    setLoading(true);
    setError("");
    setCompound(null);

    try {
      const response = await fetch(
        `${API}/api/compounds/${encodeURIComponent(name)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Compound not found.");
      }

      setCompound(data);

      const result = {
        name,
        cid: data.CID,
        formula: data.MolecularFormula,
        mass: Number(data.MolecularWeight).toFixed(2),
        type: "Compound",
      };

      setRecent((previous) => [
        result,
        ...previous.filter((item) => item.cid !== data.CID),
      ]);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach the backend. Check that FastAPI is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(item) {
    setFavorites((previous) =>
      previous.some((fav) => fav.cid === item.cid)
        ? previous.filter((fav) => fav.cid !== item.cid)
        : [...previous, item]
    );
  }

  const selected = compound
    ? {
      cid: compound.CID,
      name: query,
      formula: compound.MolecularFormula,
      mass: Number(compound.MolecularWeight).toFixed(2),
    }
    : starterCompounds[0];

  const shownCompounds =
    activeTab === "Favorites" ? favorites : recent;

  return (
    <main className="dashboard">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setActiveTab("Discover")}>
          <span className="brand-symbol">⌬</span>
          Chem<span>Scope</span>
        </a>

        <nav className="navigation">
          <button onClick={() => {
            setCompound(null);
            setQuery("");
            setActiveTab("Discover");
          }}>
            <span>⊕</span> New Study
          </button>
          <button onClick={() => setActiveTab("Recommended")}>
            <span>♧</span> Recommended
          </button>
          <button
            className={activeTab === "Favorites" ? "active" : ""}
            onClick={() => setActiveTab("Favorites")}
          >
            <span>☆</span> Favorites
          </button>
          <button
            className={activeTab === "Discover" ? "active" : ""}
            onClick={() => setActiveTab("Discover")}
          >
            <span>⌕</span> Discover
          </button>
        </nav>

        <div className="account">
          <span className="status-dot" />
          <span className="account-avatar">C</span>
          <div>
            <strong>ChemScope</strong>
            <small>Research workspace</small>
          </div>
        </div>
      </header>

      <section className="workspace">
        <div className="molecule-orb" />

        <aside className="search-panel glass-panel">
          <h2><span className="accent">⌕</span> Compound search</h2>

          <form className="search-form" onSubmit={searchCompound}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a compound..."
              aria-label="Compound name"
            />
            <button type="submit" disabled={loading} aria-label="Search">
              {loading ? "…" : "⌕"}
            </button>
          </form>

          <p className="panel-caption">
            SEARCH THE PUBCHEM DATABASE
          </p>

          {error && <p className="error-message">{error}</p>}

          <div className="structure-preview">
            <div className="mini-heading">
              <span>◇</span> Molecular structure
            </div>
            {compound?.CanonicalSMILES || compound?.ConnectivitySMILES ? (
              <p className="smiles-preview">
                {compound.CanonicalSMILES || compound.ConnectivitySMILES}
              </p>
            ) : (
              <p className="smiles-preview">
                Search for a compound to load its structure.
              </p>
            )}
            <img
              src={structureUrl(selected.cid)}
              alt={`${selected.name} molecular structure`}
              className="structure-image small-structure"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
          </div>
        </aside>

        <section className="central-molecule">
          <div className="orb-label">
            <span className="live-dot" /> MOLECULAR EXPLORER
          </div>
          <img
            key={selected.cid}
            src={structureUrl(selected.cid)}
            alt={`${selected.name} 2D chemical structure`}
            className="structure-image hero-structure"
          />
          <div className="molecule-name">
            <span>ACTIVE COMPOUND</span>
            <h1>{compound ? query : "Caffeine"}</h1>
            <p>{selected.formula} <span>·</span> {selected.mass} g/mol</p>
          </div>
        </section>

        <aside className="analysis-panel glass-panel">
          <div className="view-switch">
            <div className="switch-group">
              <button
                className={view === "2D" ? "selected" : ""}
                onClick={() => setView("2D")}
              >
                2D
              </button>
              <button
                className={view === "3D" ? "selected" : ""}
                onClick={() => setView("3D")}
              >
                3D
              </button>
            </div>
            <span className="edit-label">◇ Analysis</span>
          </div>

          <div className="section-heading">
            <span>♧</span> Molecular profile
          </div>

          <div className="radar-wrap">
            <svg viewBox="0 0 240 190" role="img" aria-label="Illustrative molecular profile chart">
              <g className="radar-grid">
                <polygon points="120,25 174,56 174,118 120,149 66,118 66,56" />
                <polygon points="120,43 158,65 158,109 120,131 82,109 82,65" />
                <polygon points="120,61 142,74 142,100 120,113 98,100 98,74" />
                <line x1="120" y1="25" x2="120" y2="149" />
                <line x1="66" y1="56" x2="174" y2="118" />
                <line x1="174" y1="56" x2="66" y2="118" />
              </g>
              <polygon className="radar-area" points="120,48 155,75 145,101 120,119 91,103 92,72" />
              <g className="radar-points">
                <circle cx="120" cy="48" r="3" />
                <circle cx="155" cy="75" r="3" />
                <circle cx="145" cy="101" r="3" />
                <circle cx="120" cy="119" r="3" />
                <circle cx="91" cy="103" r="3" />
                <circle cx="92" cy="72" r="3" />
              </g>
              <g className="radar-labels">
                <text x="120" y="14" textAnchor="middle">LIPOPHILICITY</text>
                <text x="184" y="54">SIZE</text>
                <text x="183" y="131">POLARITY</text>
                <text x="120" y="166" textAnchor="middle">FLEXIBILITY</text>
                <text x="5" y="131">DONORS</text>
                <text x="3" y="54">ACCEPTORS</text>
              </g>
            </svg>
          </div>
          <p className="chart-note">Illustrative profile · not measured data</p>

          <div className="property-columns">
            <div>
              <h3><span>⚗</span> Physicochemical</h3>
              <div className="data-row">
                <span>Formula</span><strong>{selected.formula}</strong>
              </div>
              <div className="data-row">
                <span>Molar mass</span><strong>{selected.mass}</strong>
              </div>
              <div className="data-row">
                <span>SMILES</span>
                <strong>{compound?.CanonicalSMILES || compound?.ConnectivitySMILES ? "Available" : "—"}</strong>
              </div>
            </div>
            <div>
              <h3><span>ⓘ</span> Compound details</h3>
              <div className="data-row">
                <span>PubChem CID</span><strong>{selected.cid}</strong>
              </div>
              <div className="data-row">
                <span>Source</span><strong>PubChem</strong>
              </div>
              <div className="data-row">
                <span>View</span><strong>{view}</strong>
              </div>
            </div>
          </div>

          {view === "3D" && (
            <p className="view-notice">
              A true interactive 3D molecular viewer will be added next.
              This view currently uses the 2D structure.
            </p>
          )}
        </aside>
      </section>

      <section className="discoveries glass-panel">
        <div className="gallery-intro">
          <h2>◷ {activeTab === "Favorites" ? "Your favorites" : activeTab === "Recommended" ? "Recommended" : "Recent discoveries"}</h2>
          <p>
            Explore molecules and build your personal chemical library.
          </p>
          <button
            className="outline-button"
            onClick={() => setActiveTab("Discover")}
          >
            Explore library <span>→</span>
          </button>
          {activeTab === "Favorites" && (
            <p className="tiny-note">Use the star on a card to save a compound.</p>
          )}
        </div>

        <div className="compound-gallery">
          {shownCompounds.length === 0 && (
            <p className="empty-state">
              No favorites yet. Search for a compound, then save it here.
            </p>
          )}

          {shownCompounds.map((item) => {
            const isFavorite = favorites.some((fav) => fav.cid === item.cid);

            return (
              <article className="compound-tile" key={item.cid}>
                <button
                  className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                  onClick={() => toggleFavorite(item)}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
                <button
                  className="tile-content"
                  onClick={() => searchCompound(null, item.name)}
                >
                  <img
                    src={structureUrl(item.cid)}
                    alt={`${item.name} structure`}
                    className="structure-image tile-structure"
                    loading="lazy"
                  />
                  <h3>{item.name}</h3>
                  <p className="tile-formula">{item.formula}</p>
                  <div className="tile-detail">
                    <span>Molar mass</span>
                    <strong>{item.mass} g/mol</strong>
                  </div>
                  <div className="tile-detail">
                    <span>CID</span>
                    <strong>{item.cid}</strong>
                  </div>
                  <span className="compound-tag">{item.type}</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="dashboard-footer">
        CHEMSCOPE <span>·</span> POWERED BY PUBCHEM PUG REST
      </footer>
    </main>
  );
}

export default App;
