import { describe, it, expect } from "vitest";
import { Flt, type SubtypeFlt, type ValueFlt } from "../../dist";

describe("FLT", () => {
    const valuesAccepted: [SubtypeFlt, ValueFlt[]][] = [
        ["F32", [
            0.0,
            -0.0,
            1.0,
            -1.0,

            0.5,
            1.5,
            2.5,

            0.25,
            0.125,

            2 ** 24,
            -(2 ** 24),

            Infinity,
            -Infinity,

            NaN
        ]],

        ["F64", [
            2 ** 24 + 1,

            Math.PI,
            Math.E,

            0.1,
            0.2,
            0.3
        ]]
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        const subtype = valuesAccepted[iValues]![0];

        for (const [subtypeSrc, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${subtypeSrc} => ${subtype} - ${value}`, () => {
                    expect(Flt.isValueValid(value, subtype)).toBe(true);
                    expect(Flt.value2Subtype(value)).toBe(subtypeSrc);

                    expect(Flt.decode(new Flt(value, subtypeSrc).encode()).value).toSatisfy((valueDecoded) => Number.isNaN(valueDecoded) || valueDecoded === value);
                });

        for (const [subtypeSrc, values] of valuesAccepted.slice(iValues + 1))
            for (const value of values) it(`${subtypeSrc} !=> ${subtype} - ${value}`, () => void expect(() => void new Flt(value, subtype)).toThrow());
    }
});
