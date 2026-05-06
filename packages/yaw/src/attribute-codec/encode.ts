import { AttributeMarshalError } from '../errors.js';
import { getAttributeCodec } from './registry.js';

/**
 * Encodes a typed value into a DOM attribute string using the
 * registered codec for the given type name.
 * @param {string} typeName - The codec type name (e.g. 'number', 'Date', 'Array').
 * @param {string} key - The attribute/state key name, used in error messages.
 * @param {unknown} value - The value to encode.
 * @returns {string} The encoded attribute string.
 * @throws {AttributeMarshalError} If the codec's encode function throws.
 */
export const encodeAttribute = (typeName: string, key: string, value: unknown): string => {
    const codec = getAttributeCodec(typeName);
    try {
        return codec.encode(value);
    } catch (cause) {
        throw new AttributeMarshalError(key, typeName, 'encode', Object.prototype.toString.call(value), cause);
    }
};
