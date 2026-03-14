import { Arr, initHashTableModule, initLz4BlockModule, initMathModule, mpLz4Unpack } from "../../src";

const fIn = new Uint8Array(<ArrayBuffer>await fetch("test.dat").then((res) => res.arrayBuffer()));

const math = await initMathModule();
const hashTable = await initHashTableModule();

const lz4Block = await initLz4BlockModule({ math, hashTable, debug: { log: console.log } });

const unpackedBfr = mpLz4Unpack(lz4Block, fIn);

console.log([...unpackedBfr].map((byte) => byte.toString(16).padStart(2, "0")));

const arr = Arr.decode(unpackedBfr);
console.log(arr);
