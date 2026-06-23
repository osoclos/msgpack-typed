import { describe, it, expect } from "vitest";

import { Arr, Obj, type ValueArr, type ValueObj } from "../../dist";

describe("ARR", () => {
    const valuesAccepted: ValueArr<unknown>[] = [
        [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ],

        [1, [2, [3, [4, [5]]]]]
    ];

    const stringify = (arr: unknown[]): string => {
        return `[${arr.map((item) => Array.isArray(item) ? stringify(item) : item).join(", ")}]`;
    };

    for (const value of valuesAccepted) {
        it(`${stringify(value)} (length: ${value.length})`, () => {
            expect(Arr.isValueValid(value)).toBe(true);

            const chunkEncoded = Arr.encode(value);

            expect(Arr.isChunkValid(chunkEncoded)).toBe(true);
            expect(Arr.parse(Arr.decode(chunkEncoded))).toStrictEqual(value);
        });
    }
});

describe("OBJ", () => {
    const valuesAccepted: ValueObj<unknown, unknown>[] = [
        new Map([
            [1, 2],
            [2, 4],
            [3, 6],
            [4, 8],
            [5, 10]
        ]),

        new Map<unknown, unknown>([
            [1, 1],
            [2, new Map<unknown, unknown>([
                [3, 3],
                [4, new Map<unknown, unknown>([
                    [5, 5],
                    [6, new Map<unknown, unknown>([
                        [7, 7],
                        [8, new Map<unknown, unknown>([[9, 9]])]
                    ])]
                ])]
            ])]
        ])
    ];

    const stringify = (obj: Map<unknown, unknown>): string => {
        return `[${[...obj.entries()].map(([key, item]) => `[${key instanceof Map ? stringify(key) : key}, ${item instanceof Map ? stringify(item) : item}]`).join(", ")}]`;
    };

    const objectify = (obj: Map<unknown, unknown>): Record<PropertyKey, unknown> => {
        const parsed: Record<PropertyKey, unknown> = {};
        for (const [key, item] of obj) parsed[key as keyof typeof obj] = item instanceof Map ? objectify(item) : item;

        return parsed;
    };

    for (const value of valuesAccepted) {
        it(`${stringify(value as Map<unknown, unknown>)} (length: ${(value as Map<unknown, unknown>).size})`, () => {
            expect(Obj.isValueValid(value)).toBe(true);

            const chunkEncoded = Obj.encode(value);

            expect(Obj.isChunkValid(chunkEncoded)).toBe(true);

            const obj = Obj.parse(Obj.decode(chunkEncoded));
            expect(obj).toStrictEqual(obj instanceof Map ? value : objectify(value as Map<unknown, unknown>));
        });
    }
});
