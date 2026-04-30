import { AttributeMarshalError } from '../errors.js';
import { getAttributeCodec } from './registry.js';

export const encodeAttribute = (typeName: string, key: string, value: unknown): string => {
    const codec = getAttributeCodec(typeName);
    try {
        return codec.encode(value);
    } catch (cause) {
        throw new AttributeMarshalError(key, typeName, 'encode', Object.prototype.toString.call(value), cause);
    }
};
