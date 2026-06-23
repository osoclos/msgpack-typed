import { describe, it, expect } from "vitest";
import { Int, type SubtypeInt, type ValueInt } from "../../dist";

describe("INT", () => {
    const valuesAccepted: [SubtypeInt, ValueInt[]][] = [
        ["FIXINT", [
            -1,
            -32
        ]],

        ["I8", [
            -33,
            0,
            127,
            -128
        ]],

        ["I16", [
            -129,
            128,
            32_767,
            -32_768
        ]],

        ["I32", [
            -32_769,
            32_768,
            2 ** 31 - 1,
            -(2 ** 31)
        ]],

        ["I64", [
            -(2 ** 31 + 1),
            2 ** 31,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER + 1,
            -Number.MAX_SAFE_INTEGER,
            -(Number.MAX_SAFE_INTEGER + 1),
            2n ** 63n - 1n,
            -(2n ** 63n)
        ]]
    ];

    const valuesRejected: ValueInt[] = [
        2n ** 63n,
        Infinity,
        1.2,
        -(2n ** 63n + 1n),
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        const subtype = valuesAccepted[iValues]![0];

        for (const [subtypeSrc, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${subtypeSrc} => ${subtype} - ${value}`, () => {
                    expect(Int.isValueValid(value, subtype)).toBe(true);
                    expect(Int.value2Subtype(value)).toBe(subtypeSrc);

                    const chunkEncoded = new Int(value, subtypeSrc).encode();

                    expect(Int.isChunkValid(chunkEncoded)).toBe(subtypeSrc);
                    expect(Int.decode(chunkEncoded).value).toSatisfy((valueDecoded) => valueDecoded === (typeof valueDecoded === "bigint" ? BigInt(value) : value));
                });

        for (const [subtypeSrc, values] of valuesAccepted.slice(iValues + 1))
            for (const value of values) it(`${subtypeSrc} !=> ${subtype} - ${value}`, () => void expect(() => void new Int(value, subtype)).toThrow());
    }

    for (const value of valuesRejected) it(`reject ${value}`, () => void expect(() => void new Int(value)).toThrow());
});
