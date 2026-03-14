export interface MpClassInterface<T> {
    raw(): T;
    raw(data: T): void;

    encode(): Uint8Array;
}

export interface MpClassModule<T> {
    new (data?: T): MpClassInterface<T>;
    new (bfr: Uint8Array): MpClassInterface<T>;

    nullable(data?: T | null): MpClassInterface<T | null>;
    nullable(bfr: Uint8Array): MpClassInterface<T | null>;

    decode(chunk: Uint8Array): MpClassInterface<T>;

    isRawValid(data: any): data is T;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveChunkRanges(chunk: Uint8Array): number[];
}
