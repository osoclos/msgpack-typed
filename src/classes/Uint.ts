import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Uint = class Uint implements MpClassInterface<number | bigint> {
    #val: bigint;

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
    constructor(data?: number | bigint);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack unsigned integer wrapper.
     *
     * @example new Uint(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     * @example new Uint(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201`
     *
     * @example new Uint(new Uint8Array()); // interprets an empty buffer as `0`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: number | bigint | Uint8Array = 0) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            this.#val = 0n;
            for (let i: number = bfr.byteOffset, nBytes = 0n; i < bfr.byteLength && nBytes < 8n; i++, nBytes++) this.#val |= BigInt(bfr[i]!) << (8n * nBytes);

            return;
        }

        const data = a;

        if (data === undefined && arguments.length === 0) {
            this.#val = 0n;
            return;
        }

        if (Uint.isRawValid(data)) this.#val = BigInt(data);
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
    static nullable(data?: number | bigint | null): MpClassInterface<number | bigint | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable unsigned integer wrapper.
     *
     * @example Uint.nullable(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     * @example Uint.nullable(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201`
     *
     * @example Uint.nullable(new Uint8Array()); // interprets an empty buffer as `null`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<number | bigint | null>;

    static nullable(a: number | bigint | null | Uint8Array = null): MpClassInterface<number | bigint | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            isNull = byte === undefined;
        } else {
            const data = a;
            isNull = Object.is(data, null);
        }

        const uint = isNull ? new Uint() : new Uint(<number | bigint>a);
        uint.#nullable = true;
        uint.#isNull = isNull;

        return uint;
    }

    /** Retrieves the wrapped unsigned integer value. */
    raw(): number | bigint;

    /** Sets a new unsigned integer value and wrap it. */
    raw(data: number | bigint): void;

    raw(data?: number | bigint): number | bigint | void {
        if (data === undefined && arguments.length === 0) return (
            this.#nullable && this.#isNull
                ? <number | bigint><unknown>null
                : this.#val <= Number.MAX_SAFE_INTEGER
                    ? Number(this.#val)
                    : this.#val
        );

        if (this.#nullable && Object.is(data, null)) this.#isNull = true;

        if (Uint.isRawValid(data)) {
            this.#val = BigInt(data);
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Uint\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped unsigned integer and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        if (this.#nullable && this.#isNull) return new Uint8Array([0xc0]);

        let code: number;
        let len: number;

        switch (true) {
            case this.#val <= 0x7fn: {
                code = Number(this.#val);
                len = 0;

                break;
            }

            case this.#val <= 0xffn: {
                code = 0xcc;
                len = 1;

                break;
            }

            case this.#val <= 0xffffn: {
                code = 0xcd;
                len = 2;

                break;
            }

            case this.#val <= 0xffff_ffffn: {
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

        let tmpVal = this.#val;
        for (let i: number = 1; i < chunkLen; i++) {
            chunk[i] = Number(tmpVal & 0xffn);
            tmpVal >>= 8n;
        }

        return chunk;
    }

    /** Allows this wrapper to have `null` as a value */
    makeNullable(): this is MpClassInterface<number | bigint | null> {
        this.#nullable = true;
        return true;
    }

    /** Denies this wrapper of having `null` as a value */
    makeRequired(): this is MpClassInterface<number | bigint> {
        this.#nullable = false;
        return true;
    }

    /** Decodes an unsigned integer MessagePack chunk, validates it and parses it to an Uint. */
    static decode(chunk: Uint8Array): Uint {
        const code = chunk[chunk.byteOffset];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        if (code <= 0x7f) return new Uint(code);

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

        const iDataStart = chunk.byteOffset + 1;

        const iDataEnd = iDataStart + len;
        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Uint(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for an Uint. */
    static isRawValid(data: any): data is number | bigint {
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
} satisfies MpClassModule<number | bigint>;
