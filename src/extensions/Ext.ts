import { ExtUtils } from "../utils";
import type { Constructor } from "../internal";

/** A parser for custom classes, representing the `fixext` and `ext` format families in the MessagePack specification. */
export abstract class Ext<T extends Constructor<unknown>, C extends number, S extends boolean = false> {
    #codes: C[];

    protected constructor(codes: C | C[]) {
        this.#codes = Array.isArray(codes) ? [...codes] : [codes];
    }

    /** Checks whether a code is being used by the extension. */
    isUsingCode(code: number): code is C;
    isUsingCode(codes: number[]): codes is C[];
    isUsingCode(codes: number | number[]): codes is C | C[] {
        if (typeof codes === "number") codes = [codes];
        return codes.every((code) => this.#codes.includes(code as C));
    }

    /** Serialises data passed into the extension and converts it into a data buffer that will be later appended with additional header data to transform it into a MessagePack chunk. */
    abstract encode(value: T["prototype"]): [Uint8Array, C];

    /** Converts a data buffer stored in a MessagePack chunk assumed to be compatible with the extension and creates a class object supported by the extension. */
    abstract decode(chunk: Uint8Array, code: true extends S ? C | null : C): T["prototype"];

    /** Checks whether a value can be encoded by this extension. */
    abstract isEncodable(value: unknown): value is T["prototype"];

    /** Checks whether a chunk can be decoded by this extension. */
    isDecodable(chunk: Uint8Array): boolean | [number, number] {
        if (!ExtUtils.isChunkValid(chunk)) return false;

        const extCode = ExtUtils.decodeRaw(chunk)[1];
        return this.isCodeValid(extCode);
    }

    /** Checks whether a extension header code is supported by this extension. */
    isCodeValid(code: number): code is C {
        return this.#codes.includes(code as C);
    }

    /** Determines whether to treat the given chunk as raw buffer data and skip extension header decoding. Useful if you are dealing with raw buffer data instead of extension chunk data. */
    skipHeaderDecoding(_chunk: Uint8Array): S {
        return false as S;
    }
}
