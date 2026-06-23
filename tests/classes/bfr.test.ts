import { describe, it, expect } from "vitest";
import { Bfr, type SubtypeBfr, type ValueBfr } from "../../dist";

describe("BFR", () => {
    const valuesAccepted: [SubtypeBfr, ValueBfr[]][] = [
        ["BFR8", [
            new Uint8Array(0),
            new Uint8Array(1),
            new Uint8Array(255)
        ]],

        ["BFR16", [
            new Uint8Array(256),
            new Uint8Array(65_535)
        ]],

        ["BFR32", [
            new Uint8Array(65_536),
            new Uint8Array(1_000_000)
        ]]
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        const subtype = valuesAccepted[iValues]![0];

        for (const [subtypeSrc, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${subtypeSrc} => ${subtype} - length: ${value.byteLength}`, () => {
                    expect(Bfr.isValueValid(value, subtype)).toBe(true);
                    expect(Bfr.value2Subtype(value)).toBe(subtypeSrc);

                    const chunkEncoded = new Bfr(value, subtypeSrc).encode();

                    expect(Bfr.isChunkValid(chunkEncoded)).toBe(subtypeSrc);
                    expect(Bfr.decode(chunkEncoded).value.byteLength).toBe(value.byteLength);
                });

        for (const [subtypeSrc, values] of valuesAccepted.slice(iValues + 1))
            for (const value of values) it(`${subtypeSrc} !=> ${subtype} - length: ${value.byteLength}`, () => void expect(() => void new Bfr(value, subtype)).toThrow());
    }
});
