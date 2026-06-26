import { ExtUtils } from "../utils";
import { MpError, type Constructor } from "../internal";

/** A parser for encoding and decoding chunks from the `ext` MessagePack family. */
export abstract class Ext<T extends Constructor<unknown>, C extends number> {
    #codes: Set<C>;

    /**
      * Creates an extension to be used with a list of extension codes specified.
      * @param codes the list of extension that will be used
      *
      */
    protected constructor(codes: C[]) {
        for (const code of codes)
            if (
                code % 1.0 !== 0.0 ||

                code < -0x80 ||
                code > 0x7f
            ) throw new MpError.InvalidCode("Ext", "UNSUPPORTED", code);

        this.#codes = new Set(codes);
    }

    /**
      * Encodes a supplied value which can be used to generate a MessagePack chunk.
      *
      * @param value the value to encode
      * @return a tuple of the payload and the extension code to be used to create an extension MessagePack chunk.
      *
      */
    abstract encode(value: T["prototype"]): [Uint8Array, C];

    /**
      * Decodes an appropriate MessagePack chunk via a payload and the extension code from the chunk.
      *
      * @param payload the payload of the extension MessagePack chunk
      * @param code the extension code
      *
      * @return the parsed value
      *
      */
    abstract decode(payload: Uint8Array, code: C): T["prototype"];

    /**
      * Checks if a value is valid and can be encoded by this extension.
      *
      * @param value the value to check
      * @return whether the value can be encoded
      *
      */
    abstract isEncodable(value: unknown): value is T["prototype"];

    /**
      * Checks if a MessagePack chunk can be decoded by this extension.
      *
      * @param chunk the chunk to check
      * @return whether the chunk can be decoded
      *
      */
    isDecodable(chunk: Uint8Array): boolean {
        if (!ExtUtils.isChunkValid(chunk)) return false;

        const codeExt = ExtUtils.decodeRaw(chunk)[1];
        return this.isCodeValid(codeExt);
    }

    /**
      * Checks if an extension code is supported by this extension.
      *
      * @param code the code to check
      * @return whether the code is supported
      *
      */
    isCodeValid(code: number): code is C {
        return this.#codes.has(code << 24 >> 24 as C);
    }

    get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}
