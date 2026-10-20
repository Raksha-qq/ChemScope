
import { useEffect, useRef, useState } from "react";
import "./App.css";
import MoleculeViewer from "./MoleculeViewer";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareNameA, setCompareNameA] = useState("");
  const [compareNameB, setCompareNameB] = useState("");
  const [compareSuggestionsA, setCompareSuggestionsA] = useState([]);
  const [compareSuggestionsB, setCompareSuggestionsB] = useState([]);

  const [showCompareSuggestionsA, setShowCompareSuggestionsA] = useState(false);
  const [showCompareSuggestionsB, setShowCompareSuggestionsB] = useState(false);

  const [loadingSuggestionsA, setLoadingSuggestionsA] = useState(false);
  const [loadingSuggestionsB, setLoadingSuggestionsB] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);

  // Navigate between the main workspace and the compound collections.
  function navigateTo(tab) {
    setCompareMode(false);
    setActiveTab(tab);

    if (tab === "Discover") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      setCompound(null);
      setQuery("");
      setError("");
      setShowSuggestions(false);
      setSuggestions([]);
      suppressSuggestions.current = false;
    }
  }


  // Move the viewport to the compound gallery when a collection is selected.
  useEffect(() => {
    if (!compareMode && (activeTab === "Recommended" || activeTab === "Favorites")) {
      document.querySelector(".discoveries")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [activeTab, compareMode]);

  useEffect(() => {
    if (suppressSuggestions.current) {
      return;
    }
    const trimmedQuery = query.trim();

    // State cleanup is handled by the input/search event handlers.
    // This effect only starts a request when the query is eligible.
    if (trimmedQuery.length < 2 || searchActive) {
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
  useEffect(() => {
    const text = compareNameA.trim();

    // Only fetch suggestions while this input's dropdown is open.
    // Input handlers clear the dropdown when the query becomes too short.
    if (!showCompareSuggestionsA || text.length < 2) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoadingSuggestionsA(true);

      try {
        const response = await fetch(
          `${API}/api/search/${encodeURIComponent(text)}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (active && response.ok) {
          setCompareSuggestionsA(data.suggestions || []);
          setShowCompareSuggestionsA(true);
        }
      } catch (error) {
        if (error.name !== "AbortError" && active) {
          setCompareSuggestionsA([]);
        }
      } finally {
        if (active) setLoadingSuggestionsA(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [compareNameA, showCompareSuggestionsA]);

  useEffect(() => {
    const text = compareNameB.trim();

    // Only fetch suggestions while this input's dropdown is open.
    // Input handlers clear the dropdown when the query becomes too short.
    if (!showCompareSuggestionsB || text.length < 2) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoadingSuggestionsB(true);

      try {
        const response = await fetch(
          `${API}/api/search/${encodeURIComponent(text)}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (active && response.ok) {
          setCompareSuggestionsB(data.suggestions || []);
          setShowCompareSuggestionsB(true);
        }
      } catch (error) {
        if (error.name !== "AbortError" && active) {
          setCompareSuggestionsB([]);
        }
      } finally {
        if (active) setLoadingSuggestionsB(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [compareNameB, showCompareSuggestionsB]);

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

    setCompareMode(false);
    setActiveTab("Discover");
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
  async function compareCompounds(nameA, nameB) {
    if (!nameA.trim() || !nameB.trim()) {
      setCompareError("Please enter both compound names.");
      return;
    }

    if (nameA.trim().toLowerCase() === nameB.trim().toLowerCase()) {
      setCompareError("Choose two different compounds to compare.");
      return;
    }

    setCompareLoading(true);
    setCompareError("");
    setCompareA(null);
    setCompareB(null);

    try {
      const [responseA, responseB] = await Promise.all([
        fetch(`${API}/api/compounds/${encodeURIComponent(nameA.trim())}`),
        fetch(`${API}/api/compounds/${encodeURIComponent(nameB.trim())}`),
      ]);

      const dataA = await responseA.json();
      const dataB = await responseB.json();

      if (!responseA.ok) {
        throw new Error(`Compound A: ${dataA.detail || "Not found."}`);
      }

      if (!responseB.ok) {
        throw new Error(`Compound B: ${dataB.detail || "Not found."}`);
      }

      if (dataA.CID === dataB.CID) {
        throw new Error("These names resolve to the same compound.");
      }

      setCompareA(dataA);
      setCompareB(dataB);
    } catch (err) {
      setCompareError(
        err.message === "Failed to fetch"
          ? "Cannot reach the backend. Check that FastAPI is running."
          : err.message
      );
    } finally {
      setCompareLoading(false);
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

  // Export report data as a CSV file or a print-ready PDF report.
  function downloadCsv(filename, rows) {
    const escapeCsv = (value) => {
      const text = value === null || value === undefined || value === "" ? "—" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printPdfReport(title, rows) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      window.alert("Your browser blocked the report window. Allow pop-ups for this site and try again.");
      return;
    }
    const escapeHtml = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
    const tableRows = rows.map((row, index) =>
      `<tr>${row.map((cell) => `<${index === 0 ? "th" : "td"}>${escapeHtml(cell)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`
    ).join("");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#17211d;padding:32px;line-height:1.45}h1{margin:0 0 8px;color:#087f5b}p{color:#52615a;margin:0 0 24px}
        table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d6dfda;padding:10px;text-align:left;overflow-wrap:anywhere}th{background:#e9f5ef;color:#145b43}
        tr:nth-child(even) td{background:#f7faf8}.foot{margin-top:24px;font-size:10px;color:#66756d}@media print{body{padding:0}button{display:none}}
      </style></head><body><h1>${escapeHtml(title)}</h1><p>ChemScope · PubChem compound report · Generated ${escapeHtml(new Date().toLocaleString())}</p>
      <table>${tableRows}</table><div class="foot">Values are based on the compound data currently displayed in ChemScope.</div>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  }

  function exportCompoundReport(format) {
    if (!compound) return;
    const rows = [
      ["Property", "Value"],
      ["Compound name", query || compound.IUPACName],
      ["PubChem CID", compound.CID],
      ["Molecular formula", compound.MolecularFormula],
      ["Molecular weight (g/mol)", compound.MolecularWeight],
      ["XLogP", compound.XLogP],
      ["Topological polar surface area (Å²)", compound.TPSA],
      ["Hydrogen-bond donors", compound.HBondDonorCount],
      ["Hydrogen-bond acceptors", compound.HBondAcceptorCount],
      ["Rotatable bonds", compound.RotatableBondCount],
      ["Canonical SMILES", compound.CanonicalSMILES || compound.ConnectivitySMILES],
    ];
    const filename = `${(query || "compound").replace(/[^a-z0-9_-]+/gi, "_")}_report`;
    if (format === "csv") downloadCsv(`${filename}.csv`, rows);
    else printPdfReport(`${query || "Compound"} Analysis Report`, rows);
  }

  function exportComparisonReport(format) {
    if (!compareA || !compareB) return;
    const rows = [
      ["Property", compareNameA || "Compound A", compareNameB || "Compound B"],
      ["PubChem CID", compareA.CID, compareB.CID],
      ["Molecular formula", compareA.MolecularFormula, compareB.MolecularFormula],
      ["Molecular weight (g/mol)", compareA.MolecularWeight, compareB.MolecularWeight],
      ["XLogP", compareA.XLogP, compareB.XLogP],
      ["Polar surface area (Å²)", compareA.TPSA, compareB.TPSA],
      ["Hydrogen-bond donors", compareA.HBondDonorCount, compareB.HBondDonorCount],
      ["Hydrogen-bond acceptors", compareA.HBondAcceptorCount, compareB.HBondAcceptorCount],
      ["Rotatable bonds", compareA.RotatableBondCount, compareB.RotatableBondCount],
    ];
    if (format === "csv") downloadCsv("chemscope_comparison.csv", rows);
    else printPdfReport("ChemScope Compound Comparison Report", rows);
  }

  const shownCompounds =
    activeTab === "Favorites"
      ? favorites
      : activeTab === "Recommended"
        ? starterCompounds
        : recent;

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
            navigateTo("Discover");
          }}
        >
          <span className="brand-symbol">⌬</span>
          Chem<span>Scope</span>
        </a>

        <nav className="navigation">
          <button
            className={activeTab === "Discover" && !compareMode ? "active" : ""}
            onClick={() => navigateTo("Discover")}
          >
            <span>⊕</span> New Study
          </button>

          <button
            className={activeTab === "Recommended" ? "active" : ""}
            onClick={() => navigateTo("Recommended")}
          >
            <span>♧</span> Recommended
          </button>
          <button
            className={compareMode ? "active" : ""}
            onClick={() => {
              setCompareMode(true);
              setActiveTab("Discover");
              setCompareError("");
              setShowCompareSuggestionsA(false);
              setShowCompareSuggestionsB(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span>⇄</span> Compare
          </button>
          <button
            className={activeTab === "Favorites" ? "active" : ""}
            onClick={() => navigateTo("Favorites")}
          >
            <span>☆</span> Favorites
          </button>

          <button
            className={activeTab === "Discover" ? "active" : ""}
            onClick={() => navigateTo("Discover")}
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

      <section
        className="workspace"
        style={{ display: compareMode ? "none" : undefined }}
      >
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
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  setError("");
                  if (nextQuery.trim().length < 2) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSearchingSuggestions(false);
                  }
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
          {compound && (
            <div className="report-actions" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0 18px" }}>
              <button type="button" className="outline-button" onClick={() => exportCompoundReport("csv")}>↓ Export CSV</button>
              <button type="button" className="outline-button" onClick={() => exportCompoundReport("pdf")}>↓ Export PDF</button>
            </div>
          )}


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
              </div>

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
                <strong>{formatProperty(compound?.TPSA)} Å²</strong>
              </div>

              <div className="data-row">
                <span>H-bond donors</span>
                <strong>{formatProperty(compound?.HBondDonorCount, 0)}</strong>
              </div>

              <div className="data-row">
                <span>H-bond acceptors</span>
                <strong>{formatProperty(compound?.HBondAcceptorCount, 0)}</strong>
              </div>

              <div className="data-row">
                <span>Rotatable bonds</span>
                <strong>{formatProperty(compound?.RotatableBondCount, 0)}</strong>
              </div>

              <div className="data-row">
                <span>SMILES</span>
                <strong>
                  {compound?.CanonicalSMILES || compound?.ConnectivitySMILES
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

        </aside>
      </section>

      {compareMode && (
        <section className="compare-panel glass-panel">
          <div className="compare-header">
            <div>
              <p className="panel-caption">PUBCHEM ANALYSIS</p>
              <h1>Compound Comparison</h1>
              <p>Compare molecular properties side by side.</p>
            </div>

            <button
              className="outline-button"
              onClick={() => navigateTo("Discover")}
            >
              ← Back to Discover
            </button>
          </div>

          <form
            className="compare-form"
            onSubmit={(event) => {
              event.preventDefault();
              compareCompounds(compareNameA, compareNameB);
            }}
          >
            <label>
              Compound A
              <input
                value={compareNameA}
                onFocus={() => {
                  if (compareSuggestionsA.length) {
                    setShowCompareSuggestionsA(true);
                  }
                }}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setCompareNameA(nextName);
                  setCompareA(null);
                  setCompareError("");
                  if (nextName.trim().length < 2) {
                    setCompareSuggestionsA([]);
                    setShowCompareSuggestionsA(false);
                    setLoadingSuggestionsA(false);
                  } else {
                    setShowCompareSuggestionsA(true);
                  }
                }}
                placeholder="e.g. Caffeine"
              />

              {loadingSuggestionsA && (
                <p className="suggestion-status">Finding compounds...</p>
              )}

              {showCompareSuggestionsA && compareSuggestionsA.length > 0 && (
                <div className="compare-suggestions">
                  {compareSuggestionsA.map((item, index) => {
                    const name = typeof item === "string" ? item : item.name;

                    return (
                      <button
                        type="button"
                        key={`${name}-${index}`}
                        onClick={() => {
                          setCompareNameA(name);
                          setShowCompareSuggestionsA(false);
                          setCompareSuggestionsA([]);
                          setCompareA(null);
                          setCompareError("");
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </label>

            <div className="compare-symbol">⇄</div>

            <label>
              Compound B
              <input
                value={compareNameB}
                onFocus={() => {
                  if (compareSuggestionsB.length) {
                    setShowCompareSuggestionsB(true);
                  }
                }}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setCompareNameB(nextName);
                  setCompareB(null);
                  setCompareError("");
                  if (nextName.trim().length < 2) {
                    setCompareSuggestionsB([]);
                    setShowCompareSuggestionsB(false);
                    setLoadingSuggestionsB(false);
                  } else {
                    setShowCompareSuggestionsB(true);
                  }
                }}
                placeholder="e.g. Aspirin"
              />

              {loadingSuggestionsB && (
                <p className="suggestion-status">Finding compounds...</p>
              )}

              {showCompareSuggestionsB && compareSuggestionsB.length > 0 && (
                <div className="compare-suggestions">
                  {compareSuggestionsB.map((item, index) => {
                    const name = typeof item === "string" ? item : item.name;

                    return (
                      <button
                        type="button"
                        key={`${name}-${index}`}
                        onClick={() => {
                          setCompareNameB(name);
                          setShowCompareSuggestionsB(false);
                          setCompareSuggestionsB([]);
                          setCompareB(null);
                          setCompareError("");
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </label>

            <button type="submit" disabled={compareLoading}>
              {compareLoading ? "Comparing..." : "Compare compounds"}
            </button>
          </form>

          {compareError && (
            <p className="error-message">{compareError}</p>
          )}

          {compareLoading && (
            <p className="chart-note">Fetching compound data from PubChem...</p>
          )}

          {compareA && compareB && (
            <>
              <div className="report-actions comparison-report-actions" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "18px 0" }}>
                <button type="button" className="outline-button" onClick={() => exportComparisonReport("csv")}>↓ Export comparison CSV</button>
                <button type="button" className="outline-button" onClick={() => exportComparisonReport("pdf")}>↓ Export comparison PDF</button>
              </div>
              <div className="comparison-results">
                <div className="comparison-compounds">
                  {[compareA, compareB].map((item) => (
                    <div className="comparison-compound" key={item.CID}>
                      <img
                        src={structureUrl(item.CID)}
                        alt={`${item.IUPACName || "Compound"} structure`}
                      />
                      <h2>{item.IUPACName || `Compound ${item.CID}`}</h2>
                      <p>{item.MolecularFormula}</p>
                      <span>CID: {item.CID}</span>
                    </div>
                  ))}
                </div>

                <div className="comparison-table-wrap">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>{compareA.IUPACName || "Compound A"}</th>
                        <th>{compareB.IUPACName || "Compound B"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Molecular formula", "MolecularFormula", ""],
                        ["Molecular weight (g/mol)", "MolecularWeight", "number"],
                        ["XLogP", "XLogP", "number"],
                        ["Polar surface area (Å²)", "TPSA", "number"],
                        ["Hydrogen-bond donors", "HBondDonorCount", "number"],
                        ["Hydrogen-bond acceptors", "HBondAcceptorCount", "number"],
                        ["Rotatable bonds", "RotatableBondCount", "number"],
                      ].map(([label, key, type]) => (
                        <tr key={key}>
                          <td>{label}</td>
                          <td>
                            {type === "number"
                              ? formatProperty(compareA[key])
                              : compareA[key] ?? "—"}
                          </td>
                          <td>
                            {type === "number"
                              ? formatProperty(compareB[key])
                              : compareB[key] ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <section
        className="discoveries glass-panel"
        style={{ display: compareMode ? "none" : undefined }}
      >
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
