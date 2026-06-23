import { describe, it, expect } from "vitest";
import { Str, type SubtypeStr, type ValueStr } from "../../dist";

describe("STR", () => {
    const valuesAccepted: [SubtypeStr, ValueStr[]][] = [
        ["FIXSTR", [
            "",
            "a",
            "a".repeat(31)
        ]],

        ["STR8", [
            "a".repeat(32),
            "a".repeat(255)
        ]],

        ["STR16", [
            "a".repeat(256),
            "a".repeat(65_535)
        ]],

        ["STR32", [
            "a".repeat(65_536),
            "a".repeat(1_000_000)
        ]]
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        const subtype = valuesAccepted[iValues]![0];

        for (const [subtypeSrc, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${subtypeSrc} => ${subtype} - ${value.slice(0, 1)} (length: ${value.length})`, () => {
                    expect(Str.isValueValid(value, subtype)).toBe(true);
                    expect(Str.value2Subtype(value)).toBe(subtypeSrc);

                    const chunkEncoded = new Str(value, subtypeSrc).encode();

                    expect(Str.isChunkValid(chunkEncoded)).toBe(subtypeSrc);
                    expect(Str.decode(chunkEncoded).value.length).toBe(value.length);
                });

        for (const [subtypeSrc, values] of valuesAccepted.slice(iValues + 1))
            for (const value of values) it(`${subtypeSrc} !=> ${subtype} - ${value.slice(0, 1)} (length: ${value.length})`, () => void expect(() => void new Str(value, subtype)).toThrow());
    }
});
