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

console.log("[5/5] - re-unpacking repacked buffer...");

const decodedDataFromPackedBfr = decodeGeneric<ArrClassed>(packedBfr, lz4BlockExt);
console.log("[5/5] - successfully unpacked repacked buffer!", decodedDataFromPackedBfr);

console.log("Tests complete!");
