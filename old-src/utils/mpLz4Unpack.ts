import { Slice, Uint } from "../classes";
import { Arr } from "../containers";

import { Lz4BlockModuleExports } from "../modules";

import { ExtUtils } from "./ExtUtils";

import { toLegible } from "./toLegible";

/** Decompresses a buffer using the LZ4 block algorithm. Only compatible with this port of MessagePack and the MessagePack C# port. */
export function mpLz4Unpack(lz4Block: Lz4BlockModuleExports, chunk: Uint8Array): Uint8Array {
    const isMultiBlock = Arr.isChunkValid(chunk);

    let extChunk: Uint8Array;
    const dataBlocks: Uint8Array[] = [];

    if (isMultiBlock) {
        const ranges = Arr.deriveChunkRanges(chunk);

        const hasLenStartIdx = ranges.length === 4;

        const dataIndices = <number[]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];

        extChunk = chunk.subarray(dataIndices.shift());
        for (const i of dataIndices) dataBlocks.push(Slice.decode(chunk.subarray(i)).raw());
    } else {
        extChunk = chunk;

        const len = ExtUtils.deriveChunkRanges(extChunk).slice(-1)[0]!;
        dataBlocks.push(chunk.slice(len));
    }

    const [extData, extCode] = ExtUtils.decodeRaw(extChunk);
    if (extCode !== (isMultiBlock ? 0x62 : 0x63)) throw new Error("Chunk passed into LZ4 unpacker is not packed with LZ4.");

    const origLengths: bigint[] = [];
    for (let i: number = 0; i < extData.byteLength;) {
        const uintChunk = extData.subarray(i);

        const len = Uint.deriveChunkRanges(uintChunk).slice(-1)[0]!;

        const uint = Uint.decode(uintChunk);
        origLengths.push(BigInt(uint.raw()));

        i += len;
    }

    if (origLengths.length !== dataBlocks.length) {
        console.warn(`Expected \`${toLegible(origLengths.length)}\` data blocks, but received ${toLegible(dataBlocks.length)}. Data may be truncated.`);
        dataBlocks.splice(origLengths.length);
    }

    const unpackedBuffers: Uint8Array[] = dataBlocks.map((block, i) => {
        const len = block.byteLength;

        lz4Block.growPreDecode(len);

        const bfr = new Uint8Array(lz4Block.memory.buffer);
        bfr.set(block);

        const iOutStart = len;
        const iOutEnd   = lz4Block.decode(len);

        const origLen = iOutEnd - iOutStart;
        if (BigInt(origLen) !== origLengths[i]) console.warn("Length derived from packed buffer does not match length of decoded LZ4 buffer. There might be a risk of corruption in your buffer.");

        return bfr.slice(iOutStart, iOutEnd);
    });

    const bfrLen = unpackedBuffers.reduce((sum, bfr) => sum + bfr.byteLength, 0);

    const bfr = new Uint8Array(bfrLen);
    for (let iData: number = 0, iBfr: number = 0; iBfr < unpackedBuffers.length; iData += unpackedBuffers[iBfr]!.byteLength, iBfr++) bfr.set(unpackedBuffers[iBfr]!, iData);

    return bfr;
}
