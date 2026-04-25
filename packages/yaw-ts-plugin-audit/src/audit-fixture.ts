import { Component, RxElement, state } from 'yaw';

interface UserProfile {
    name: string;
    age: number;
    tags: string[];
}

class Coordinate {
    constructor(public x: number, public y: number) {}
}

enum Status { Active = 'active', Inactive = 'inactive' }

const Constants = { MAX_RETRIES: 3 } as const;
const DEFAULT_NAME = 'anonymous';
const MAYBE_NAME: string | undefined = 'hello';
const BASE_CONFIG = { host: 'localhost', port: 8080 };
const MORE_NUMBERS = [4, 5, 6];

declare function createDefault(): UserProfile;

@Component({ selector: 'type-holes', template: `` })
export class TypeHoles extends RxElement {
    // --- primitives: plugin infers correctly ---
    @state count = 0;
    @state label = '';
    @state active = false;
    @state big = 0n;

    // --- class generics: plugin drops type arguments ---
    // map$:     BehaviorSubject<Map>        — should be Map<string, number>
    // set$:     BehaviorSubject<Set>        — should be Set<UserProfile>
    // weakRef$: BehaviorSubject<WeakRef>    — should be WeakRef<HTMLElement>
    @state map = new Map<string, number>();
    @state set = new Set<UserProfile>();
    @state weakRef = new WeakRef<HTMLElement>(document.body);

    // --- array literals: plugin loses element type ---
    // numbers$: BehaviorSubject<unknown[]>  — should be number[]
    // mixed$:   BehaviorSubject<unknown[]>  — should be (string | number | boolean)[]
    @state numbers = [1, 2, 3];
    @state mixed = [1, 'a', true];

    // --- object literals: plugin loses shape ---
    // config$: BehaviorSubject<Record<string, unknown>> — should be { host: string; port: number }
    // nested$: BehaviorSubject<Record<string, unknown>> — should be { a: { b: { c: number } } }
    @state config = { host: 'localhost', port: 8080 };
    @state nested = { a: { b: { c: 1 } } };

    // --- no declare emitted at all ---
    @state ternary = Math.random() > 0.5 ? 'yes' : 'no';
    @state casted = [1, 2, 3] as readonly number[];
    @state called = Array.from({ length: 3 }, (_, i) => i);
    @state tmpl = `hello ${'world'}`;
    @state nullish = null;
    @state undef = undefined;
    @state arrow = () => 42;

    // --- explicit annotations: plugin slices text, works ---
    @state typed: UserProfile = { name: '', age: 0, tags: [] };
    @state coord: Coordinate = new Coordinate(0, 0);
    @state union: string | null = null;
    @state tuple: [number, string] = [0, ''];
    @state generic: Map<string, readonly boolean[]> = new Map();
    @state readonlyArr: readonly number[] = [];
    @state record: Record<string, UserProfile> = {};
    @state intersection: UserProfile & { admin: boolean } = { name: '', age: 0, tags: [], admin: false };

    // --- same types, plain literal inference (no annotation) ---
    @state typedLit = { name: '', age: 0, tags: [] as string[] };
    @state unionLit = null;
    @state tupleLit = [0, ''];
    @state readonlyArrLit = [] as number[];
    @state recordLit = {} as Record<string, UserProfile>;

    // --- same types, constructor with generic args (no annotation) ---
    @state coordCtor = new Coordinate(0, 0);
    @state genericCtor = new Map<string, readonly boolean[]>();

    // --- variable references, property access, enums ---
    @state fromVar = DEFAULT_NAME;
    @state fromEnum = Status.Active;
    @state fromProp = Constants.MAX_RETRIES;

    // --- function/method calls ---
    @state fromCall = createDefault();
    @state fromStaticCall = Promise.resolve(42);

    // --- logical/nullish expressions ---
    @state fromNullish = MAYBE_NAME ?? 'fallback';
    @state fromOr = MAYBE_NAME || 'fallback';

    // --- spread in object/array ---
    @state fromSpreadObj = { ...BASE_CONFIG, extra: 1 };
    @state fromSpreadArr = [1, ...MORE_NUMBERS];

    // --- constructor without type args (generics default) ---
    @state bareMap = new Map();
    @state bareSet = new Set();

    audit(): void {
        // hover each to see what the plugin thinks the type is

        // primitives — should be correct
        void this.count$;    // expect: BehaviorSubject<number>
        void this.label$;    // expect: BehaviorSubject<string>
        void this.active$;   // expect: BehaviorSubject<boolean>
        void this.big$;      // expect: BehaviorSubject<bigint>

        // class generics — drops type args
        void this.map$;      // expect: BehaviorSubject<Map<string, number>>
        void this.set$;      // expect: BehaviorSubject<Set<UserProfile>>
        void this.weakRef$;  // expect: BehaviorSubject<WeakRef<HTMLElement>>

        // array literals — loses element type
        void this.numbers$;  // expect: BehaviorSubject<number[]>
        void this.mixed$;    // expect: BehaviorSubject<(number | string | boolean)[]>

        // object literals — loses shape
        void this.config$;   // expect: BehaviorSubject<{ host: string; port: number }>
        void this.nested$;   // expect: BehaviorSubject<{ a: { b: { c: number } } }>

        // no declare emitted — these will be errors
        void this.ternary$;  // expect: BehaviorSubject<string>
        void this.casted$;   // expect: BehaviorSubject<readonly number[]>
        void this.called$;   // expect: BehaviorSubject<number[]>
        void this.tmpl$;     // expect: BehaviorSubject<string>
        void this.nullish$;  // expect: BehaviorSubject<null>
        void this.undef$;    // expect: BehaviorSubject<undefined>
        void this.arrow$;    // expect: BehaviorSubject<() => number>

        // explicit annotations — should be correct
        void this.typed$;        // expect: BehaviorSubject<UserProfile>
        void this.coord$;        // expect: BehaviorSubject<Coordinate>
        void this.union$;        // expect: BehaviorSubject<string | null>
        void this.tuple$;        // expect: BehaviorSubject<[number, string]>
        void this.generic$;      // expect: BehaviorSubject<Map<string, readonly boolean[]>>
        void this.readonlyArr$;  // expect: BehaviorSubject<readonly number[]>
        void this.record$;       // expect: BehaviorSubject<Record<string, UserProfile>>
        void this.intersection$; // expect: BehaviorSubject<UserProfile & { admin: boolean }>

        // same types, plain literal inference (no annotation)
        void this.typedLit$;       // expect: BehaviorSubject<{ name: string; age: number; tags: string[] }>
        void this.unionLit$;       // expect: BehaviorSubject<null>
        void this.tupleLit$;       // expect: BehaviorSubject<(string | number)[]>
        void this.readonlyArrLit$; // expect: BehaviorSubject<number[]>
        void this.recordLit$;      // expect: BehaviorSubject<Record<string, UserProfile>>

        // same types, constructor with generic args (no annotation)
        void this.coordCtor$;   // expect: BehaviorSubject<Coordinate>
        void this.genericCtor$; // expect: BehaviorSubject<Map<string, readonly boolean[]>>

        // variable references, property access, enums
        void this.fromVar$;         // expect: BehaviorSubject<string>
        void this.fromEnum$;        // expect: BehaviorSubject<Status>
        void this.fromProp$;        // expect: BehaviorSubject<3>

        // function/method calls
        void this.fromCall$;        // expect: BehaviorSubject<UserProfile>
        void this.fromStaticCall$;  // expect: BehaviorSubject<Promise<number>>

        // logical/nullish expressions
        void this.fromNullish$;     // expect: BehaviorSubject<string>
        void this.fromOr$;          // expect: BehaviorSubject<string>

        // spread in object/array
        void this.fromSpreadObj$;   // expect: BehaviorSubject<{ host: string; port: number; extra: number }>
        void this.fromSpreadArr$;   // expect: BehaviorSubject<number[]>

        // constructor without type args (generics default)
        void this.bareMap$;         // expect: BehaviorSubject<Map<unknown, unknown>>
        void this.bareSet$;         // expect: BehaviorSubject<Set<unknown>>
    }
}
