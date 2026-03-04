import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Str = class Str implements MpClassInterface<StrPrimitive> {
    #data: string;

    #nullable: boolean;
    #isNull: boolean;

    static #encoder = new TextEncoder();
    static #decoder = new TextDecoder("utf-8", { fatal: true });

    /** Wraps a string for MessagePack parsing.
     *
     * @default ""
     *
     * @example new Str(); // creates a string wrapper and defaults to `""`
     * @example new Str("foo"); // wraps a "foo" string
     *
     */
    constructor(data?: StrPrimitive);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack string wrapper.
     *
     * @example new Str(new Uint8Array([0x41, 0x42, 0x43])); // interprets the bytes (`0x41`, `0x42`, `0x43`) as "ABC"
     * @example new Str(new Uint8Array([])); // interprets an empty buffer as ""
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: StrPrimitive | Uint8Array = "") {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            this.#data = Str.#decoder.decode(bfr);
            return;
        }

        const data = a;

        if (Str.isRawValid(data)) this.#data = data;
        else throw new TypeError(`Invalid value was passed into \`Str\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps a nullable string for MessagePack parsing.
     *
     * @default null
     *
     * @example Str.nullable(); // creates a nullable string wrapper and defaults to `null`
     * @example Str.nullable("foo"); // wraps a "foo" string
     *
     */
    static nullable(data?: StrPrimitive | null): MpClassInterface<StrPrimitive | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable string wrapper.
     *
     * @example Str.nullable(new Uint8Array([0x41, 0x42, 0x43])); // interprets the bytes (`0x41`, `0x42`, `0x43`) as "ABC"
     * @example Str.nullable(new Uint8Array([])); // interprets an empty buffer as `null`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<StrPrimitive | null>;

    static nullable(a: StrPrimitive | null | Uint8Array = null): MpClassInterface<StrPrimitive | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            isNull = byte === undefined;
        } else {
            const data = a;
            isNull = data === null;
        }

        const str = isNull ? new Str() : new Str(<StrPrimitive>a);
        str.#nullable = true;
        str.#isNull = isNull;

        return str;
    }

    /** Retrieves the wrapped string value. */
    raw(): StrPrimitive;

    /** Sets a new string value and wrap it. */
    raw(data: StrPrimitive): void;

    raw(data?: StrPrimitive): StrPrimitive | void {
        if (data === undefined && arguments.length === 0) return this.#nullable && this.#isNull ? <StrPrimitive><unknown>null : this.#data;

        if (this.#nullable && data === null) this.#isNull = true;

        if (Str.isRawValid(data)) {
            this.#data = data;
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Str\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped string and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        if (this.#nullable && this.#isNull) return new Uint8Array([0xc0]);

        let code: number;
        let lenLen: number;

        const bytes = Str.#encoder.encode(this.#data);
        const len = bytes.byteLength;

        switch (true) {
            case len < 0x20: {
                code = 0xa0 | len;
                lenLen = 0;

                break;
            }

            case len <= 0xff: {
                code = 0xd9;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xda;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xdb;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen;

        const bfr = new Uint8Array(iDataStart + len);
        bfr[0] = code;

        let tmpLen = len;
        for (let i: number = 1; i <= lenLen; i++) {
            bfr[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        bfr.set(bytes, iDataStart);

        return bfr;
    }

    /** Decodes a string MessagePack chunk, validates it and parses it to a Str. */
    static decode(chunk: Uint8Array): Str {
        const ranges = this.deriveChunkRanges(chunk);

        const hasLenStartIdx = ranges.length === 4;

        const iDataStart = ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];
        const iDataEnd   = ranges[<typeof hasLenStartIdx extends true ? 3 : 2>(2 + +hasLenStartIdx)];

        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Str(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for a Str. */
    static isRawValid(data: any): data is StrPrimitive {
        return typeof data === "string";
    }

    /** Checks whether a chunk header code is valid for a Str. */
    static isCodeValid(code: number): boolean {
        return (
            (code & 0xa0) === 0xa0 ||

            code === 0xd9 ||
            code === 0xda ||
            code === 0xdb
        );
    }

    /** Checks whether a chunk is valid for a Str. */
    static isChunkValid = MpClassImpl.isChunkValid.bind(Str);

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for a Str */
    static deriveChunkRanges(chunk: Uint8Array): [number, number, number] | [number, number, number, number] {
        const iChunkStart = chunk.byteOffset;

        const code = chunk[iChunkStart];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        if ((code & 0xa0) === 0xa0) {
            const len = code & 0x1f;

            const iDataStart = chunk.byteOffset + 1;
            const iDataEnd = iDataStart + len;

            return [iChunkStart, iDataStart, iDataEnd];
        }

        let lenLen: number;

        switch (code) {
            case 0xd9: {
                lenLen = 1;
                break;
            }

            case 0xda: {
                lenLen = 2;
                break;
            }

            case 0xdb: {
                lenLen = 4;
                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Str\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iLenStart = iChunkStart + 1;

        let len = 0;
        for (let i: number = iLenStart, nBytes = 0; i < chunk.byteLength && nBytes < lenLen; i++, nBytes++) len |= chunk[i]! << (8 * nBytes);

        const iDataStart = iLenStart + lenLen;
        const iDataEnd = iDataStart + len;

        return [iChunkStart, iLenStart, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<StrPrimitive>;

export type Str = typeof Str["prototype"];
export type StrPrimitive = string;
