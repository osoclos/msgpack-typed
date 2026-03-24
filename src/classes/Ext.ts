import { RawClass } from "../internal";
import { ExtUtils } from "../utils";

/** A parser for custom classes, representing the `fixext` and `ext` format families in the MessagePack specification. */
export abstract class Ext<T extends RawClass<unknown>, C extends number, S extends boolean = false> {
    #codes: C[];

    #isEncodable: (data: unknown) => data is T["prototype"];
    #isDecodable: (chunk: Uint8Array) => boolean | [number, number];

    /** Enable parsing of any custom class(es) with specified extension code(s) and makes it usable for MessagePack parsing. */
    protected constructor(codes: C | C[], classes: T | T[]);

    /** Enables parsing of values that satisfy the given encoding predicate with a specified extension code(s) and makes it usable for MessagePack parsing. Useful if you want more precise control of what data can be parsed through this extension. */
    protected constructor(codes: C | C[], predicate :   (data: unknown) => data is T["prototype"]);

    /** Enables parsing of values that satisfy the given encoding and decoding predicates with a specified extension code(s) and makes it usable for MessagePack parsing. Useful if you want more precise control of what data can be parsed through this extension and how the data can be decoded through said extension. */
    protected constructor(codes: C | C[], predicates: [((data: unknown) => data is T["prototype"]), ((chunk: Uint8Array) => boolean) | null]);
    protected constructor(codes: C | C[], b: T | T[] | ((data: unknown) => data is T["prototype"]) | [((data: unknown) => data is T["prototype"]), ((chunk: Uint8Array) => boolean) | null]) {
        this.#codes = Array.isArray(codes) ? [...codes] : [codes];

        const isArr = Array.isArray(b);

        if (!Ext.#isClass(b) || (isArr && b.length === 2 && !(<any[]><unknown>b).some((func) => Ext.#isClass(func) || null))) {
            if (isArr) {
                [this.#isEncodable, this.#isDecodable] = <any>b;
                this.#isDecodable ??= this.#isExtChunkSupported;

                return;
            }

            this.#isEncodable = <any>b;
            this.#isDecodable = this.#isExtChunkSupported;

            return;
        }

        if (!isArr) b = [b];

        this.#isEncodable = (data: unknown): data is T["prototype"] => (<any[]><unknown>b).some((Cls) => data instanceof Cls);
        this.#isDecodable = this.#isExtChunkSupported;
    }

    /** Serialises data passed into the extension and converts it into a data buffer that will be later appended with additional header data to transform it into a MessagePack chunk. */
    abstract encode(data: T["prototype"]): [Uint8Array, C];

    /** Converts a data buffer stored in a MessagePack chunk assumed to be compatible with the extension and creates a class object supported by the extension. */
    abstract decode(chunk: Uint8Array, code: true extends S ? C | null : C): T["prototype"];

    /** Checks whether a value can be encoded by this extension. */
    isEncodable(data: unknown): data is T["prototype"] {
        return this.#isEncodable(data);
    }

    /** Checks whether a chunk can be decoded by this extension. */
    isDecodable(chunk: Uint8Array): boolean | [number, number] {
        return this.#isDecodable(chunk);
    }

    /** Checks whether a extension header code is supported by this extension. */
    isCodeValid(code: number): code is C {
        return this.#codes.includes(<C>code);
    }

    /** Determines whether to treat the given chunk as raw buffer data and skip extension header decoding. Useful if you are dealing with raw buffer data instead of extension chunk data. */
    skipHeaderDecoding(_chunk: Uint8Array): S {
        return <S>false;
    }

    #isExtChunkSupported(chunk: Uint8Array): boolean {
        if (!ExtUtils.isChunkValid(chunk)) return false;

        const [, extCode] = ExtUtils.decodeRaw(chunk);
        return this.isCodeValid(extCode);
    }

    static #isClass<T>(func: unknown): func is RawClass<T> {
        return typeof func === "function" && ((func.prototype !== undefined && func.prototype !== null && Object.getOwnPropertyNames(func.prototype).length > 1) || Function.prototype.toString.call(func).startsWith("class"));
    }
}
