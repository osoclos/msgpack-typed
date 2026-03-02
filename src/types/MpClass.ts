export interface MpClassInterface<T> {
    raw(): T;
    raw(data: T): void;

    encode(): Uint8Array;

    makeNullable(): this is MpClassInterface<T | null>;
    makeRequired(): this is MpClassInterface<NonNullable<T>>;
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
}

const NoThisOverrideSym: unique symbol = Symbol();
interface RequireThisOverrideClass {
    [NoThisOverrideSym]: true;
    prototype: { [NoThisOverrideSym]: true; };
}

export const MpClassImpl = {
    [NoThisOverrideSym]: true,

    isChunkValid(chunk: Uint8Array): boolean {
        if (this[NoThisOverrideSym]) throw new TypeError("`this` argument of `MpClassImpl.isChunkValid` must be overiden!");

        const code = chunk[0];
        if (code === undefined) return false;

        return this.isCodeValid?.(code) ?? false;
    },

    prototype: { [NoThisOverrideSym]: true }
} satisfies Partial<MpClassModule<unknown> & { prototype: Partial<MpClassInterface<unknown>> }> & RequireThisOverrideClass;
