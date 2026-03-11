import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Uint = class Uint implements MpClassInterface<UintPrimitive> {
    #data: bigint;

    #nullable: boolean;
    #isNull: boolean;

    /** Wraps an unsigned integer for MessagePack parsing.
     *
     * @default 0
     *
     * @example new Uint(); // creates an unsigned integer wrapper and defaults to `0`
     *
     * @example new Uint(2); // wraps a `2` integer
     * @example new Uint(537n); // wraps a `537` integer as a bigint
     *
     */
    constructor(data?: UintPrimitive);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack unsigned integer wrapper.
     *
     * @example new Uint(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     * @example new Uint(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201`
     *
     * @example new Uint(new Uint8Array()); // interprets an empty buffer as `0`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: UintPrimitive | Uint8Array = 0) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            this.#data = 0n;
            for (let i: number = bfr.byteOffset, nBytes = 0; i < bfr.byteLength && nBytes < 8; i++, nBytes++) {
                this.#data <<= 8n;
                this.#data |= BigInt(bfr[i]!);
            }

            return;
        }

        const data = a;

        if (Uint.isRawValid(data)) this.#data = BigInt(data);
        else throw new TypeError(`Invalid value was passed into \`Uint\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps a nullable unsigned integer for MessagePack parsing.
     *
     * @default null
     *
     * @example Uint.nullable(); // creates a nullable unsigned integer wrapper and defaults to `null`
     *
     * @example Uint.nullable(null); // wraps `null` and allow it to be upgraded to an unsigned integer
     *
     * @example Uint.nullable(2); // wraps a `2` integer
     * @example Uint.nullable(537n); // wraps a `537` integer as a bigint
     *
     */
    static nullable(data?: UintPrimitive | null): MpClassInterface<UintPrimitive | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable unsigned integer wrapper.
     *
     * @example Uint.nullable(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     * @example Uint.nullable(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201`
     *
     * @example Uint.nullable(new Uint8Array()); // interprets an empty buffer as `null`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<UintPrimitive | null>;

    static nullable(a: UintPrimitive | null | Uint8Array = null): MpClassInterface<UintPrimitive | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            isNull = byte === undefined;
        } else {
            const data = a;
            isNull = data === null;
        }

        const uint = isNull ? new Uint() : new Uint(<UintPrimitive>a);
        uint.#nullable = true;
        uint.#isNull = isNull;

        return uint;
    }

    /** Retrieves the wrapped unsigned integer value. */
    raw(): UintPrimitive;

    /** Sets a new unsigned integer value and wrap it. */
    raw(data: UintPrimitive): void;

    raw(data?: UintPrimitive): UintPrimitive | void {
        if (data === undefined && arguments.length === 0) return (
            this.#nullable && this.#isNull
                ? <UintPrimitive><unknown>null
                : this.#data <= Number.MAX_SAFE_INTEGER
                    ? Number(this.#data)
                    : this.#data
        );

        if (this.#nullable && data === null) this.#isNull = true;

        if (Uint.isRawValid(data)) {
            this.#data = BigInt(data);
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Uint\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped unsigned integer and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        if (this.#nullable && this.#isNull) return new Uint8Array([0xc0]);

        let code: number;
        let len: number;

        switch (true) {
            case this.#data <= 0x7fn: {
                code = Number(this.#data);
                len = 0;

                break;
            }

            case this.#data <= 0xffn: {
                code = 0xcc;
                len = 1;

                break;
            }

            case this.#data <= 0xffffn: {
                code = 0xcd;
                len = 2;

                break;
            }

            case this.#data <= 0xffff_ffffn: {
                code = 0xce;
                len = 4;

                break;
            }

            default: {
                code = 0xcf;
                len = 8;

                break;
            }
        }

        const chunkLen = 1 + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        if (len === 0) return chunk;

        let tmpData = this.#data;
        for (let i: number = len; i >= 1; i--) {
            chunk[i] = Number(tmpData & 0xffn);
            tmpData >>= 8n;
        }

        return chunk;
    }

    /** Decodes an unsigned integer MessagePack chunk, validates it and parses it to an Uint. */
    static decode(chunk: Uint8Array): Uint {
        const ranges = this.deriveChunkRanges(chunk);

        const nRanges = ranges.length;
        if (nRanges === 2) {
            const code = ranges[0];
            return new Uint(code);
        }

        const [, iDataStart, iDataEnd] = ranges;
        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Uint(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for an Uint. */
    static isRawValid(data: any): data is UintPrimitive {
        return ((typeof data === "number" && Number.isInteger(data)) || typeof data === "bigint") && data >= 0n && data <= 0xffff_ffff_ffff_ffffn;
    }

    /** Checks whether a chunk header code is valid for an Uint. */
    static isCodeValid(code: number): boolean {
        return (
            code <=  0x7f ||

            code === 0xcc ||
            code === 0xcd ||
            code === 0xce ||
            code === 0xcf
        );
    }

    /** Checks whether a chunk is valid for an Uint. */
    static isChunkValid = MpClassImpl.isChunkValid.bind(Uint);

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for an Uint. */
    static deriveChunkRanges(chunk: Uint8Array): [number, number] | [number, number, number] {
        const iChunkStart = chunk.byteOffset;

        const code = chunk[iChunkStart];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        const iDataStart = iChunkStart + 1;

        if (code <= 0x7f) return [iChunkStart, iDataStart /* there is no "data", so its index can be used as the final exclusive index */];

        let len: number;
        switch (code) {
            case 0xcc: {
                len = 1;
                break;
            }

            case 0xcd: {
                len = 2;
                break;
            }

            case 0xce: {
                len = 4;
                break;
            }

            case 0xcf: {
                len = 8;
                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Uint\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iDataEnd = iDataStart + len;

        return [iChunkStart, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<UintPrimitive>;

export type Uint = typeof Uint["prototype"];
export type UintPrimitive = number | bigint;
