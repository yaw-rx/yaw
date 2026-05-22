import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { CaptureResult } from './capture.js';

const HYDRATE_SCRIPT = '<script>globalThis.__yaw_hydrate=true;</script>';
const GSSB_DIR = 'assets/gssb';

/**
 * Validates there are no scope + key collisions across captured pages.
 * @param {readonly CaptureResult[]} results - The captured pages.
 */
function validateNoCollisions(results: readonly CaptureResult[]): void {
    const seen: Record<string, Record<string, true>> = {};
    for (const result of results) {
        for (const [scope, entries] of Object.entries(result.globalSSGState)) {
            const bucket = seen[scope] ??= {};
            for (const key of Object.keys(entries)) {
                if (key in bucket) throw new Error(`Global SSG state collision: "${key}" in scope "${scope}"`);
                bucket[key] = true;
            }
        }
    }
}

/**
 * Writes each scope's global SSG state as a separate JS chunk in _gssb/.
 * Returns the modulepreload tags for all chunks.
 */
function writeGlobalSSGStateChunks(results: readonly CaptureResult[], outDir: string): string {
    const scopes: Record<string, Record<string, unknown>> = {};
    for (const result of results) {
        for (const [scope, entries] of Object.entries(result.globalSSGState)) {
            const bucket = scopes[scope] ??= {};
            Object.assign(bucket, entries);
        }
    }

    const scopeNames = Object.keys(scopes);
    if (scopeNames.length === 0) return '';

    const gssbDir = join(outDir, GSSB_DIR);
    mkdirSync(gssbDir, { recursive: true });

    const globalSSGStateModulePreloads: string[] = [];

    for (const scope of scopeNames) {
        const filename = encodeURIComponent(scope.replace(/^\//, '')) + '.js';
        const script = `globalThis.__yaw_global_merge(${JSON.stringify(scope)},${JSON.stringify(scopes[scope])});`;
        writeFileSync(join(gssbDir, filename), script);
        globalSSGStateModulePreloads.push(`<link rel="modulepreload" href="/${GSSB_DIR}/${filename}">`);
        console.log(`  chunk ${GSSB_DIR}/${filename}`);
    }

    return '\n' + globalSSGStateModulePreloads.join('\n');
}

/**
 * Writes all captured pages to disk, injecting the hydration script
 * and modulepreload tags for all global SSG state chunks.
 * @param {readonly CaptureResult[]} results - The captured pages.
 * @param {string} outDir - The output directory.
 */
export function renderPages(results: readonly CaptureResult[], outDir: string): void {
    validateNoCollisions(results);
    const globalSSGStateModulePreloads = writeGlobalSSGStateChunks(results, outDir);

    for (const { route, html } of results) {
        const output = html.replace('<head>', '<head>\n' + HYDRATE_SCRIPT + globalSSGStateModulePreloads);
        const outPath = route === '/' ? join(outDir, 'index.html') : join(outDir, route, 'index.html');
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, output);
        console.log(`Rendered ${route} -> ${outPath}`);
    }
}
