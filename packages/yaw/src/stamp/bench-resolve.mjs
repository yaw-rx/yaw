import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

const N = 10000;
const RUNS = 1000;

const isObservable = (v) => v != null && typeof v.subscribe === 'function';
const isBehaviorSubject = (v) => v instanceof BehaviorSubject;
const isPromise = (v) => v instanceof Promise;

// Truly async observable: emits after a microtask
const asyncOf = (v) => new Observable((sub) => { queueMicrotask(() => { sub.next(v); sub.complete(); }); });

// Truly async promise: resolves after a microtask
const asyncPromise = (v) => new Promise((resolve) => { queueMicrotask(() => resolve(v)); });

// --- Test data ---
const plainValues = Array.from({ length: N }, (_, i) => ({ label: `Item ${i}` }));
const bsValues = Array.from({ length: N }, (_, i) => ({ label: new BehaviorSubject(`Item ${i}`) }));
const mixedSync5050 = Array.from({ length: N }, (_, i) =>
    i % 2 === 0 ? { label: `Item ${i}` } : { label: new BehaviorSubject(`Item ${i}`) }
);
// async ratios: 10%, 50%, 100%
const makeAsyncObs = (pct) => Array.from({ length: N }, (_, i) =>
    (i % Math.round(100 / pct)) === 0 ? { label: asyncOf(`Item ${i}`) } : { label: `Item ${i}` }
);
const makeAsyncProm = (pct) => Array.from({ length: N }, (_, i) =>
    (i % Math.round(100 / pct)) === 0 ? { label: asyncPromise(`Item ${i}`) } : { label: `Item ${i}` }
);
const asyncObs10 = makeAsyncObs(10);
const asyncObs50 = makeAsyncObs(50);
const asyncObs100 = Array.from({ length: N }, (_, i) => ({ label: asyncOf(`Item ${i}`) }));
const asyncProm10 = makeAsyncProm(10);
const asyncProm50 = makeAsyncProm(50);
const asyncProm100 = Array.from({ length: N }, (_, i) => ({ label: asyncPromise(`Item ${i}`) }));

// --- Single-pass: classify and resolve inline ---
function singlePass(values, key) {
    const len = values.length;
    const out = new Array(len);
    let asyncIndices = null;
    let asyncPromises = null;

    for (let i = 0; i < len; i++) {
        const raw = values[i][key];
        if (isBehaviorSubject(raw)) {
            out[i] = raw.value;
        } else if (isObservable(raw)) {
            if (asyncIndices === null) { asyncIndices = []; asyncPromises = []; }
            asyncIndices.push(i);
            asyncPromises.push(firstValueFrom(raw));
        } else if (isPromise(raw)) {
            if (asyncIndices === null) { asyncIndices = []; asyncPromises = []; }
            asyncIndices.push(i);
            asyncPromises.push(raw);
        } else {
            out[i] = raw;
        }
    }

    if (asyncIndices === null) return out;
    return Promise.all(asyncPromises).then((resolved) => {
        for (let j = 0; j < resolved.length; j++) out[asyncIndices[j]] = resolved[j];
        return out;
    });
}

// --- Two-pass: classify all first, then resolve ---
// Sync loop is monomorphic: no type checks, just reads from kinds[]
function twoPass(values, key) {
    const len = values.length;
    const kinds = new Array(len);
    const raw = new Array(len);

    // Pass 1: classify only
    for (let i = 0; i < len; i++) {
        const v = values[i][key];
        raw[i] = v;
        if (isBehaviorSubject(v)) kinds[i] = 1;
        else if (isObservable(v)) kinds[i] = 2;
        else if (isPromise(v)) kinds[i] = 3;
        else kinds[i] = 0;
    }

    // Pass 2: resolve sync (tight loop, integer comparison only)
    const out = new Array(len);
    for (let i = 0; i < len; i++) {
        const k = kinds[i];
        if (k === 0) out[i] = raw[i];
        else if (k === 1) out[i] = raw[i].value;
    }

    // Pass 3: batch async
    let asyncIndices = null;
    let asyncPromises = null;
    for (let i = 0; i < len; i++) {
        const k = kinds[i];
        if (k === 2) {
            if (asyncIndices === null) { asyncIndices = []; asyncPromises = []; }
            asyncIndices.push(i);
            asyncPromises.push(firstValueFrom(raw[i]));
        } else if (k === 3) {
            if (asyncIndices === null) { asyncIndices = []; asyncPromises = []; }
            asyncIndices.push(i);
            asyncPromises.push(raw[i]);
        }
    }

    if (asyncIndices === null) return out;
    return Promise.all(asyncPromises).then((resolved) => {
        for (let j = 0; j < resolved.length; j++) out[asyncIndices[j]] = resolved[j];
        return out;
    });
}

// --- Single-pass with bitmask: no asyncIndices array ---
function bitmaskPass(values, key) {
    const len = values.length;
    const out = new Array(len);
    const words = (len + 31) >>> 5;
    const bits = new Uint32Array(words);
    let asyncPromises = null;
    let asyncCount = 0;

    for (let i = 0; i < len; i++) {
        const raw = values[i][key];
        if (isBehaviorSubject(raw)) {
            out[i] = raw.value;
        } else if (isObservable(raw)) {
            bits[i >>> 5] |= 1 << (i & 31);
            if (asyncPromises === null) asyncPromises = [];
            asyncPromises.push(firstValueFrom(raw));
            asyncCount++;
        } else if (isPromise(raw)) {
            bits[i >>> 5] |= 1 << (i & 31);
            if (asyncPromises === null) asyncPromises = [];
            asyncPromises.push(raw);
            asyncCount++;
        } else {
            out[i] = raw;
        }
    }

    if (asyncCount === 0) return out;

    return Promise.all(asyncPromises).then((resolved) => {
        let r = 0;
        for (let w = 0; w < words; w++) {
            let word = bits[w];
            while (word !== 0) {
                const bit = word & (-word);
                const idx = (w << 5) + (31 - Math.clz32(bit));
                out[idx] = resolved[r++];
                word ^= bit;
            }
        }
        return out;
    });
}

// --- Single-pass, single integer: promises stored in out[], counter only ---
function counterPass(values, key) {
    const len = values.length;
    const out = new Array(len);
    let pending = 0;

    for (let i = 0; i < len; i++) {
        const raw = values[i][key];
        if (isBehaviorSubject(raw)) {
            out[i] = raw.value;
        } else if (isObservable(raw)) {
            out[i] = firstValueFrom(raw);
            pending++;
        } else if (isPromise(raw)) {
            out[i] = raw;
            pending++;
        } else {
            out[i] = raw;
        }
    }

    if (pending === 0) return out;

    const indices = [];
    const promises = [];
    for (let i = 0; i < len; i++) {
        if (out[i] instanceof Promise) {
            indices.push(i);
            promises.push(out[i]);
        }
    }
    return Promise.all(promises).then((resolved) => {
        for (let j = 0; j < resolved.length; j++) out[indices[j]] = resolved[j];
        return out;
    });
}

// --- Bench harness ---
function benchSync(name, fn, data, key) {
    for (let i = 0; i < 1000; i++) fn(data, key);
    const start = performance.now();
    for (let i = 0; i < RUNS; i++) fn(data, key);
    const elapsed = performance.now() - start;
    console.log(`  ${name.padEnd(16)} ${(elapsed / RUNS * 1000).toFixed(1)} us/call`);
}

async function benchAsync(name, fn, dataFn, key) {
    for (let i = 0; i < 50; i++) await fn(dataFn(), key);
    const start = performance.now();
    for (let i = 0; i < RUNS; i++) await fn(dataFn(), key);
    const elapsed = performance.now() - start;
    console.log(`  ${name.padEnd(16)} ${(elapsed / RUNS * 1000).toFixed(1)} us/call`);
}

console.log(`\n--- SYNC SCENARIOS (${N} items, ${RUNS} runs) ---`);

console.log(`\n100% plain values:`);
benchSync('single-pass', singlePass, plainValues, 'label');
benchSync('bitmask', bitmaskPass, plainValues, 'label');
benchSync('counter', counterPass, plainValues, 'label');
benchSync('two-pass', twoPass, plainValues, 'label');

console.log(`\n100% BehaviorSubject:`);
benchSync('single-pass', singlePass, bsValues, 'label');
benchSync('bitmask', bitmaskPass, bsValues, 'label');
benchSync('counter', counterPass, bsValues, 'label');
benchSync('two-pass', twoPass, bsValues, 'label');

console.log(`\n50% plain + 50% BehaviorSubject:`);
benchSync('single-pass', singlePass, mixedSync5050, 'label');
benchSync('bitmask', bitmaskPass, mixedSync5050, 'label');
benchSync('counter', counterPass, mixedSync5050, 'label');
benchSync('two-pass', twoPass, mixedSync5050, 'label');

console.log(`\n--- ASYNC SCENARIOS (${N} items, ${RUNS} runs, fresh data each) ---`);

console.log(`\n10% Observable + 90% plain:`);
await benchAsync('single-pass', singlePass, () => makeAsyncObs(10), 'label');
await benchAsync('bitmask', bitmaskPass, () => makeAsyncObs(10), 'label');
await benchAsync('counter', counterPass, () => makeAsyncObs(10), 'label');
await benchAsync('two-pass', twoPass, () => makeAsyncObs(10), 'label');

console.log(`\n50% Observable + 50% plain:`);
await benchAsync('single-pass', singlePass, () => makeAsyncObs(50), 'label');
await benchAsync('bitmask', bitmaskPass, () => makeAsyncObs(50), 'label');
await benchAsync('counter', counterPass, () => makeAsyncObs(50), 'label');
await benchAsync('two-pass', twoPass, () => makeAsyncObs(50), 'label');

console.log(`\n100% Observable:`);
await benchAsync('single-pass', singlePass, () => Array.from({ length: N }, (_, i) => ({ label: asyncOf(`Item ${i}`) })), 'label');
await benchAsync('bitmask', bitmaskPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncOf(`Item ${i}`) })), 'label');
await benchAsync('counter', counterPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncOf(`Item ${i}`) })), 'label');
await benchAsync('two-pass', twoPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncOf(`Item ${i}`) })), 'label');

console.log(`\n10% Promise + 90% plain:`);
await benchAsync('single-pass', singlePass, () => makeAsyncProm(10), 'label');
await benchAsync('bitmask', bitmaskPass, () => makeAsyncProm(10), 'label');
await benchAsync('counter', counterPass, () => makeAsyncProm(10), 'label');
await benchAsync('two-pass', twoPass, () => makeAsyncProm(10), 'label');

console.log(`\n50% Promise + 50% plain:`);
await benchAsync('single-pass', singlePass, () => makeAsyncProm(50), 'label');
await benchAsync('bitmask', bitmaskPass, () => makeAsyncProm(50), 'label');
await benchAsync('counter', counterPass, () => makeAsyncProm(50), 'label');
await benchAsync('two-pass', twoPass, () => makeAsyncProm(50), 'label');

console.log(`\n100% Promise:`);
await benchAsync('single-pass', singlePass, () => Array.from({ length: N }, (_, i) => ({ label: asyncPromise(`Item ${i}`) })), 'label');
await benchAsync('bitmask', bitmaskPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncPromise(`Item ${i}`) })), 'label');
await benchAsync('counter', counterPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncPromise(`Item ${i}`) })), 'label');
await benchAsync('two-pass', twoPass, () => Array.from({ length: N }, (_, i) => ({ label: asyncPromise(`Item ${i}`) })), 'label');
