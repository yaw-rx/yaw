export const DOC_STYLES = `
    h1 { color: #fff; font-size: 2rem; font-weight: 900;
         letter-spacing: -1px; margin: 0 0 0.75rem; }
    .lede { color: #888; line-height: 1.7; margin-bottom: 2rem; max-width: 72ch; }
    .inline { background: #111; padding: 0.1rem 0.4rem;
              border-radius: 3px; font-size: 0.9em; color: #8af; }
    h2 { color: #fff; font-size: 1.1rem; font-weight: 700;
         margin: 0 0 1rem; letter-spacing: 0.02em; }
    .host, .ex { margin-bottom: 1.5rem; padding: 1.25rem;
                 background: #0a0a0a; border: 1px solid #1a1a1a;
                 border-radius: 8px; }
    .note { color: #888; font-size: 0.9rem; line-height: 1.6;
            margin: 0 0 1rem; max-width: 72ch; }
    .split { display: grid;
             grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
             gap: 1rem; align-items: stretch; }
    .split > * { min-width: 0; }
`;
