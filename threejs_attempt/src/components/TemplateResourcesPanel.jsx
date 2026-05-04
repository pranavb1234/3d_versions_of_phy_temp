import { useEffect } from "react";

export default function TemplateResourcesPanel({
  chapterLabel,
  simulationLabel,
  isOpen,
  onClose = () => {}
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

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

        <div className="resources-scroll" />
      </aside>
    </section>
  );
}
