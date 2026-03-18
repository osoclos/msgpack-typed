import { Slice, Uint } from "../classes";
import { Arr } from "../containers";

import { Lz4BlockModuleExports } from "../modules";

import { ExtUtils } from "./ExtUtils";

/** Compresses a buffer using the LZ4 block algorithm. Only compatible with this port of MessagePack and the MessagePack C# port. */
export function mpLz4Pack(lz4Block: Lz4BlockModuleExports, data: Uint8Array, maxBlockSize: number = 8192 /* 2 ^ 13 */): Uint8Array {
    const origLengthsAndBlocks: [number, Uint8Array][] = [];
    for (let i: number = 0, len = maxBlockSize; i < data.byteLength; i += len) {
        len = Math.min(len, data.byteLength - i);

        lz4Block.growPreEncode(len);

        const bfr = new Uint8Array(lz4Block.memory.buffer);
        bfr.set(data.subarray(i, i + len));

        const iOutStart = len;
        const iOutEnd   = lz4Block.encode(len);

        origLengthsAndBlocks.push([len, bfr.slice(iOutStart, iOutEnd)]);
    }

    const isSingleBlock = origLengthsAndBlocks.length === 1;

    const extBuffers: Uint8Array[] = [];

    for (const [len] of origLengthsAndBlocks) {
        const uint = new Uint(len);
        extBuffers.push(uint.encode());
    }

    const extCode = isSingleBlock ? 0x63 : 0x62;

    const extDataLen = extBuffers.reduce((len, bfr) => len + bfr.byteLength, 0);

    const extData = new Uint8Array(extDataLen);
    for (let iData: number = 0, iBfr: number = 0; iBfr < extBuffers.length; iData += extBuffers[iBfr]!.byteLength, iBfr++) extData.set(extBuffers[iBfr]!, iData);

    const extChunk = ExtUtils.encodeRaw(extData, extCode);

    if (isSingleBlock) {
        const [, block] = origLengthsAndBlocks[0]!;

        const iBlockStart = extChunk.byteLength;

        const chunkLen = iBlockStart + block.byteLength;
        const chunk = new Uint8Array(chunkLen);

        chunk.set(extChunk, 0);
        chunk.set(block   , iBlockStart);

        return chunk;
    }

    const blockBuffers: Uint8Array[] = [];
    for (const [, block] of origLengthsAndBlocks) {
        const slice = new Slice(block);
        blockBuffers.push(slice.encode());
    }

    const blockBufferLen = blockBuffers.reduce((len, bfr) => len + bfr.byteLength, 0);

    const header = Arr.encodeHeader([extChunk, ...blockBuffers]);

    const iExtStart = header.byteLength;
    const iBlocksStart = iExtStart + extChunk.byteLength;

    const chunkLen = iBlocksStart + blockBufferLen;
    const chunk = new Uint8Array(chunkLen);

    chunk.set(header, 0);
    chunk.set(extChunk, iExtStart);

    for (let iChunk = iBlocksStart, iBlock: number = 0; iBlock < blockBuffers.length; iChunk += blockBuffers[iBlock]!.byteLength, iBlock++) chunk.set(blockBuffers[iBlock]!, iChunk);

    return chunk;
}
