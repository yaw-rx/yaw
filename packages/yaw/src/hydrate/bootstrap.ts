import type { HydrationStateBlob } from './types.js';
import { setHydrationStateBlob } from './blob.js';

/**
 * Reads the SSG state blob from the captured HTML and stores it
 * for {@link getComponentHydrationState} and {@link getServiceHydrationState}.
 *
 * During SSG capture, `ssgFinalize` serializes all component and service
 * state into a `<script id="yaw-ssg-state">` JSON blob. This function
 * parses it. Called once during bootstrap when `__yaw_hydrate` is true.
 * @returns {void}
 */
export const loadHydrationState = (): void => {
    const el = document.getElementById('yaw-ssg-state');
    if (el === null) return;
    setHydrationStateBlob(JSON.parse(el.textContent!) as HydrationStateBlob);
};

/**
 * Removes all `data-ssg-id` attributes from the DOM after hydration completes.
 *
 * These attributes are structural markers used during SSG capture to map
 * components to their serialized state. They serve no purpose after hydration.
 * @returns {void}
 */
export const stripSsgAttributes = (): void => {
    for (const el of document.querySelectorAll('[data-ssg-id]')) {
        el.removeAttribute('data-ssg-id');
    }
};
