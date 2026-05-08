import { useEffect, useMemo, useState } from "react";

import opticsPdf from "../../resources/optics.pdf";
import oscillationsPdf from "../../resources/oscillations.pdf";
import wavesPdf from "../../resources/waves.pdf";

export default function TemplateResourcesPanel({
  chapterId,
  chapterLabel,
  simulationLabel,
  isOpen,
  onClose = () => {}
}) {
  const [activePdf, setActivePdf] = useState(null);
  const resource = useMemo(() => {
    const resourcesByChapter = {
      optics: {
        pdfUrl: opticsPdf,
        topic: "Optics",
        fileName: "optics.pdf"
      },
      oscillations: {
        pdfUrl: oscillationsPdf,
        topic: "Oscillations",
        fileName: "oscillations.pdf"
      },
      waves: {
        pdfUrl: wavesPdf,
        topic: "Waves",
        fileName: "waves.pdf"
      }
    };

    return resourcesByChapter[chapterId] ?? resourcesByChapter.oscillations;
  }, [chapterId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activePdf) {
          setActivePdf(null);
          return;
        }
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePdf, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setActivePdf(null);
    }
  }, [isOpen]);

  const openNcertPdf = () => {
    setActivePdf({
      title: `NCERT ${resource.topic}`,
      url: resource.pdfUrl
    });
  };

  return (
    <section className={`resources-widget ${isOpen ? "open" : ""}`} aria-label="Study resources">
      <div className={`resources-backdrop ${isOpen ? "open" : ""}`} onClick={onClose} />
      <aside
        id="template-resources-panel"
        className={`resources-panel ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <div className="resources-head">
          <div>
            <div className="resources-title">Study Resources</div>
            <div className="resources-scope">
              {chapterLabel} / {simulationLabel}
            </div>
          </div>
          <button type="button" className="resources-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="resources-scroll">
          <div className="resources-group">
            <h3>Textbook</h3>
            <button type="button" className="resource-card" onClick={openNcertPdf}>
              <span className="resource-card-mark" aria-hidden="true">
                PDF
              </span>
              <span className="resource-card-body">
                <span className="resource-card-kicker">NCERT</span>
                <span className="resource-card-title">{resource.topic} textbook</span>
                <span className="resource-card-source">{resource.fileName}</span>
              </span>
              <span className="resource-card-action" aria-hidden="true">
                Open
              </span>
            </button>
          </div>
        </div>
      </aside>

      {activePdf ? (
        <div className="pdf-viewer-shell" role="dialog" aria-modal="true" aria-label={activePdf.title}>
          <div className="pdf-viewer-head">
            <div>
              <div className="pdf-viewer-title">{activePdf.title}</div>
              <div className="pdf-viewer-subtitle">NCERT textbook PDF</div>
            </div>
            <div className="pdf-viewer-actions">
              <a className="pdf-viewer-link" href={activePdf.url} target="_blank" rel="noreferrer">
                New tab
              </a>
              <button type="button" className="pdf-viewer-close" onClick={() => setActivePdf(null)}>
                Close
              </button>
            </div>
          </div>
          <iframe className="pdf-viewer-frame" src={activePdf.url} title={activePdf.title} />
        </div>
      ) : null}
    </section>
  );
}
