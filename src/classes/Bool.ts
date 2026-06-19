import { MpClass, MpError } from "../primitives";

export class Bool extends MpClass<ValueBool>() {
    #value: ValueBool;

    constructor(value?: ValueBool);
    constructor(bfr: Uint8Array);
    constructor(a: ValueBool | Uint8Array = false) {
        super(a as ValueBool);

        if (typeof a === "boolean") {
            const value = a;

            if (Bool.isValueValid(value)) this.#value = value;
            else throw new MpError.InvalidValue(this[Symbol.toStringTag], "constructor");

            return;
        }

        const bfr = a;

        const value = bfr[0]! !== 0x00;

        if (Bool.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "constructor");
    }

    override get value(): ValueBool {
        return this.#value;
    }

    override set value(value: ValueBool) {
        if (Bool.isValueValid(value)) this.#value = value;
        else throw new MpError.InvalidValue(this[Symbol.toStringTag], "value");
    }

    override encode(): Uint8Array {
        return new Uint8Array([0xc2 + +this.#value /* this.#value ? 0xc3 : 0xc2 */])
    }

    static override decode(chunk: Uint8Array): Bool {
        const indices = this.deriveChunkIndices(chunk);

        const iCode = indices[0];
        const iChunkEnd = indices[1];

        if (iChunkEnd > chunk.byteLength) throw new MpError.TruncatedChunk(Bool.name, "decode", iChunkEnd, chunk.byteLength);

        const code = chunk[iCode]!;
        const value = code === 0xc3;

        return new Bool(value);
    }

    static override isValueValid(value: unknown): value is ValueBool {
        return typeof value === "boolean";
    }

    static override isCodeValid(code: number): boolean {
        return (
            code === 0xc2 ||
            code === 0xc3
        );
    }

    static override isChunkValid(chunk: Uint8Array): boolean {
        const code = chunk[0 /* iCode */];
        if (code === undefined) throw new MpError.MissingCode(Bool.name, "isChunkValid");

        return this.isCodeValid(code);
    }

    static override deriveChunkIndices(chunk: Uint8Array): [number, number] {
        const code = chunk[0 /* iCode */]!; // ignore undefined since it is checked by isChunkValid

        if (!this.isChunkValid(chunk)) throw new MpError.InvalidCode(Bool.name, "deriveChunkIndices", code);

        return [
            0 /* iCode */,
            1 /* iChunkEnd */
        ];
    }

    override get [Symbol.toStringTag](): string {
        return Bool.name;
    }
}

export type ValueBool = boolean;
