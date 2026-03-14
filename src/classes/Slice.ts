import { MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Slice = class Slice implements MpClassInterface<SlicePrimitive> {
    #data: Uint8Array;

    #nullable: boolean;
    #isNull: boolean;

    /** Wraps byte data for MessagePack parsing.
     *
     * @default new Uint8Array()
     *
     * @example new Slice(); // creates a byte data wrapper and defaults to `[]`
     * @example new Slice(new Uint8Array([0x01, 0x02, 0x03])); // wraps byte data containing (`0x01`, `0x02`, `0x03`)
     *
     */
    constructor(data?: SlicePrimitive);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack byte data wrapper.
     *
     * @example new Slice(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `[0x01, 0x02, 0x03]`
     * @example new Slice(new Uint8Array([])); // interprets an empty buffer as `[]`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: SlicePrimitive | Uint8Array = new Uint8Array()) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            this.#data = bfr;
            return;
        }

        const data = a;

        if (Slice.isRawValid(data)) this.#data = data;
        else throw new TypeError(`Invalid value was passed into \`Slice\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps nullable byte data for MessagePack parsing.
     *
     * @default null
     *
     * @example Slice.nullable(); // creates a nullable byte data wrapper and defaults to `null`
     * @example Slice.nullable(new Uint8Array([0x01, 0x02, 0x03])); // wraps byte data containing (`0x01`, `0x02`, `0x03`)
     *
     */
    static nullable(data?: SlicePrimitive | null): MpClassInterface<SlicePrimitive | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable byte data wrapper.
     *
     * @example new Slice(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `[0x01, 0x02, 0x03]`
     * @example new Slice(new Uint8Array([])); // interprets an empty buffer as `[]`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<SlicePrimitive | null>;

    static nullable(a: SlicePrimitive | null | Uint8Array = null): MpClassInterface<SlicePrimitive | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) isNull = false;
        else {
            const data = a;
            isNull = data === null;
        }

        const slice = isNull ? new Slice() : new Slice(<SlicePrimitive>a);
        slice.#nullable = true;
        slice.#isNull = isNull;

        return slice;
    }

    /** Retrieves the wrapped byte data values. */
    raw(): SlicePrimitive;

    /** Sets new byte data values and wrap it. */
    raw(data: SlicePrimitive): void;

    raw(data?: SlicePrimitive): SlicePrimitive | void {
        if (data === undefined && arguments.length === 0) return this.#nullable && this.#isNull ? <SlicePrimitive><unknown>null : this.#data;

        if (this.#nullable && data === null) this.#isNull = true;

        if (Slice.isRawValid(data)) {
            this.#data = data;
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Slice\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped byte data and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        if (this.#nullable && this.#isNull) return new Uint8Array([0xc0]);

        let code: number;
        let lenLen: number;

        const bytes = this.#data;
        const len = bytes.byteLength;

        switch (true) {
            case len <= 0xff: {
                code = 0xc4;
                lenLen = 1;

                break;
            }

            case len <= 0xffff: {
                code = 0xc5;
                lenLen = 2;

                break;
            }

            default: {
                code = 0xc6;
                lenLen = 4;

                break;
            }
        }

        const iDataStart = 1 + lenLen;

        const bfr = new Uint8Array(iDataStart + len);
        bfr[0] = code;

        let tmpLen = len;
        for (let i: number = lenLen; i >= 1; i--) {
            bfr[i] = tmpLen & 0xff;
            tmpLen >>>= 8;
        }

        bfr.set(bytes, iDataStart);

        return bfr;
    }

    /** Decodes a byte data MessagePack chunk, validates it and parses it to a Slice. */
    static decode(chunk: Uint8Array): Slice {
        const ranges = this.deriveChunkRanges(chunk);

        const [, , iDataStart, iDataEnd] = ranges;
        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Slice(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for a Slice. */
    static isRawValid(data: any): data is SlicePrimitive {
        return data instanceof Uint8Array;
    }

    /** Checks whether a chunk header code is valid for a Slice. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xc4 ||
            code === 0xc5 ||
            code === 0xc6
        );
    }

    /** Checks whether a chunk is valid for a Slice. */
    static isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0];
        if (code === undefined) return false;

        return this.isCodeValid(code);
    }

    /** Retrieves the starting index of each section of the chunk, as well as the final exclusive index, for a Slice. */
    static deriveChunkRanges(chunk: Uint8Array): [number, number, number, number] {
        const iChunkStart: number = 0;

        const code = chunk[iChunkStart];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        let lenLen: number;
        switch (code) {
            case 0xc4: {
                lenLen = 1;
                break;
            }

            case 0xc5: {
                lenLen = 2;
                break;
            }

            case 0xc6: {
                lenLen = 4;
                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Slice\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iLenStart = iChunkStart + 1;

        const chunkLenLen = chunk.byteLength < lenLen ? chunk.byteLength : lenLen;

        let len: number = 0;
        for (let i: number = iLenStart, nBytes: number = 0; nBytes < chunkLenLen; i++, nBytes++) {
            len <<= 8;
            len |= chunk[i]!;
        }

        const iDataStart = iLenStart + lenLen;
        const iDataEnd = iDataStart + len;

        return [iChunkStart, iLenStart, iDataStart, iDataEnd];
    }
} satisfies MpClassModule<SlicePrimitive>;

export type Slice = typeof Slice["prototype"];
export type SlicePrimitive = Uint8Array;
