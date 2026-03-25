import { Arr, ArrPrimitive, decodeGeneric, encodeGeneric, Lz4Block } from "../../dist";

Lz4Block.initModules();

const fIn = new Uint8Array(<ArrayBuffer>await fetch("in.dat").then((res) => res.arrayBuffer()));

console.log("[1/4] - decoding unpacked buffer...");

const decodedData = decodeGeneric<ArrPrimitive>(fIn, [], true);
console.log("[1/4] - decoding complete!", decodedData);

console.log("[2/4] - turning into raw data...");

const rawData = Arr.parse(decodedData);
console.log("[2/4] - turned decoded data into raw data!", rawData);

console.log("[3/4] - repacking decoded data...");

const packedBfr = encodeGeneric(decodedData, [], true);
console.log("[3/4] - repacked decoded data!", packedBfr);

console.log("[4/4] - re-unpacking repacked buffer...");

const decodedDataFromPackedBfr = decodeGeneric(packedBfr, [], true);
console.log("[4/4] - successfully unpacked repacked buffer!", decodedDataFromPackedBfr);

console.log("Tests complete!");
