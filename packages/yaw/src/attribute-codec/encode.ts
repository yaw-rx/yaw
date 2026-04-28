import { AttributeMarshalError } from '../errors.js';
import { getAttributeCodec } from './registry.js';

export const encodeAttribute = (typeName: string, key: string, value: unknown): string => {
    const codec = getAttributeCodec(typeName);
    console.log('[ssg] encodeAttribute', typeName, key, codec.encode.toString().slice(0, 80));
    try {
        return codec.encode(value);
    } catch (cause) {
        const desc = Object.prototype.toString.call(value);
        console.error('[ssg] encodeAttribute failed', typeName, key, desc, cause);
        throw new AttributeMarshalError(key, typeName, 'encode', desc, cause);
    }
};
