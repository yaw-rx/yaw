import { AttributeMarshalError } from '../errors.js';
import { getAttributeCodec } from './registry.js';

/**
 * Decodes a DOM attribute string into a typed value using the
 * registered codec for the given type name.
 * @param {string} typeName - The codec type name (e.g. 'number', 'Date', 'Array').
 * @param {string} key - The attribute/state key name, used in error messages.
 * @param {string} raw - The raw attribute string to decode.
 * @returns {unknown} The decoded value.
 * @throws {AttributeMarshalError} If the codec's decode function throws.
 */
export const decodeAttribute = (typeName: string, key: string, raw: string): unknown => {
    const codec = getAttributeCodec(typeName);
    try {
        return codec.decode(raw);
    } catch (cause) {
        throw new AttributeMarshalError(key, typeName, 'decode', raw, cause);
    }
};
