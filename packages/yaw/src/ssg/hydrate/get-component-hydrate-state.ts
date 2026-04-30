import { getHydrateBlob } from './blob.js';

/**
 * Returns the hydration state for a component identified by its `data-ssg-id`.
 *
 * @param ssgId - The SSG identifier assigned to the component during capture.
 * @returns The serialized state record, or `undefined` if no state was captured.
 */
export const getComponentHydrateState = (ssgId: string): Record<string, unknown> | undefined =>
    getHydrateBlob()?.components[ssgId];
