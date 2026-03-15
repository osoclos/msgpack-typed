import { Arr, ArrClassed, decodeGeneric, encodeGeneric, Lz4BlockExt, mpLz4Unpack } from "../../src";

const lz4BlockExt = await Lz4BlockExt.create();

const fIn = new Uint8Array(<ArrayBuffer>await fetch("in.dat").then((res) => res.arrayBuffer()));

console.log("[1/5] - unpacking using LZ4 block algorithm...");

const unpackedBfr = mpLz4Unpack(lz4BlockExt.lz4Block, fIn);
console.log("[1/5] - unpacking complete!", unpackedBfr);

console.log("[2/5] - decoding unpacked buffer...");

const decodedData = decodeGeneric<ArrClassed>(unpackedBfr, lz4BlockExt);
console.log("[2/5] - decoding complete!", decodedData);

console.log("[3/5] - turning into raw data...");

const rawData = Arr.raw(decodedData);
console.log("[3/5] - turned decoded data into raw data!", rawData);

console.log("[4/5] - repacking decoded data...");

const packedBfr = encodeGeneric(decodedData, lz4BlockExt);
console.log("[4/5] - repacked decoded data!", packedBfr);

const EXPORT_PACKED_BFR: boolean = false;
if (EXPORT_PACKED_BFR) {
    const url = URL.createObjectURL(new Blob([<Uint8Array<ArrayBuffer>>packedBfr]));

    const link = document.createElement("a");
    link.href = url;
    link.download = "out.dat";

    link.click();
}

console.log("[5/5] - re-unpacking repacked buffer...");

const unpackedDataFromRepackedBfr = decodeGeneric(packedBfr, lz4BlockExt);
console.log("[5/5] - successfully unpacked repacked buffer!", unpackedDataFromRepackedBfr);

console.log("Tests complete!");
