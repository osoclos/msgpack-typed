import { describe, it, expect } from "vitest";
import { Uint, type SubtypeUint, type ValueUint } from "../../dist";

describe("UINT", () => {
    const valuesAccepted: [SubtypeUint, ValueUint[]][] = [
        ["FIXINT", [
            0,
            1,
            127
        ]],

        ["U8", [
            128,
            255
        ]],

        ["U16", [
            256,
            65_535
        ]],

        ["U32", [
            65_536,
            2 ** 32 - 1
        ]],

        ["U64", [
            2 ** 32,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER + 1,
            2n ** 64n - 1n
        ]]
    ];

    const valuesRejected: ValueUint[] = [
        2n ** 64n,
        Infinity,
        1.2,
        -2
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        const subtype = valuesAccepted[iValues]![0];

        for (const [subtypeSrc, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${subtypeSrc} => ${subtype} - ${value}`, () => {
                    expect(Uint.isValueValid(value, subtype)).toBe(true);
                    expect(Uint.value2Subtype(value)).toBe(subtypeSrc);

                    const chunkEncoded = new Uint(value, subtypeSrc).encode();

                    expect(Uint.isChunkValid(chunkEncoded)).toBe(subtypeSrc);
                    expect(Uint.decode(chunkEncoded).value).toSatisfy((valueDecoded) => valueDecoded === (typeof valueDecoded === "bigint" ? BigInt(value) : value));
                });

        for (const [subtypeSrc, values] of valuesAccepted.slice(iValues + 1))
            for (const value of values) it(`${subtypeSrc} !=> ${subtype} - ${value}`, () => void expect(() => void new Uint(value, subtype)).toThrow());
    }

    for (const value of valuesRejected) it(`reject ${value}`, () => void expect(() => void new Uint(value)).toThrow());
});
