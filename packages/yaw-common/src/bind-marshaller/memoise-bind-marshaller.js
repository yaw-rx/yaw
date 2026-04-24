"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoiseBindMarshaller = void 0;
const memoiseBindMarshaller = (inner) => {
    const decodeCache = new Map();
    return {
        encode(kind, memberPath) {
            return inner.encode(kind, memberPath);
        },
        decode(attr) {
            let result = decodeCache.get(attr);
            if (result !== undefined)
                return result;
            if (decodeCache.has(attr))
                return undefined;
            result = inner.decode(attr);
            decodeCache.set(attr, result);
            return result;
        },
    };
};
exports.memoiseBindMarshaller = memoiseBindMarshaller;
