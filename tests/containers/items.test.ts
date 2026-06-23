import { describe, it, expect } from "vitest";
import { Arr, Bfr, Bool, Flt, Int, Obj, Str, Uint, type ValueArr, type ValueObj } from "../../dist";

const objectify = (obj: Map<unknown, unknown>): Record<PropertyKey, unknown> => {
    const parsed: Record<PropertyKey, unknown> = {};
    for (const [key, item] of obj) parsed[key as keyof typeof obj] = item instanceof Map ? objectify(item) : item;

    return parsed;
};

describe("ARR", () => {
    const value: ValueArr<unknown> = [
        null,

        false,

        123,
        123n,

        1.5,

        "hello",

        new Uint8Array([1, 2, 3]),

        [1, 2, 3],
        {
            x: 1,
            y: 2,
            z: 3
        },

        new Uint(456),
        new Int(-456),
        new Flt(4.2),

        new Str("world"),
        new Bool(true),

        new Bfr(new Uint8Array([4, 5, 6])),

        [4, 5, 6],
        new Map([
            ["x", 4],
            ["y", 5],
            ["z", 6]
        ])
    ];

    it("items", () => {
        expect(Arr.isValueValid(value)).toBe(true);

        const chunkEncoded = Arr.encode(value);

        expect(Arr.isChunkValid(chunkEncoded)).toBe(true);

        const arr = Arr.parse(Arr.decode(chunkEncoded));
        for (let i: number = 0; i < arr.length; i++) {
            const itemArr   = arr  [i]!;
            const itemValue = value[i]!;

            if (typeof itemValue === "bigint") expect(itemArr).toSatisfy((item) => (typeof item === "bigint" ? item : BigInt(item)) === itemValue);
            else if (
                itemValue instanceof Uint ||
                itemValue instanceof Int  ||
                itemValue instanceof Flt  ||

                itemValue instanceof Bool ||
                itemValue instanceof Str  ||

                itemValue instanceof Bfr
            ) expect(itemArr).toStrictEqual(itemValue.value);
            else if (
                itemArr as ValueObj<unknown, unknown> instanceof Map ||
                itemValue instanceof Map
            ) expect(itemArr as ValueObj<unknown, unknown> instanceof Map ? objectify(itemArr) : itemArr).toStrictEqual(itemValue instanceof Map ? objectify(itemValue) : itemValue);
            else expect(itemArr).toStrictEqual(itemValue);
        }
    });
});

describe("OBJ", () => {
    const valueObj: ValueObj<unknown, unknown> = {
        nil: null,

        bool: false,

        number: 123,
        bigint: 123n,

        float: 1.5,

        str: "hello",

        bin: new Uint8Array([1, 2, 3]),

        arr: [1, 2, 3],
        obj: {
            x: 1,
            y: 2,
            z: 3
        },

        cUint: new Uint(456),
        cInt: new Int(-456),
        cFlt: new Flt(4.2),

        cStr: new Str("world"),
        cBool: new Bool(true),

        cBfr: new Bfr(new Uint8Array([4, 5, 6])),

        list: [4, 5, 6],
        map: new Map([
            ["x", 4],
            ["y", 5],
            ["z", 6]
        ])
    };

    it("items (obj)", () => {
        expect(Obj.isValueValid(valueObj)).toBe(true);

        const chunkEncoded = Obj.encode(valueObj);

        expect(Obj.isChunkValid(chunkEncoded)).toBe(true);

        const obj = Obj.parse(Obj.decode(chunkEncoded));

        const entriesObj = obj instanceof Map ? [...obj.entries()] : Object.entries(obj);
        const entriesValue = valueObj instanceof Map ? [...valueObj.entries()] : Object.entries(valueObj);

        for (let i: number = 0; i < entriesObj.length; i++) {
            for (let j: number = 0; j < 2; j++) {
                const itemObj   = entriesObj  [i]![j]!;
                const itemValue = entriesValue[i]![j]!;

                if (typeof itemValue === "bigint") expect(itemObj).toSatisfy((item) => (typeof item === "bigint" ? item : BigInt(item)) === itemValue);
                else if (
                    itemValue instanceof Uint ||
                    itemValue instanceof Int  ||
                    itemValue instanceof Flt  ||

                    itemValue instanceof Bool ||
                    itemValue instanceof Str  ||

                    itemValue instanceof Bfr
                ) expect(itemObj).toStrictEqual(itemValue.value);
                else if (
                    itemObj as ValueObj<unknown, unknown> instanceof Map ||
                    itemValue instanceof Map
                ) expect(itemObj as ValueObj<unknown, unknown> instanceof Map ? objectify(itemObj as Map<unknown, unknown>) : itemObj).toStrictEqual(itemValue instanceof Map ? objectify(itemValue) : itemValue);
                else expect(itemObj).toStrictEqual(itemValue);
            }
        }
    });

    const valueMap: ValueObj<unknown, unknown> = new Map<unknown, unknown>([
        ["nil", null],

        ["bool", false],

        ["number", 123],
        ["bigint", 123n],

        ["float", 1.5],

        ["str", "hello"],

        ["bin", new Uint8Array([1, 2, 3])],

        ["arr", [1, 2, 3]],
        ["obj", {
            x: 1,
            y: 2,
            z: 3
        }],

        [new Uint(456), new Uint(456)],
        [new Int(-456), new Int(-456)],
        [new Flt(4.2), new Flt(4.2)],

        [new Str("world"), new Str("world")],
        [new Bool(true), new Bool(true)],

        [new Bfr(new Uint8Array([4, 5, 6])), new Bfr(new Uint8Array([4, 5, 6]))],

        [[4, 5, 6], [4, 5, 6]],
        [new Map([
            ["x", 4],
            ["y", 5],
            ["z", 6]
        ]), new Map([
            ["x", 4],
            ["y", 5],
            ["z", 6]
        ])]
    ]);

    it("items (map)", () => {
        expect(Obj.isValueValid(valueMap)).toBe(true);

        const chunkEncoded = Obj.encode(valueMap);

        expect(Obj.isChunkValid(chunkEncoded)).toBe(true);

        const obj = Obj.parse(Obj.decode(chunkEncoded));

        const entriesMap = obj instanceof Map ? [...obj.entries()] : Object.entries(obj);
        const entriesValue = valueMap instanceof Map ? [...valueMap.entries()] : Object.entries(valueMap);

        for (let i: number = 0; i < entriesMap.length; i++) {
            for (let j: number = 0; j < 2; j++) {
                const itemMap   = entriesMap  [i]![j]!;
                const itemValue = entriesValue[i]![j]!;

                if (typeof itemValue === "bigint") expect(itemMap).toSatisfy((item) => (typeof item === "bigint" ? item : BigInt(item)) === itemValue);
                else if (
                    itemValue instanceof Uint ||
                    itemValue instanceof Int  ||
                    itemValue instanceof Flt  ||

                    itemValue instanceof Bool ||
                    itemValue instanceof Str  ||

                    itemValue instanceof Bfr
                ) expect(itemMap).toStrictEqual(itemValue.value);
                else if (
                itemMap as ValueObj<unknown, unknown> instanceof Map ||
                itemValue instanceof Map
            ) expect(itemMap as ValueObj<unknown, unknown> instanceof Map ? objectify(itemMap as Map<unknown, unknown>) : itemMap).toStrictEqual(itemValue instanceof Map ? objectify(itemValue) : itemValue);
                else expect(itemMap).toStrictEqual(itemValue);
            }
        }
    });
});
