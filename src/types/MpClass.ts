export interface MpClassInterface<V> {
    get value(): V;
    set value(value: V);

    encode(): Uint8Array;
}

export type MpClassInterfaceSubtyped<V, T extends string> = MpClassInterface<V> & {
    get subtype(): T;
    set subtype(subtype: T);
}

export interface MpClassModule<V> {
    new (value?: V): MpClassInterface<V>;
    new (bfr: Uint8Array): MpClassInterface<V>;

    decode(chunk: Uint8Array): MpClassInterface<V>;

    cast(item: MpClassInterface<unknown>): MpClassInterface<V>;

    isValueValid(value: unknown): value is V;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveIndices(chunk: Uint8Array): number[];
}

export type MpClassModuleSubtyped<V, T extends string> = MpClassModule<V> & {
    new (value?: V, subtype?: T): MpClassInterfaceSubtyped<V, T>;
    new (bfr: Uint8Array, subtype?: T): MpClassInterfaceSubtyped<V, T>;

    decode(chunk: Uint8Array, subtype?: T): MpClassInterfaceSubtyped<V, T>;

    cast(item: MpClassInterface<unknown>, subtype?: T): MpClassInterfaceSubtyped<V, T>;

    isValueValid(value: unknown, subtype?: T): value is V;

    isCodeValid(code: number, subtypes?: T | T[]): boolean;
    isChunkValid(chunk: Uint8Array, subtypes?: T | T[]): boolean;
}
