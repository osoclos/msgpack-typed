import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";

import { Arr, decodeAny, encodeAny, LZ4Compression, Obj, type ValueArr, type ValueObj } from "../../dist";

describe("LZ4", async () => {
    await LZ4Compression.initModules();

    const fDataCOTL = await server.commands.readFile("tests/files/data-cotl.dat", { encoding: "binary" })

    const fObjSingle = await server.commands.readFile("tests/files/obj-single.dat", { encoding: "binary" });
    const fObjArr = await server.commands.readFile("tests/files/obj-array.dat", { encoding: "binary" });

    it("COTL save file data", () => {
        const chunk = new Uint8Array(Array(fDataCOTL.length).fill(null).map((_, i) => fDataCOTL.codePointAt(i)!));

        expect(LZ4Compression.isUnpackable(chunk)).toBe(true);

        const decoded = decodeAny(chunk, true) as ValueArr<unknown>;
        expect(() => void Arr.parse(decoded)).not.toThrow();

        const chunkEncoded = encodeAny(decoded, true);

        expect(LZ4Compression.isUnpackable(chunkEncoded)).toBe(true);
        expect(decodeAny(chunkEncoded, true)).toStrictEqual(decoded);
    });

    it("single obj", () => {
        const chunk = new Uint8Array(Array(fObjSingle.length).fill(null).map((_, i) => fObjSingle.codePointAt(i)!));

        expect(LZ4Compression.isUnpackable(chunk)).toBe(true);

        const decoded = decodeAny(chunk, true) as ValueObj<unknown, unknown>;
        expect(() => void Obj.parse(decoded)).not.toThrow();

        const chunkEncoded = encodeAny(decoded, true);

        expect(LZ4Compression.isUnpackable(chunkEncoded)).toBe(true);
        expect(decodeAny(chunkEncoded, true)).toStrictEqual(decoded);
    });

    it("array of objs", () => {
        const chunk = new Uint8Array(Array(fObjArr.length).fill(null).map((_, i) => fObjArr.codePointAt(i)!));

        expect(LZ4Compression.isUnpackable(chunk)).toBe(true);

        const decoded = decodeAny(chunk, true) as ValueObj<unknown, unknown>;
        expect(() => void Obj.parse(decoded)).not.toThrow();

        const chunkEncoded = encodeAny(decoded, true);

        expect(LZ4Compression.isUnpackable(chunkEncoded)).toBe(true);
        expect(decodeAny(chunkEncoded, true)).toStrictEqual(decoded);
    });
});
