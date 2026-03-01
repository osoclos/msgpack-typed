import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Int = class Int implements MpClassInterface<number | bigint> {
    #val: bigint;

    #nullable: boolean;
    #isNull: boolean;

    /** Wraps a signed integer for MessagePack parsing.
     *
     * @default 0
     *
     * @example new Int(); // creates a signed integer wrapper and defaults to `0`
     *
     * @example new Int(2); // wraps a `2` positive integer
     * @example new Int(-81); // wraps a `81` negative integer
     *
     * @example new Int(537n); // wraps a `537` positive integer as a bigint
     *
     */
    constructor(data?: number | bigint);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack signed integer wrapper.
     *
     * @example new Int(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     *
     * @example new Int(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201 - (0x0003_0201 & 0x8000_0000)` using Two's compliment
     * @example new Int(new Uint8Array([0xff, 0xfe])); // interprets the bytes (`0xff`, `0xfe`) as `0xfeff - (0xfeff & 0x8000)` using Two's compliment
     *
     * @example new Int(new Uint8Array()); // interprets an empty buffer as `0`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: number | bigint | Uint8Array = 0) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            this.#val = 0n;

            let nBytes: bigint = 0n;
            for (let i: number = bfr.byteOffset; i < bfr.byteLength && nBytes < 8n; i++, nBytes++) this.#val |= BigInt(bfr[i]!) << (8n * nBytes);

            const maxByteLen =
                nBytes <= 1n
                    ? 1 :
                nBytes <= 2n
                    ? 2 :
                nBytes <= 4n
                    ? 4
                    : 8;

            let needsInterpreting: boolean = false;
            switch (maxByteLen) {
                case 1: {
                    needsInterpreting = this.#val > 0x7fn;
                    break;
                }

                case 2: {
                    needsInterpreting = this.#val > 0x7fffn;
                    break;
                }

                case 4: {
                    needsInterpreting = this.#val > 0x7fff_ffffn;
                    break;
                }

                case 8: {
                    needsInterpreting = this.#val > 0x7fff_ffff_ffff_ffffn;
                    break;
                }

                default: break;
            }

            if (needsInterpreting) this.#val = BigInt.asIntN(maxByteLen * 8, this.#val);
            return;
        }

        const data = a;

        if (data === undefined && arguments.length === 0) {
            this.#val = 0n;
            return;
        }

        if (Int.isRawValid(data)) this.#val = BigInt(data);
        else throw new TypeError(`Invalid value was passed into \`Int\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps a nullable signed integer for MessagePack parsing.
     *
     * @default null
     *
     * @example Int.nullable(); // creates a nullable signed integer wrapper and defaults to `null`
     *
     * @example Int.nullable(null); // wraps `null` and allow it to be upgraded to an signed integer
     *
     * @example Int.nullable(2); // wraps a `2` positive integer
     * @example Int.nullable(-81); // wraps a `81` negative integer
     *
     * @example Int.nullable(537n); // wraps a `537` positive integer as a bigint
     *
     */
    static nullable(data?: number | bigint | null): MpClassInterface<number | bigint | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable signed integer wrapper.
     *
     * @example Int.nullable(new Uint8Array([0x00])); // interprets the bytes (`0x00`) as `0`
     *
     * @example Int.nullable(new Uint8Array([0x01, 0x02, 0x03])); // interprets the bytes (`0x01`, `0x02`, `0x03`) as `0x0003_0201 - (0x0003_0201 & 0x8000_0000)` using Two's compliment
     * @example Int.nullable(new Uint8Array([0xff, 0xfe])); // interprets the bytes (`0xff`, `0xfe`) as `0xfeff - (0xfeff & 0x8000)` using Two's compliment
     *
     * @example Int.nullable(new Uint8Array()); // interprets an empty buffer as `null`
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

        const int = isNull ? new Int() : new Int(<number | bigint>a);
        int.#nullable = true;
        int.#isNull = isNull;

        return int;
    }

    /** Retrieves the wrapped signed integer value. */
    raw(): number | bigint;

    /** Sets a new signed integer value and wrap it. */
    raw(data: number | bigint): void;

    raw(data?: number | bigint): number | bigint | void {
        if (data === undefined && arguments.length === 0) return (
            this.#nullable && this.#isNull
                ? <number | bigint><unknown>null
                : Number.MIN_SAFE_INTEGER <= this.#val && this.#val <= Number.MAX_SAFE_INTEGER
                    ? Number(this.#val)
                    : this.#val
        );

        if (this.#nullable && Object.is(data, null)) this.#isNull = true;

        if (Int.isRawValid(data)) {
            this.#val = BigInt(data);
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Int\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped signed integer and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        if (this.#nullable && this.#isNull) return new Uint8Array([0xc0]);

        let code: number;
        let len: number;

        switch (true) {
            case this.#val >= -0x20n && this.#val < 0x00: {
                code = Number(this.#val);
                len = 0;

                break;
            }

            case this.#val >= -0x80n && this.#val <= 0x7fn: {
                code = 0xd0;
                len = 1;

                break;
            }

            case this.#val >= -0x8000n && this.#val <= 0x7fffn: {
                code = 0xd1;
                len = 2;

                break;
            }

            case this.#val >= -0x8000_0000n && this.#val <= 0x7fff_ffffn: {
                code = 0xd2;
                len = 4;

                break;
            }

            default: {
                code = 0xd3;
                len = 8;

                break;
            }
        }

        const chunkLen = 1 + len;

        const chunk = new Uint8Array(chunkLen);
        chunk[0] = code;

        if (len === 0) return chunk;

        let tmpVal = BigInt.asUintN(64, this.#val);
        for (let i: number = 1; i < chunkLen; i++) {
            chunk[i] = Number(tmpVal & 0xffn);
            tmpVal >>= 8n;
        }

        return chunk;
    }

    /** Decodes a signed integer MessagePack chunk, validates it and parses it to an Int. */
    static decode(chunk: Uint8Array): Int {
        const code = chunk[chunk.byteOffset];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        if (code >= 0xe0) return new Int(code - 0x0100);

        let len: number;
        switch (code) {
            case 0xd0: {
                len = 1;
                break;
            }

            case 0xd1: {
                len = 2;
                break;
            }

            case 0xd2: {
                len = 4;
                break;
            }

            case 0xd3: {
                len = 8;
                break;
            }

            default: throw new TypeError(`Invalid chunk header for \`Int\`. Did not expect ${toLegible(code, true)}.`);
        }

        const iDataStart = chunk.byteOffset + 1;

        const iDataEnd = iDataStart + len;
        if (iDataEnd > chunk.byteLength) console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");

        return new Int(chunk.slice(iDataStart, iDataEnd));
    }

    /** Checks whether a value is valid for an Int. */
    static isRawValid(data: any): data is number | bigint {
        return ((typeof data === "number" && Number.isInteger(data)) || typeof data === "bigint") && data >= -0x8000_0000_0000_0000n && data <= 0x7fff_ffff_ffff_ffffn;
    }

    /** Checks whether a chunk header code is valid for an Int. */
    static isCodeValid(code: number): boolean {
        return (
            code >=  0xe0 ||

            code === 0xd0 ||
            code === 0xd1 ||
            code === 0xd2 ||
            code === 0xd3
        );
    }

    /** Checks whether a chunk is valid for an Int. */
    static isChunkValid = MpClassImpl.isChunkValid.bind(Int);
} satisfies MpClassModule<number | bigint>;
