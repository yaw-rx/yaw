export const DOC_STYLES = `
    h1 { color: var(--white); font-size: 2rem; font-weight: 900;
         letter-spacing: -1px; margin: 0 0 0.75rem; }
    .lede { color: var(--secondary); line-height: 1.7; margin-bottom: 2rem; max-width: 72ch; }
    .lede + .lede { margin-top: 0.75rem; }
    .lede + code-block { margin-top: 1rem; }
    .inline { background: var(--bg-3); padding: 0.1rem 0.4rem;
              border-radius: 3px; font-size: 0.9em; color: var(--accent);
              overflow-wrap: anywhere; word-break: break-word; }
    h2 { color: var(--white); font-size: 1.1rem; font-weight: 700;
         margin: 0 0 1rem; letter-spacing: 0.02em; }
    .host { margin-top: 1.5rem; margin-bottom: 1.5rem; }
    .host > code-block { margin-bottom: 1rem; }
    .host .ex { margin-top: 1rem; }
    .ex { margin-bottom: 1.5rem; padding: 1.25rem;
          background: var(--bg-2); border: 1px solid var(--bg-5);
          border-radius: 8px; }
    .note { color: var(--secondary); font-size: 0.9rem; line-height: 1.6;
            margin: 0 0 1rem; max-width: 72ch; }
    .split { display: grid;
             grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
             gap: 1rem; align-items: stretch;
             container-type: inline-size; }
    .split > * { min-width: 0; max-width: 100%; box-sizing: border-box; }
    @container (min-width: 576px) {
        .split > code-block .cb {
            display: flex; flex-direction: column;
            justify-content: center;
            align-items: safe center;
        }
    }
    .live { padding: 1.5rem; background: var(--bg-1);
            border: 1px solid var(--bg-5); border-radius: 8px;
            min-width: 0; max-width: 100%; box-sizing: border-box; }
    .live > * { max-width: 100%; }
`;
