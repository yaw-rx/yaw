export type Ctor<T = unknown> = new (...args: never[]) => T;
export type Token<T = unknown> = Ctor<T> | symbol | string;

type Resolved<K> = K extends Token<infer U> ? U : never;
type Args<D extends readonly Token[]> = { [K in keyof D]: Resolved<D[K]> };

export type Provider<T = unknown> =
    | Ctor<T>
    | { provide: Token<T>; useClass: Ctor<T> }
    | { provide: Token<T>; useValue: T }
    | { provide: Token<T>; useFactory: (...args: Args<readonly Token[]>) => T; deps: readonly Token[] }
    | { provide: Token<T>; useExisting: Token<T> };
