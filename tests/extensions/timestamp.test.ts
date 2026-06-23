import { describe, it, expect } from "vitest";
import { ExtTimestamp, ExtUtils, Timestamp } from "../../dist";

describe("EXT [TIMESTAMP]", () => {
    const ext = new ExtTimestamp();

    const valuesAccepted: [number, Timestamp[]][] = [
        [4, [
            new Timestamp(0),
            new Timestamp(1),
            new Timestamp(2 ** 32 - 1),

            new Timestamp(new Date("2000-02-29T12:34:56Z")),
            new Timestamp(new Date("2024-02-29T00:00:00Z"))
        ]],

        [8, [
            new Timestamp(new Date(1)),
            new Timestamp(new Date(10)),
            new Timestamp(new Date(123)),
            new Timestamp(new Date(999)),

            new Timestamp(2 ** 32),

            new Timestamp(new Date(Date.now()))
        ]],

        [12, [
            new Timestamp(new Date(-1)),
            new Timestamp(new Date(-1000)),

            new Timestamp(new Date("1900-01-01T00:00:00Z"))
        ]],
    ];

    for (let iValues: number = 0; iValues < valuesAccepted.length; iValues++) {
        for (const [lenPayload, values] of valuesAccepted.slice(0, iValues + 1))
            for (const value of values)
                it(`${value}`, () => {
                    expect(ext.isEncodable(value)).toBe(true);

                    const [payload, codeExt] = ext.encode(value);
                    const chunkEncoded = ExtUtils.encodeRaw(payload, codeExt);

                    expect(payload.byteLength).toBe(lenPayload);

                    expect(ExtUtils.isChunkValid(chunkEncoded)).toBe(true);
                    expect(ExtUtils.decodeWith<typeof Timestamp, false>(ext, chunkEncoded)).toStrictEqual(value);
                });
    }
});
