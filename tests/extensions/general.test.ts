import { describe, it, expect } from "vitest";
import { Ext, ExtUtils } from "../../dist";

describe("EXT", () => {
    class ExtTest<C extends number> extends Ext<NumberConstructor, C> {
        #code: C;

        constructor(code: C) {
            super([code]);
            this.#code = code;
        }

        override encode(value: number): [Uint8Array, C] {
            return [new Uint8Array(value), this.#code];
        }

        override decode(bfr: Uint8Array, _code: C):  number {
            return bfr.byteLength;
        }

        override isEncodable(value: unknown): value is number {
            return typeof value === "number";
        }
    }

    const codesExtAccepted: number[] = [
        0,
        1,
        127,
        -128,
        -1
    ];

    const codesExtRejected: number[] = [
        -129,
        128,
        3.2,
        -2.4
    ];

    const payloads: [number, number[]][] = [
        [0xd4, [1]],
        [0xd5, [2]],
        [0xd6, [4]],
        [0xd7, [8]],
        [0xd8, [16]],

        [0xc7, [
            0,
            3,
            255
        ]],


        [0xc8, [
            256,
            65_535
        ]],

        [0xc9, [
            65_536,
            1_000_000
        ]]
    ];

    const payloadEmpty = new Uint8Array(0);

    for (const code of codesExtAccepted) it(`${code}`, () => {
        const chunkEncoded = ExtUtils.encodeRaw(payloadEmpty, code);
        expect(ExtUtils.decodeRaw(chunkEncoded)[1]).toBe(code);
    });

    for (const code of codesExtRejected) expect(() => void new ExtTest(code)).toThrow();

    const ext = new ExtTest(0);

    for (let iPayload: number = 0; iPayload < payloads.length; iPayload++) {
        for (const [codeChunk, values] of payloads.slice(0, iPayload + 1))
            for (const value of values)
                it(`0x${codeChunk.toString(16).padStart(2, "0")} - ${value}`, () => {
                    expect(ext.isEncodable(value)).toBe(true);

                    const chunkEncoded = ExtUtils.encodeWith(ext, value);

                    expect(chunkEncoded[0]!).toBe(codeChunk);

                    expect(ExtUtils.isChunkValid(chunkEncoded)).toBe(true);
                    expect(ExtUtils.decodeWith(ext, chunkEncoded)).toBe(value);
                });
    }
});
