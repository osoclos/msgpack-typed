import { MpClassImpl, MpClassInterface, MpClassModule } from "../types";
import { toLegible } from "../utils";

export const Bool = class Bool implements MpClassInterface<boolean> {
    #state: boolean;

    #nullable: boolean;
    #isNull: boolean;

    /** Wraps a boolean for MessagePack parsing.
     *
     * @default false
     *
     * @example new Bool(); // creates a boolean wrapper and defaults to `false`
     * @example new Bool(false); // wraps a `false` boolean
     *
     */
    constructor(data?: boolean);

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack boolean wrapper.
     *
     * @example new Bool(new Uint8Array([0x00])); // interprets the falsy byte (`0x00`) as `false`
     * @example new Bool(new Uint8Array([0x01, 0x02, 0x03])); // interprets the truthy byte (`0x01`) as `true`
     *
     * @example new Bool(new Uint8Array()); // interprets an empty buffer as `false`
     *
     */
    constructor(bfr: Uint8Array);

    constructor(a: boolean | Uint8Array = false) {
        this.#nullable = false;
        this.#isNull = false;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            this.#state = byte === undefined ? false : byte !== 0x00;

            return;
        }

        const data = a;

        if (data === undefined && arguments.length === 0) {
            this.#state = false;
            return;
        }

        if (Bool.isRawValid(data)) this.#state = data;
        else throw new TypeError(`Invalid value was passed into \`Bool\`. Did not expect ${toLegible(data)}.`);
    }

    /** Wraps a nullable boolean for MessagePack parsing.
     *
     * @default null
     *
     * @example Bool.nullable(); // creates a nullable boolean wrapper and defaults to `null`
     * @example Bool.nullable(null); // wraps `null` and allow it to be upgraded to a boolean
     *
     * @example Bool.nullable(false); // wraps a `false` boolean
     *
     */
    static nullable(data?: boolean | null): MpClassInterface<boolean | null>;

    /** Interprets the first bytes (derived from `Uint8Array.byteOffset`) from a buffer to a MessagePack nullable boolean wrapper.
     *
     * @example Bool.nullable(new Uint8Array([0x00])); // interprets the falsy byte (`0x00`) as `false`
     * @example Bool.nullable(new Uint8Array([0x01, 0x02, 0x03])); // interprets the truthy byte (`0x01`) as `true`
     *
     * @example Bool.nullable(new Uint8Array()); // interprets an empty buffer as `null`
     *
     */
    static nullable(bfr: Uint8Array): MpClassInterface<boolean | null>;

    static nullable(a: boolean | null | Uint8Array = null): MpClassInterface<boolean | null> {
        let isNull: boolean;

        if (a instanceof Uint8Array) {
            const bfr = a;

            const byte = bfr[bfr.byteOffset];
            isNull = byte === undefined;
        } else {
            const data = a;
            isNull = Object.is(data, null);
        }

        const bool = isNull ? new Bool() : new Bool(<boolean>a);
        bool.#nullable = true;
        bool.#isNull = isNull;

        return bool;
    }

    /** Retrieves the wrapped boolean value. */
    raw(): boolean;

    /** Sets a new boolean value and wrap it. */
    raw(data: boolean): void;

    raw(data?: boolean): boolean | void {
        if (data === undefined && arguments.length === 0) return this.#nullable && this.#isNull ? <boolean><unknown>null : this.#state;

        if (this.#nullable && Object.is(data, null)) this.#isNull = true;

        if (Bool.isRawValid(data)) {
            this.#state = data;
            this.#isNull = false;
        } else throw new TypeError(`Invalid value was passed into \`Bool\`. Did not expect ${toLegible(data)}.`);
    }

    /** Encodes the wrapped boolean and converts it to a MessagePack chunk. */
    encode(): Uint8Array {
        return new Uint8Array([
            this.#nullable && this.#isNull
                ? 0xc0 :
            this.#state
                ? 0xc3
                : 0xc2
        ]);
    }

    /** Decodes a boolean MessagePack chunk, validates it and parses it to a Bool. */
    static decode(chunk: Uint8Array): Bool {
        const code = chunk[chunk.byteOffset];
        if (code === undefined) throw new Error("Unable to retrieve header code from `chunk`. Is the chunk empty/truncated or `chunk.byteOffset` exceeded its length?");

        if (code === 0xc2) return new Bool(false);
        if (code === 0xc3) return new Bool(true );

        throw new TypeError(`Invalid chunk header for \`Bool\`. Did not expect ${toLegible(code, true)}.`);
    }

    /** Checks whether a value is valid for a Bool. */
    static isRawValid(data: any): data is boolean {
        return typeof data === "boolean";
    }

    /** Checks whether a chunk header code is valid for a Bool. */
    static isCodeValid(code: number): boolean {
        return (
            code === 0xc2 ||
            code === 0xc3
        );
    }

    /** Checks whether a chunk is valid for a Bool. */
    static isChunkValid = MpClassImpl.isChunkValid.bind(Bool);
} satisfies MpClassModule<boolean>;
