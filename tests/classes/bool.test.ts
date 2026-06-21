import { describe, it, expect } from "vitest";
import { Bool, type ValueBool } from "../../dist";

describe("BOOL", () => {
    const valuesAccepted: ValueBool[] = [
        true,
        false
    ];

    for (const value of valuesAccepted) {
        it(`${value}`, () => {
            expect(Bool.isValueValid(value)).toBe(true);

            const chunkEncoded = new Bool(value).encode();

            expect(Bool.isChunkValid(chunkEncoded)).toBe(true);
            expect(Bool.decode(chunkEncoded).value).toBe(value);
        });
    }
});
