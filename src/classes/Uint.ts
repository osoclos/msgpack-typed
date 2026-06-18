import { type MpClassInterface, type MpClassInterfaceSubtyped, type MpClassModuleSubtyped } from "../types";

export type ValueUint = number | bigint;

const SUBTYPES_UINT = ["FIXINT", "U8", "U16", "U32", "U64"] as const;
export type SubtypeUint = typeof SUBTYPES_UINT[number];

export const Uint: MpClassModuleSubtyped<ValueUint, SubtypeUint> = class Uint implements MpClassInterfaceSubtyped<ValueUint, SubtypeUint> {
    #value: ValueUint;
    #subtype: SubtypeUint;

    constructor(value?: ValueUint, subtype?: SubtypeUint);
    constructor(bfr: Uint8Array, subtype?: SubtypeUint);
    constructor(a: ValueUint | Uint8Array = 0, subtype: SubtypeUint = "U64") {
        if (Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new Error("InvalidSubtypeError");

        if (
            typeof a === "number" ||
            typeof a === "bigint"
        ) {
            const value = a;

            if (Uint.isValueValid(value, subtype)) this.#value = value;
            else throw new Error("InvalidValueError");

            return;
        }

        const bfr = a;
        const view = new DataView(bfr.buffer);

        if (bfr.byteLength >= 8) {
            this.#value = view.getBigUint64(0);
            return;
        }

        if (bfr.byteLength > 4) {
            let value = 0n;

            for (let i: number = 0; i < bfr.byteLength; i++) {
                value <<= 8n;
                value |= BigInt(bfr[i]!);
            }

            this.#value = value;
            return;
        }

        if (bfr.byteLength === 4) {
            this.#value = view.getUint32(0);
            return;
        }

        if (bfr.byteLength === 2) {
            this.#value = view.getUint16(0);
            return;
        }

        if (bfr.byteLength === 1) {
            this.#value = bfr[0]!;
            return;
        }

        let value = 0;

        for (let i: number = 0; i < bfr.byteLength; i++) {
            value <<= 8;
            value |= bfr[i]!;
        }

        this.#value = value;
    }

    get value(): ValueUint {
        return this.#value;
    }

    set value(value: ValueUint) {
        if (Uint.isValueValid(value)) this.#value = value;
        else throw new Error("InvalidValueError");
    }

    get subtype(): SubtypeUint {
        return this.#subtype;
    }

    set subtype(subtype: SubtypeUint) {
        if (Uint.isSubtypeValid(subtype)) this.#subtype = subtype;
        else throw new Error("InvalidSubtypeError");
    }

    encode(): Uint8Array {
        if (this.#subtype === "FIXINT") {
            const code = typeof this.#value === "bigint" ? Number(this.#value) : this.#value;
            return new Uint8Array([code]);
        }

        let code: number;
        let len: number;

        let chunk: Uint8Array;
        let view: DataView;

        let fWrite: (value: ValueUint) => void;

        switch (this.#subtype) {
            case "U8": {
                code = 0xcc;
                len = 1;

                fWrite = (value: ValueUint) => void (chunk[1] = typeof value === "bigint" ? Number(value) : value);

                break;
            }

            case "U16": {
                code = 0xcd;
                len = 2;

                fWrite = (value: ValueUint) => void view.setUint16(1, typeof value === "bigint" ? Number(value) : value);

                break;
            }

            case "U32": {
                code = 0xce;
                len = 4;

                fWrite = (value: ValueUint) => void view.setUint32(1, typeof value === "bigint" ? Number(value) : value);

                break;
            }

            case "U64": {
                code = 0xcf;
                len = 8;

                fWrite = (value: ValueUint) => void view.setBigUint64(1, typeof value === "number" ? BigInt(value) : value);

                break;
            }
        }

        chunk = new Uint8Array(1 + len);
        view = new DataView(chunk.buffer);

        chunk[0] = code;

        fWrite(this.#value);

        return chunk;
    }

    static decode(chunk: Uint8Array, subtype: SubtypeUint = "U64"): Uint {
        if (chunk.byteLength === 0) throw new Error("TruncatedChunkError");
        const code = chunk[0]!;

        const indices = this.deriveIndices(chunk);
        if (indices.length === 2) return new Uint(code);

        const [, iDataStart, iDataEnd] = indices;
        if (iDataEnd > chunk.byteLength) console.warn("truncatedChunk");

        return new Uint(chunk.slice(iDataStart, iDataEnd), subtype);
    }

    static cast(item: MpClassInterface<unknown>, subtype: SubtypeUint = "U64"): Uint {
        if (item instanceof Uint) return new Uint(item.value, subtype);
        throw new Error("InvalidItemError");
    }

    static isValueValid(value: unknown, subtype: SubtypeUint = "U64"): value is ValueUint {
        if (typeof value === "number") {
            if (value < 0 || value % 1.0 !== 0.0) return false;

            switch (subtype) {
                case "FIXINT": return value <= 0x7f;

                case "U8" : return value <= 0xff;
                case "U16": return value <= 0xffff;
                case "U32": return value <= 0xffff_ffff;
                case "U64": return value <= Number.MAX_SAFE_INTEGER || BigInt(value) <= 0xffff_ffff_ffff_ffffn;
            }
        }

        if (typeof value === "bigint") {
            if (value < 0n) return false;

            switch (subtype) {
                case "FIXINT": return value <= 0x7fn;

                case "U8" : return value <= 0xffn;
                case "U16": return value <= 0xffffn;
                case "U32": return value <= 0xffff_ffffn;
                case "U64": return value <= 0xffff_ffff_ffff_ffffn;
            }
        }

        return false;
    }

    static isSubtypeValid(subtype: string): subtype is SubtypeUint {
        return (
            subtype === "FIXINT" ||

            subtype === "U8"     ||
            subtype === "U16"    ||
            subtype === "U32"    ||
            subtype === "U64"
        );
    }

    static isCodeValid(code: number, subtypes: SubtypeUint | SubtypeUint[] = SUBTYPES_UINT as unknown as SubtypeUint[]): boolean {
        if (!Array.isArray(subtypes)) subtypes = [subtypes];

        for (const subtype of subtypes) {
            switch (subtype) {
                case "FIXINT": return code <= 0x7f;

                case "U8" : return code === 0xcc;
                case "U16": return code === 0xcd;
                case "U32": return code === 0xce;
                case "U64": return code === 0xcf;
            }
        }

        return false;
    }

    static isChunkValid(chunk: Uint8Array, subtypes: SubtypeUint | SubtypeUint[] = SUBTYPES_UINT as unknown as SubtypeUint[]) {
        if (chunk.byteLength === 0) throw new Error("TruncatedChunkError");
        const code = chunk[0]!;

        return this.isCodeValid(code, subtypes);
    }

    static deriveIndices(chunk: Uint8Array): [number, number] | [number, number, number] {
        const iCode: number = 0;
        const code = chunk[iCode]!;

        if (!this.isChunkValid(chunk)) throw new Error(`InvalidCodeError: ${code}`);

        // FIXINT
        if (code <= 0x7f) {
            const iChunkEnd = iCode + 1;
            return [iCode, iChunkEnd];
        }

        /* match code:
         *     case 0xcc: len = 1 // U8
         *     case 0xcd: len = 2 // U16
         *     case 0xce: len = 4 // U32
         *     case 0xcf: len = 8 // U64
         */
        const len = 0b1 << (code - 0xcc);

        const iDataStart = iCode + 1;
        const iDataEnd   = iDataStart + len;

        return [iCode, iDataStart, iDataEnd];
    }
} satisfies MpClassModuleSubtyped<ValueUint, SubtypeUint>;

export type Uint = typeof Uint["prototype"];
