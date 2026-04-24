import { AttributeMarshalError } from '../errors.js';
import { getAttributeCodec } from './registry.js';

export const decodeAttribute = (typeName: string, key: string, raw: string): unknown => {
    const codec = getAttributeCodec(typeName);
    try {
        return codec.decode(raw);
    } catch (cause) {
        throw new AttributeMarshalError(key, typeName, 'decode', raw, cause);
    }
};
