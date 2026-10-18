
import { useEffect, useRef, useState } from "react";
import "./App.css";
import MoleculeViewer from "./MoleculeViewer";

const API = "http://localhost:8000";

const starterCompounds = [
  {
    name: "Caffeine",
    cid: 2519,
    formula: "C8H10N4O2",
    mass: "194.19",
    type: "Stimulant",
  },
  {
    name: "Aspirin",
    cid: 2244,
    formula: "C9H8O4",
    mass: "180.16",
    type: "Analgesic",
  },
  {
    name: "Glucose",
    cid: 5793,
    formula: "C6H12O6",
    mass: "180.16",
    type: "Carbohydrate",
  },
  {
    name: "Ibuprofen",
    cid: 3672,
    formula: "C13H18O2",
    mass: "206.28",
    type: "NSAID",
  },
  {
    name: "Paracetamol",
    cid: 1983,
    formula: "C8H9NO2",
    mass: "151.16",
    type: "Analgesic",
  },
];

function structureUrl(cid) {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
}

function App() {
  const [query, setQuery] = useState("");
  const [compound, setCompound] = useState(null);
  const [recent, setRecent] = useState(starterCompounds);

  const [favorites, setFavorites] = useState(() => {
    try {
      const savedFavorites = localStorage.getItem("chemscope-favorites");
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch (error) {
      console.error("Could not load favorites:", error);
      return [];
    }
  });
  const suppressSuggestions = useRef(false);
  const [loading, setLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("2D");
  const [activeTab, setActiveTab] = useState("Discover");

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);


  useEffect(() => {
    if (suppressSuggestions.current) {
      return;
    }
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2 || searchActive) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchingSuggestions(false);
      return;
    }

    let isCurrent = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearchingSuggestions(true);

      try {
        const response = await fetch(
          `${API}/api/search/${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load suggestions.");
        }

        const data = await response.json();

        if (isCurrent) {
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        if (err.name !== "AbortError" && isCurrent) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (isCurrent) {
          setSearchingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchActive]);


  // Search PubChem for a compound.
  async function searchCompound(event, selectedName) {
    if (event) {
      event.preventDefault();
    }

    const name = (selectedName || query).trim();

    if (!name) {
      setError("Enter a compound name to begin.");
      return;
    }
    suppressSuggestions.current = true;

    setQuery(name);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchActive(true);
    setLoading(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setError("");
    setCompound(null);
    setShowSuggestions(false);
    setSuggestions([]);
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
      setSearchActive(false);
    }
  }

  // Add or remove a compound from favorites.
  function toggleFavorite(item) {
    setFavorites((previous) =>
      previous.some((fav) => fav.cid === item.cid)
        ? previous.filter((fav) => fav.cid !== item.cid)
        : [...previous, item]
    );
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        "chemscope-favorites",
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error("Could not save favorites:", error);
    }
  }, [favorites]);


  const selected = compound
    ? {
      cid: compound.CID,
      name: query,
      formula: compound.MolecularFormula,
      mass: Number(compound.MolecularWeight).toFixed(2),
    }
    : null;

  // Convert real PubChem properties into comparable 0–1 chart values.
  const radarAxes = [
    {
      key: "XLogP",
      label: "LIPOPHILICITY",
      min: -2,
      max: 8,
    },
    {
      key: "MolecularWeight",
      label: "SIZE",
      min: 0,
      max: 500,
    },
    {
      key: "TPSA",
      label: "POLARITY",
      min: 0,
      max: 200,
    },
    {
      key: "RotatableBondCount",
      label: "FLEXIBILITY",
      min: 0,
      max: 15,
    },
    {
      key: "HBondDonorCount",
      label: "DONORS",
      min: 0,
      max: 10,
    },
    {
      key: "HBondAcceptorCount",
      label: "ACCEPTORS",
      min: 0,
      max: 15,
    },
  ];

  const radarDataAvailable =
    compound &&
    radarAxes.every(
      (axis) =>
        compound[axis.key] !== null &&
        compound[axis.key] !== undefined &&
        Number.isFinite(Number(compound[axis.key]))
    );

  const radarPoints = radarDataAvailable
    ? radarAxes.map((axis, index) => {
      const rawValue = Number(compound[axis.key]);
      const normalized = Math.max(
        0,
        Math.min(1, (rawValue - axis.min) / (axis.max - axis.min))
      );

      const angle = ((index * 60 - 90) * Math.PI) / 180;
      const radius = normalized * 62;

      return {
        ...axis,
        rawValue,
        x: 120 + radius * Math.cos(angle),
        y: 87 + radius * Math.sin(angle),
      };
    })
    : [];

  const radarPolygon = radarPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const formatProperty = (value, digits = 2) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number.toFixed(digits)
      : "—";
  };

  const shownCompounds =
    activeTab === "Favorites" ? favorites : recent;

  const galleryTitle =
    activeTab === "Favorites"
      ? "Your favorites"
      : activeTab === "Recommended"
        ? "Recommended"
        : "Recent discoveries";

  return (
    <main className="dashboard">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setActiveTab("Discover");
          }}
        >
          <span className="brand-symbol">⌬</span>
          Chem<span>Scope</span>
        </a>

        <nav className="navigation">
          <button
            onClick={() => {
              setCompound(null);
              setQuery("");
              setShowSuggestions(false);
              setError("");
              setActiveTab("Discover");
            }}
          >
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
        {/* Keep the orb empty so only the two existing CSS rings appear. */}
        <div className="molecule-orb" />

        <aside className="search-panel glass-panel">
          <h2>
            <span className="accent">⌕</span> Compound search
          </h2>

          <div className="search-container">
            <form
              className="search-form"
              onSubmit={(event) => {
                event.preventDefault();
                setShowSuggestions(false);
                setSuggestions([]);
                searchCompound(null);
              }}
            >
              <input
                value={query}
                onChange={(event) => {
                  suppressSuggestions.current = false;
                  setQuery(event.target.value);
                  setError("");
                }}
                onFocus={() => {
                  if (query.trim().length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Search a compound..."
                aria-label="Compound name"
                autoComplete="off"
                aria-expanded={
                  showSuggestions && suggestions.length > 0
                }
                aria-controls="compound-suggestions"
              />

              <button
                type="submit"
                disabled={loading}
                aria-label="Search"
              >
                {loading ? "…" : "⌕"}
              </button>
            </form>

            {showSuggestions && query.trim().length >= 2 && (
              <div
                className="suggestions-dropdown"
                id="compound-suggestions"
                role="listbox"
              >
                {searchingSuggestions && (
                  <div className="suggestion-status">
                    Finding compounds...
                  </div>
                )}

                {!searchingSuggestions &&
                  suggestions.length === 0 && (
                    <div className="suggestion-status">
                      No suggestions found. Press Enter to search anyway.
                    </div>
                  )}

                {!searchingSuggestions &&
                  suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="suggestion-item"
                      role="option"
                      aria-selected="false"
                      onClick={() => searchCompound(null, name)}
                    >
                      <span className="suggestion-icon">⌕</span>
                      <span>{name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <p className="panel-caption">
            SEARCH THE PUBCHEM DATABASE
          </p>

          {error && <p className="error-message">{error}</p>}



          {selected ? (
            <div className="structure-preview compound-details">
              <div className="mini-heading">
                <span>◇</span> Compound details
              </div>

              <div className="detail-item">
                <span>Compound name</span>
                <strong>{selected.name}</strong>
              </div>

              <div className="detail-item">
                <span>Molecular formula</span>
                <strong>{selected.formula || "—"}</strong>
              </div>

              <div className="detail-item">
                <span>Molecular weight</span>
                <strong>{selected.mass || "—"} g/mol</strong>
              </div>

              <div className="detail-item">
                <span>PubChem CID</span>
                <strong>{selected.cid || "—"}</strong>
              </div>

              <div className="detail-item smiles-detail">
                <span>Canonical SMILES</span>
                {compound?.CanonicalSMILES || compound?.ConnectivitySMILES ? (
                  <button
                    type="button"
                    className="smiles-copy"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        compound.CanonicalSMILES ||
                        compound.ConnectivitySMILES
                      )
                    }
                  >
                    Copy SMILES ↗
                  </button>
                ) : (
                  <strong className="muted-value">Not available</strong>
                )}
              </div>
            </div>
          ) : (
            <div className="structure-preview compound-details">
              <div className="mini-heading">
                <span>◇</span> Compound details
              </div>
              <p className="empty-detail">
                Search for a compound to view its details.
              </p>
            </div>
          )}
        </aside>



        <section className="central-molecule">
          <div className="orb-label">
            <span className="live-dot" /> MOLECULAR EXPLORER
          </div>

          {selected ? (
            <>
              {view === "3D" ? (
                <MoleculeViewer cid={selected.cid} />
              ) : (
                <img
                  key={selected.cid}
                  src={structureUrl(selected.cid)}
                  alt={`${selected.name} 2D chemical structure`}
                  className="structure-image hero-structure"
                />
              )}

              <div className="molecule-name">
                <span>ACTIVE COMPOUND</span>
                <h1>{selected.name}</h1>
                <p>
                  {selected.formula} <span>·</span> {selected.mass} g/mol
                </p>
              </div>
            </>
          ) : (
            <div className="empty-molecule">
              <span className="empty-molecule-symbol">⌬</span>
              <h1>Your next discovery awaits.</h1>
              <p>
                Search for a compound to explore its molecular structure.
              </p>
            </div>
          )}
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
            <svg
              viewBox="0 0 240 190"
              role="img"
              aria-label={
                radarDataAvailable
                  ? `Molecular profile for ${query}`
                  : "Molecular profile chart awaiting compound data"
              }
            >
              <g className="radar-grid">
                <polygon points="120,25 174,56 174,118 120,149 66,118 66,56" />
                <polygon points="120,43 158,65 158,109 120,131 82,109 82,65" />
                <polygon points="120,61 142,74 142,100 120,113 98,100 98,74" />
                <line x1="120" y1="25" x2="120" y2="149" />
                <line x1="66" y1="56" x2="174" y2="118" />
                <line x1="174" y1="56" x2="66" y2="118" />
              </g>

              {radarDataAvailable && (
                <>
                  <polygon
                    className="radar-area"
                    points={radarPolygon}
                  />

                  <g className="radar-points">
                    {radarPoints.map((point) => (
                      <circle
                        key={point.key}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                      >
                        <title>
                          {point.label}: {point.rawValue}
                        </title>
                      </circle>
                    ))}
                  </g>
                </>
              )}

              <g className="radar-labels">
                <text x="120" y="14" textAnchor="middle">
                  LIPOPHILICITY
                </text>
                <text x="184" y="54">SIZE</text>
                <text x="183" y="131">POLARITY</text>
                <text x="120" y="166" textAnchor="middle">
                  FLEXIBILITY
                </text>
                <text x="5" y="131">DONORS</text>
                <text x="3" y="54">ACCEPTORS</text>
              </g>
            </svg>
          </div>

          <div className="property-columns">
            <div>
              <h3><span>⚗</span> Physicochemical</h3>

              <div className="data-row">
                <span>Formula</span>
                <strong>{selected?.formula || "—"}</strong>

                <div className="data-row">
                  <span>Molar mass</span>
                  <strong>{selected?.mass || "—"}</strong>
                </div>

                <div className="data-row">
                  <span>XLogP</span>
                  <strong>{formatProperty(compound?.XLogP)}</strong>
                </div>

                <div className="data-row">
                  <span>Polar surface area</span>
                  <strong>
                    {formatProperty(compound?.TPSA)} Å²
                  </strong>
                </div>

                <div className="data-row">
                  <span>H-bond donors</span>
                  <strong>
                    {formatProperty(compound?.HBondDonorCount, 0)}
                  </strong>
                </div>

                <div className="data-row">
                  <span>H-bond acceptors</span>
                  <strong>
                    {formatProperty(compound?.HBondAcceptorCount, 0)}
                  </strong>
                </div>

                <div className="data-row">
                  <span>Rotatable bonds</span>
                  <strong>
                    {formatProperty(compound?.RotatableBondCount, 0)}
                  </strong>
                </div>

                <div className="data-row">
                  <span>SMILES</span>
                  <strong>
                    {compound?.CanonicalSMILES ||
                      compound?.ConnectivitySMILES
                      ? "Available"
                      : "—"}
                  </strong>
                </div>
              </div>

              <div>
                <h3><span>ⓘ</span> Compound details</h3>

                <div className="data-row">
                  <span>PubChem CID</span>
                  <strong>{selected?.cid || "—"}</strong>
                </div>

                <div className="data-row">
                  <span>Source</span>
                  <strong>PubChem</strong>
                </div>

                <div className="data-row">
                  <span>View</span>
                  <strong>{view}</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="discoveries glass-panel">
        <div className="gallery-intro">
          <h2>◷ {galleryTitle}</h2>

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
            <p className="tiny-note">
              Use the star on a card to save a compound.
            </p>
          )}
        </div>

        <div className="compound-gallery">
          {shownCompounds.length === 0 && (
            <p className="empty-state">
              No favorites yet. Search for a compound, then save it here.
            </p>
          )}

          {shownCompounds.map((item) => {
            const isFavorite = favorites.some(
              (fav) => fav.cid === item.cid
            );

            return (
              <article className="compound-tile" key={item.cid}>
                <button
                  className={`favorite-button ${isFavorite ? "favorited" : ""
                    }`}
                  onClick={() => toggleFavorite(item)}
                  aria-label={
                    isFavorite ? "Remove favorite" : "Add favorite"
                  }
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
