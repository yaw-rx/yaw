import { getHydrateBlob } from './blob.js';

/**
 * Returns the hydration state for a service identified by its constructor name.
 *
 * @param name - The constructor name of the service class.
 * @returns The serialized state record, or `undefined` if no state was captured.
 */
export const getServiceHydrateState = (name: string): Record<string, unknown> | undefined =>
    getHydrateBlob()?.services[name];
