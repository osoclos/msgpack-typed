import { describe, it, expect } from "vitest";
import { Arr, Obj, type ValueArr, type ValueObj } from "../../dist";

describe("ARR", () => {
    const valuesAccepted: [number, ValueArr<unknown>[]][] = [
        [0x90, [Array(0x0).fill(0)]],
        [0x91, [Array(0x1).fill(0)]],
        [0x92, [Array(0x2).fill(0)]],
        [0x93, [Array(0x3).fill(0)]],
        [0x94, [Array(0x4).fill(0)]],
        [0x95, [Array(0x5).fill(0)]],
        [0x96, [Array(0x6).fill(0)]],
        [0x97, [Array(0x7).fill(0)]],
        [0x98, [Array(0x8).fill(0)]],
        [0x99, [Array(0x9).fill(0)]],
        [0x9a, [Array(0xa).fill(0)]],
        [0x9b, [Array(0xb).fill(0)]],
        [0x9c, [Array(0xc).fill(0)]],
        [0x9d, [Array(0xd).fill(0)]],
        [0x9e, [Array(0xe).fill(0)]],
        [0x9f, [Array(0xf).fill(0)]],

        [0xdc, [
            Array(0x10).fill(0),
            Array(65_535).fill(0)
        ]],

        [0xdd, [
            Array(65_536).fill(0),
            Array(100_000).fill(0)
        ]]
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        for (const [codeChunk, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`0x${codeChunk.toString(16).padStart(2, "0")} - length: ${value.length}`, () => {
                    expect(Arr.isValueValid(value)).toBe(true);

                    const chunkEncoded = Arr.encode(value);

                    expect(chunkEncoded[0]!).toBe(codeChunk);

                    expect(Arr.isChunkValid(chunkEncoded)).toBe(true);
                    expect(Arr.decode(chunkEncoded).length).toBe(value.length);
                });
    }
});

describe("OBJ", () => {
    const valuesAccepted: [number, ValueObj<unknown, unknown>[]][] = [
        [0x80, [new Map(Array(0x0).fill(null).map((_, i) => [i, i * 2]))]],
        [0x81, [new Map(Array(0x1).fill(null).map((_, i) => [i, i * 2]))]],
        [0x82, [new Map(Array(0x2).fill(null).map((_, i) => [i, i * 2]))]],
        [0x83, [new Map(Array(0x3).fill(null).map((_, i) => [i, i * 2]))]],
        [0x84, [new Map(Array(0x4).fill(null).map((_, i) => [i, i * 2]))]],
        [0x85, [new Map(Array(0x5).fill(null).map((_, i) => [i, i * 2]))]],
        [0x86, [new Map(Array(0x6).fill(null).map((_, i) => [i, i * 2]))]],
        [0x87, [new Map(Array(0x7).fill(null).map((_, i) => [i, i * 2]))]],
        [0x88, [new Map(Array(0x8).fill(null).map((_, i) => [i, i * 2]))]],
        [0x89, [new Map(Array(0x9).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8a, [new Map(Array(0xa).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8b, [new Map(Array(0xb).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8c, [new Map(Array(0xc).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8d, [new Map(Array(0xd).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8e, [new Map(Array(0xe).fill(null).map((_, i) => [i, i * 2]))]],
        [0x8f, [new Map(Array(0xf).fill(null).map((_, i) => [i, i * 2]))]],

        [0xde, [
            new Map(Array(0x10).fill(null).map((_, i) => [i, i * 2])),
            new Map(Array(65_535).fill(null).map((_, i) => [i, i * 2]))
        ]],

        [0xdf, [
            new Map(Array(65_536).fill(null).map((_, i) => [i, i * 2])),
            new Map(Array(100_000).fill(null).map((_, i) => [i, i * 2]))
        ]]
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        for (const [codeChunk, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`0x${codeChunk.toString(16).padStart(2, "0")} - length: ${(value as Map<unknown, unknown>).size}`, () => {
                    expect(Obj.isValueValid(value)).toBe(true);

                    const chunkEncoded = Obj.encode(value);

                    expect(chunkEncoded[0]!).toBe(codeChunk);

                    expect(Obj.isChunkValid(chunkEncoded)).toBe(true);

                    const obj = Obj.decode(chunkEncoded);
                    expect(obj instanceof Map ? obj.size : Object.keys(obj).length).toBe((value as Map<unknown, unknown>).size);
                });
    }
});
