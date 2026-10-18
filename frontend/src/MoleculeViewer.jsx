
import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";

export default function MoleculeViewer({ cid }) {
     const viewerRef = useRef(null);
     const containerRef = useRef(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState("");

     useEffect(() => {
          let cancelled = false;
          let viewer;

          async function loadMolecule() {
               setLoading(true);
               setError("");

               try {
                    const response = await fetch(
                         `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF?record_type=3d`
                    );

                    if (!response.ok) {
                         throw new Error(
                              "A 3D structure is unavailable for this compound."
                         );
                    }

                    const sdf = await response.text();

                    if (cancelled || !containerRef.current) return;

                    containerRef.current.innerHTML = "";

                    viewer = $3Dmol.createViewer(containerRef.current, {
                         backgroundColor: "#0b1110",
                    });

                    viewerRef.current = viewer;

                    viewer.addModel(sdf, "sdf");
                    viewer.setStyle({}, {
                         stick: { radius: 0.16, colorscheme: "Jmol" },
                         sphere: { scale: 0.25, colorscheme: "Jmol" },
                    });

                    viewer.zoomTo();
                    viewer.resize();
                    viewer.render();

                    setLoading(false);
               } catch (err) {
                    if (!cancelled) {
                         setError(err.message || "Could not load the 3D structure.");
                         setLoading(false);
                    }
               }
          }

          loadMolecule();

          return () => {
               cancelled = true;

               if (viewer) {
                    viewer.clear();
               }

               viewerRef.current = null;
          };
     }, [cid]);

     return (
          <div className="molecule-viewer-wrapper">
               <div
                    ref={containerRef}
                    className="molecule-viewer-canvas"
                    aria-label="Interactive 3D molecular structure"
               />

               {loading && (
                    <div className="molecule-viewer-message">
                         Loading 3D structure...
                    </div>
               )}

               {error && (
                    <div className="molecule-viewer-message viewer-error">
                         {error}
                    </div>
               )}

               <p className="viewer-hint">
                    Drag to rotate · Scroll to zoom
               </p>
          </div>
     );
}
