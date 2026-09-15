import CitationManager from "@/components/CitationManager";
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to citation workspace
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="SAL Citation home">
          <span className="brand-symbol" aria-hidden="true">
            S<span>•</span>
          </span>
          <span>
            SAL <strong>Citation</strong>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#style-notes">Style notes</a>
          <a
            href="https://github.com/kevanwee/sal-citation-generator"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </nav>
        <span className="edition-badge">FOR THE FOOTNOTES THAT MATTER</span>
      </header>
      <main id="workspace">
        <section className="intro">
          <div>
            <p className="eyebrow">
              SINGAPORE ACADEMY OF LAW · ACADEMIC CITATIONS
            </p>
            <h1>
              Your sources.
              <br className="mobile-break" /> In good form.
            </h1>
            <p>
              A thoughtful workspace for precise legal citations.
              <br />
              Add a source, build your footnotes, get back to your argument.
            </p>
          </div>
          <div className="intro-aside">
            <span className="intro-line" />
            <p>
              Less formatting.
              <br />
              <em>More writing.</em>
            </p>
          </div>
        </section>
        <CitationManager />
      </main>
      <footer className="site-footer">
        <span>
          SAL Citation <span className="footer-dot">·</span> An independent
          writing tool by Kevan Wee
        </span>
        <span>Based on supplied SAL 2007 & SLR 2021 guides</span>
      </footer>
    </>
  );
}
