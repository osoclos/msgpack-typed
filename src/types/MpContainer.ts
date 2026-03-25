import { Ext } from "../classes";
import { RawClass, ReplaceSubtype, ToParsed } from "../internal";

export interface MpContainer<T extends Exclude<unknown, undefined | symbol>, I extends Exclude<unknown, undefined | symbol>, B> {
    parse(data: T): ReplaceSubtype<T, I, ToParsed<I>>;

    encode(data: T, exts?: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[]): Uint8Array;
    encodeHeader(data: T): Uint8Array;

    decode(chunk: Uint8Array, exts?: Ext<RawClass<unknown>, number, boolean> | Ext<RawClass<unknown>, number, boolean>[]): T;
    decodeHeader(chunk: Uint8Array): B;

    isValid(data: unknown): data is T;

    isCodeValid(code: number): boolean;
    isChunkValid(chunk: Uint8Array): boolean;

    deriveIndices(chunk: Uint8Array): (number | number[] | [number, number][])[];
}
