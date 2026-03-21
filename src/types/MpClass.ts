export interface MpClassInterface<T, N extends boolean> {
    get data(): MpResult<T, N>;
    set data(data: MpResult<T, N>);

    get default(): T;

    get isOptional(): N;

    encode(): Uint8Array;

    isValid(data: unknown): data is MpResult<T, N>;
}

export interface MpClassModule<T, N extends boolean> {
    new (data?: T   , isOptional?: N   ): MpClassInterface<MpResult<T, N>, N>;
    new (data : null, isOptional : true): MpClassInterface<T | null, true>;

    new (bfr: Uint8Array, isOptional?: N): MpClassInterface<MpResult<T, N>, N>;

    required(data: T        ): MpClassInterface<NonNullable<T>, false>;
    required(bfr: Uint8Array): MpClassInterface<NonNullable<T>, false>;

    optional(data: T | null ): MpClassInterface<T | null, true>;
    optional(bfr: Uint8Array): MpClassInterface<T | null, true>;

    decode(chunk: Uint8Array): MpClassInterface<T, false>;

    isValid(data: unknown): data is NonNullable<T>;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveIndices(chunk: Uint8Array): number[];
}

export type MpResult<T, N extends boolean> = true extends N ? T | null : NonNullable<T>;
