import { getHydrationStateBlob } from './blob.js';

/**
 * Returns the hydration state for a component identified by its `data-ssg-id`.
 * @param {string} ssgId - The SSG identifier assigned to the component during capture.
 * @returns {Record<string, unknown> | undefined} The serialized state record, or undefined if no state was captured.
 */
export const getComponentHydrationState = (ssgId: string): Record<string, unknown> | undefined =>
    getHydrationStateBlob()?.components[ssgId];

/**
 * Returns the hydration state for a service identified by its constructor name.
 * @param {string} name - The constructor name of the service class.
 * @returns {Record<string, unknown> | undefined} The serialized state record, or undefined if no state was captured.
 */
export const getServiceHydrationState = (name: string): Record<string, unknown> | undefined =>
    getHydrationStateBlob()?.services[name];
