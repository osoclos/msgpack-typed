import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Flt = class Flt implements MpClassInterface<number> {
    #val: number;

    #nullable: boolean;
    #isNull: boolean;

    /** Wraps a float for MessagePack parsing.
     *
     * @default 0.0
     *
     * @example new Flt(); // creates a float wrapper and defaults to `0.0`
     *
     * @example new Flt(3.7); // wraps a `3.7` decimal
     * @example new Flt(64); // wraps a `64` integer
     *
     */
    constructor(data?: number);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack float wrapper.
     *
     * @example new Flt(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as a 32-bit float
     * @example new Flt(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])); // interprets the bytes (`0x01`, `0x02`, `0x03`, `0x04`, `0x05`) as a 64-bit float
     *
     * @example new Flt(new Uint8Array()); // interprets an empty buffer as `0.0`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: number | Uint8Array = 0.0) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const len = bfr.byteLength - bfr.byteOffset;

            this.#val = len < 0 ? 0.0 : new (len <= 4 ? Float32Array : Float64Array)(bfr.slice(bfr.byteOffset, bfr.byteLength))[0]!;
            return;
        }

        const data = a;

        if (data === undefined && arguments.length === 0) {
            this.#val = 0.0;
            return;
        }

        if (Flt.isRawValid(data)) this.#val = data;
        else throw new TypeError(`Invalid value was passed into \`Flt\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps a nullable float for MessagePack parsing.
     *
     * @default null
     *
     * @example Flt.nullable(); // creates a nullable float wrapper and defaults to `null`
     *
     * @example Flt.nullable(null); // wraps `null` and allow it to be upgraded to a float
     *
     * @example Flt.nullable(3.7); // wraps a `3.7` decimal
     * @example Flt.nullable(64); // wraps a `64` integer
     *
     */
    static nullable(data?: number | null): MpClassInterface<number | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable float wrapper.
     *
     * @example Flt.nullable(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as a 32-bit float
     * @example Flt.nullable(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])); // interprets the bytes (`0x01`, `0x02`, `0x03`, `0x04`, `0x05`) as a 64-bit float
     *
     * @example Flt.nullable(new Uint8Array()); // interprets an empty buffer as `null`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<number | null>;

    static nullable(a: number | null | Uint8Array = null): MpClassInterface<number | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            isNull = byte === undefined;
        } else {
            const data = a;
            isNull = Object.is(data, null);
        }

        const flt = isNull ? new Flt() : new Flt(<number>a);
        flt.#nullable = true;
        flt.#isNull = isNull;

        return flt;
    }

    /** Retrieves the wrapped float value. */
    raw(): number;

    /** Sets a new float value and wrap it. */
    raw(data: number): void;

    raw(data?: number): number | void {
        if (data === undefined && arguments.length === 0) return this.#nullable && this.#isNull ? <number><unknown>null : this.#val;

        if (this.#nullable && Object.is(data, null)) this.#isNull = true;

        if (Flt.isRawValid(data)) {
            this.#val = data;
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Flt\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped float and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        const canBe32Bit = Object.is(this.#val, Math.fround(this.#val));

        const code: number =      canBe32Bit ? 0xca : 0xcb;
        const len : number = 1 + (canBe32Bit ? 4    : 8   );

        const flt = new (canBe32Bit ? Float32Array : Float64Array)(1);
        flt[0] = this.#val;

        const fltBytes = new Uint8Array(flt.buffer);

        const bfr = new Uint8Array(len);
        bfr[0] = code;
        bfr.set(fltBytes, 1);

        return bfr;
    }

    /** Allows this wrapper to have `null` as a value */
    makeNullable(): this is MpClassInterface<number | null> {
        this.#nullable = true;
        return true;
    }

    /** Denies this wrapper of having `null` as a value */
    makeRequired(): this is MpClassInterface<number> {
        this.#nullable = false;
        return true;
    }

    /** Decodes a float MessagePack chunk, validates it and parses it to a Flt. */
    static decode(chunk: Uint8Array): Flt {
        const code = chunk[chunk.byteOffset];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        let len: number;
        switch (code) {
            case 0xca: {
                len = 4;
                break;
            }

            case 0xcb: {
                len = 8;
                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Flt\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iDataStart = chunk.byteOffset + 1;

        const iDataEnd = iDataStart + len;
        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Flt(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for a Flt. */
    static isRawValid(data: any): data is number {
        return typeof data === "number";
    }

    /** Checks whether a chunk header code is valid for a Flt. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xca ||
            code === 0xcb
        );
    }

    /** Checks whether a chunk is valid for a Flt. */
    static isChunkValid = MpClassImpl.isChunkValid.bind(Flt);
} satisfies MpClassModule<number>;
