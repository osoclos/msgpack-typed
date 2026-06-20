import { MpError } from "./MpError";

export interface MpClassInterface<V> {
    get value(): V;
    set value(value: V);

    encode(): Uint8Array;

    get [Symbol.toStringTag](): string;
}

export interface MpClassInterfaceSubtyped<V, T extends string> extends MpClassInterface<V> {
    get subtype(): T;
    set subtype(subtype: T);
};

export interface MpClassModule<V> {
    new (value?: V): MpClassInterface<V>;
    new (bfr: Uint8Array): MpClassInterface<V>;

    decode(chunk: Uint8Array): MpClassInterface<V>;

    value2LenEncoded(value?: V): number;

    isValueValid(value: unknown): value is V;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveChunkIndices(chunk: Uint8Array): number[];
}

export interface MpClassModuleSubtyped<V, T extends string> extends MpClassModule<V> {
    new (value?: V, subtype?: T): MpClassInterfaceSubtyped<V, T>;
    new (bfr: Uint8Array, subtype?: T): MpClassInterfaceSubtyped<V, T>;

    value2Subtype(value: V): T;
    code2Subtype(code: number): T;

    subtype2LenEncoded?(subtype: T): number;

    isValueValid(value: unknown, subtype?: T): value is V;
    isSubtypeValid(subtype: string): subtype is T;

    isCodeValid(code: number): false;
    isCodeValid(code: number): T | false;

    isChunkValid(chunk: Uint8Array): false;
    isChunkValid(chunk: Uint8Array): T | false;
};

export const MpClass = <V>(): MpClassModule<V> => class MpClass implements MpClassInterface<V> {
    constructor(value?: V);
    constructor(bfr: Uint8Array);
    constructor(_a?: V | Uint8Array) {}

    get value(): V {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "value");
    }

    set value(_value: V) {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "value");
    }

    encode(): Uint8Array {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "encode");
    }

    static decode(_chunk: Uint8Array): MpClassInterface<V> {
        throw new MpError.NoImpl(this.name, "decode");
    }

    static value2LenEncoded(): number {
        throw new MpError.NoImpl(this.name, "value2LenEncoded");
    }

    static isValueValid(_value: unknown): _value is V {
        throw new MpError.NoImpl(this.name, "isValueValid");
    }

    static isCodeValid(_code: number): boolean {
        throw new MpError.NoImpl(this.name, "isCodeValid");
    }

    static isChunkValid(_chunk: Uint8Array): boolean {
        throw new MpError.NoImpl(this.name, "isChunkValid");
    }

    static deriveChunkIndices(_chunk: Uint8Array): number[] {
        throw new MpError.NoImpl(this.name, "deriveChunkIndices");
    }

    get [Symbol.toStringTag](): string {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "Symbol.toStringTag");
    }
};

export const MpClassSubtyped = <V, T extends string>(): MpClassModuleSubtyped<V, T> => class MpClassSubtyped extends MpClass<V>() implements MpClassInterfaceSubtyped<V, T> {
    constructor(value?: V, subtype?: T | "ANY");
    constructor(bfr: Uint8Array, subtype?: T | "ANY");
    constructor(_a?: V | Uint8Array, _subtype?: T | "ANY") {
        super(_a as V);
    }

    get subtype(): T {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "subtype");
    }

    set subtype(_subtype: T) {
        throw new MpError.NoImpl(this[Symbol.toStringTag], "subtype");
    }

    static value2Subtype(_value: V): T {
        throw new MpError.NoImpl(this.name, "value2Subtype");
    }

    static code2Subtype(_code: number): T {
        throw new MpError.NoImpl(this.name, "code2Subtype");
    }

    static subtype2LenEncoded(): number {
        throw new MpError.NoImpl(this.name, "subtype2LenEncoded");
    }

    static isSubtypeValid(_subtype: T): _subtype is T {
        throw new MpError.NoImpl(this.name, "isSubtypeValid");
    }

    static override isCodeValid(_code: number): false;
    static override isCodeValid(_code: number): T | false;
    static override isCodeValid(_code: number): T | false {
        throw new MpError.NoImpl(this.name, "isCodeValid");
    }

    static override isChunkValid(_chunk: Uint8Array): false;
    static override isChunkValid(_chunk: Uint8Array): T | false;
    static override isChunkValid(_chunk: Uint8Array): T | false {
        throw new MpError.NoImpl(this.name, "isChunkValid");
    }
};
