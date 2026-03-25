import { Arr, ArrPrimitive, decodeGeneric, encodeGeneric, Lz4Block, Obj } from "@/index.js";

await Lz4Block.initModules();
{
    const fIn = new Uint8Array(<ArrayBuffer>await fetch("in.dat").then((res) => res.arrayBuffer()));

    console.log("General Data File: [1/4] - decoding unpacked buffer...");

    const decodedData = decodeGeneric<ArrPrimitive>(fIn, [], true);
    console.log("General Data File: [1/4] - decoding complete!", decodedData);

    console.log("General Data File: [2/4] - turning into raw data...");

    const rawData = Arr.parse(decodedData);
    console.log("General Data File: [2/4] - turned decoded data into raw data!", rawData);

    console.log("General Data File: [3/4] - repacking decoded data...");

    const packedBfr = encodeGeneric(decodedData, [], true);
    console.log("General Data File: [3/4] - repacked decoded data!", packedBfr);

    console.log("General Data File: [4/4] - re-unpacking repacked buffer...");

    const decodedDataFromPackedBfr = decodeGeneric(packedBfr, [], true);
    console.log("General Data File: [4/4] - successfully unpacked repacked buffer!", decodedDataFromPackedBfr);

    console.log("General Data File: Tests complete!");
}

{
    const fObjArray = new Uint8Array(<ArrayBuffer>await fetch("obj-array.dat").then((res) => res.arrayBuffer()));

    console.log("Map Compressed Array: [1/4] - decoding unpacked buffer...");

    const decodedData = decodeGeneric(fObjArray, [], true);
    console.log("Map Compressed Array: [1/4] - decoding complete!", decodedData);

    console.log("Map Compressed Array: [2/4] - turning into raw data...");

    const rawData = Obj.parse(decodedData);
    console.log("Map Compressed Array: [2/4] - turned decoded data into raw data!", rawData);

    console.log("Map Compressed Array: [3/4] - repacking decoded data...");

    const packedBfr = encodeGeneric(decodedData, [], true);
    console.log("Map Compressed Array: [3/4] - repacked decoded data!", packedBfr);

    console.log("Map Compressed Array: [4/4] - re-unpacking repacked buffer...");

    const decodedDataFromPackedBfr = decodeGeneric(packedBfr, [], true);
    console.log("Map Compressed Array: [4/4] - successfully unpacked repacked buffer!", decodedDataFromPackedBfr);

    console.log("Map Compressed Array: Tests complete!");
}

{
    const fObjSingle = new Uint8Array(<ArrayBuffer>await fetch("obj-single.dat").then((res) => res.arrayBuffer()));

    console.log("Map Compressed Single: [1/4] - decoding unpacked buffer...");

    const decodedData = decodeGeneric(fObjSingle, [], true);
    console.log("Map Compressed Single: [1/4] - decoding complete!", decodedData);

    console.log("Map Compressed Single: [2/4] - turning into raw data...");

    const rawData = Obj.parse(decodedData);
    console.log("Map Compressed Single: [2/4] - turned decoded data into raw data!", rawData);

    console.log("Map Compressed Single: [3/4] - repacking decoded data...");

    const packedBfr = encodeGeneric(decodedData, [], true);
    console.log("Map Compressed Single: [3/4] - repacked decoded data!", packedBfr);

    console.log("Map Compressed Single: [4/4] - re-unpacking repacked buffer...");

    const decodedDataFromPackedBfr = decodeGeneric(packedBfr, [], true);
    console.log("Map Compressed Single: [4/4] - successfully unpacked repacked buffer!", decodedDataFromPackedBfr);

    console.log("Map Compressed Single: Tests complete!");
}
