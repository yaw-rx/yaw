import type { SSGStateBlob } from '../types.js';
import { setHydrateBlob } from './blob.js';

/**
 * Reads the SSG state blob from the captured HTML and stores it
 * for {@link getComponentHydrateState} and {@link getServiceHydrateState}.
 *
 * During SSG capture, `ssgFinalize` serializes all component and service
 * state into a `<script id="yaw-ssg-state">` JSON blob. This function
 * parses it. Called once during bootstrap when `__yaw_hydrate` is true.
 */
export const loadHydrateState = (): void => {
    const el = document.getElementById('yaw-ssg-state');
    if (el === null) return;
    setHydrateBlob(JSON.parse(el.textContent!) as SSGStateBlob);
};
