import { MpError } from "./MpError";

export interface MpClassInterface<V> {
    get value(): V;
    set value(value: V);

    encode(): Uint8Array;

    get [Symbol.toStringTag](): string;
}

export type MpClassInterfaceSubtyped<V, T extends string> = MpClassInterface<V> & {
    get subtype(): T;
    set subtype(subtype: T);
}

export interface MpClassModule<V> {
    new (value?: V): MpClassInterface<V>;
    new (bfr: Uint8Array): MpClassInterface<V>;

    decode(chunk: Uint8Array): MpClassInterface<V>;

    isValueValid(value: unknown): value is V;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveChunkIndices(chunk: Uint8Array): number[];
}

export type MpClassModuleSubtyped<V, T extends string> = MpClassModule<V> & {
    new (value?: V, subtype?: T): MpClassInterfaceSubtyped<V, T>;
    new (bfr: Uint8Array, subtype?: T): MpClassInterfaceSubtyped<V, T>;

    value2Subtype(value: V): T;
    code2Subtype(code: number): T;

    isValueValid(value: unknown, subtype?: T): value is V;
    isSubtypeValid(subtype: string): subtype is T;

    isCodeValid(code: number): T | false;
    isChunkValid(chunk: Uint8Array): T | false;
}

export const MpClass = <V>(): MpClassModule<V> => class MpClass implements MpClassInterface<V> {
    constructor(value?: V);
    constructor(bfr: Uint8Array);
    constructor(_a?: V | Uint8Array) {}

    get value(): V {
        throw new MpError.NoImpl(this, "value" as any);
    }

    set value(_value: V) {
        throw new MpError.NoImpl(this, "value" as any);
    }

    encode(): Uint8Array {
        throw new MpError.NoImpl(this, "encode");
    }

    static decode(_chunk: Uint8Array): MpClassInterface<V> {
        throw new MpError.NoImpl(this.prototype, "decode");
    }

    static isValueValid(_value: unknown): _value is V {
        throw new MpError.NoImpl(this.prototype, "isValueValid");
    }

    static isCodeValid(_code: number): boolean {
        throw new MpError.NoImpl(this.prototype, "isCodeValid");
    }

    static isChunkValid(_chunk: Uint8Array): boolean {
        throw new MpError.NoImpl(this.prototype, "isChunkValid");
    }

    static deriveChunkIndices(_chunk: Uint8Array): number[] {
        throw new MpError.NoImpl(this.prototype, "deriveChunkIndices");
    }

    get [Symbol.toStringTag](): string {
        throw new MpError.NoImpl(this, "Symbol.toStringTag" as any);
    }
};

export const MpClassSubtyped = <V, T extends string>(): MpClassModuleSubtyped<V, T> => class MpClassSubtyped extends MpClass<V>() implements MpClassInterfaceSubtyped<V, T> {
    constructor(value?: V, subtype?: T | "ANY");
    constructor(bfr: Uint8Array, subtype?: T | "ANY");
    constructor(_a?: V | Uint8Array, _subtype?: T | "ANY") {
        super(_a as V);
    }

    get subtype(): T {
        throw new MpError.NoImpl(this, "subtype" as any);
    }

    set subtype(_subtype: T) {
        throw new MpError.NoImpl(this, "subtype" as any);
    }

    static value2Subtype(_value: V): T {
        throw new MpError.NoImpl(this.prototype, "value2Subtype");
    }

    static code2Subtype(_code: number): T {
        throw new MpError.NoImpl(this.prototype, "code2Subtype");
    }

    static isSubtypeValid(_subtype: T): _subtype is T {
        throw new MpError.NoImpl(this.prototype, "isSubtypeValid");
    }

    static override isCodeValid(_code: number): false;
    static override isCodeValid(_code: number): T | false;
    static override isCodeValid(_code: number): T | false {
        throw new MpError.NoImpl(this.prototype, "isCodeValid");
    }

    static override isChunkValid(_chunk: Uint8Array): false;
    static override isChunkValid(_chunk: Uint8Array): T | false;
    static override isChunkValid(_chunk: Uint8Array): T | false {
        throw new MpError.NoImpl(this.prototype, "isChunkValid");
    }
} satisfies MpClassModuleSubtyped<V, T>;
