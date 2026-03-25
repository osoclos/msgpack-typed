import { Bfr, Uint } from "../classes";
import { Arr } from "../containers";

import { HashTableModuleImports, initHashTableModule, initLz4BlockModule, initMathModule, Lz4BlockModuleExports } from "../modules";

import { InvalidExtensionCodeError, warnMismatchedBlockCount, warnMismatchedLengthRedundancyCheck, warnModuleReinitialization } from "./errors";

import { ExtUtils } from "./ExtUtils";

let lz4Block: Lz4BlockModuleExports = <Lz4BlockModuleExports><unknown>null;

export const Lz4Block = {
    maxBlockSize: 32768, // 2 ^ 15

    get hasInitialized(): boolean {
        return lz4Block !== null
    },

    async initModules(nHashBits?: number): Promise<void> {
        if (this.hasInitialized) warnModuleReinitialization

        const math = await initMathModule();
        const hashTable = await initHashTableModule(<HashTableModuleImports>{ options: { nHashBits } });

        lz4Block = await initLz4BlockModule({ math, hashTable });
    },

    pack(data: Uint8Array): Uint8Array {
        const origLengthsAndBlocks: [number, Uint8Array][] = [];
        for (let i: number = 0, len = this.maxBlockSize; i < data.byteLength; i += len) {
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
            const bfr = new Bfr(block);
            blockBuffers.push(bfr.encode());
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
    },

    unpack(chunk: Uint8Array): Uint8Array {
        const isMultiBlock = Arr.isChunkValid(chunk);

        let extChunk: Uint8Array;
        const dataBlocks: Uint8Array[] = [];

        if (isMultiBlock) {
            const ranges = Arr.deriveIndices(chunk);

            const hasLenStartIdx = ranges.length === 4;

            const dataIndices = <number[]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];

            extChunk = chunk.subarray(dataIndices.shift());
            for (const i of dataIndices) dataBlocks.push(Bfr.decode(chunk.subarray(i)).data);
        } else {
            extChunk = chunk;

            const len = ExtUtils.deriveIndices(extChunk).slice(-1)[0]!;
            dataBlocks.push(chunk.slice(len));
        }

        const [extData, extCode] = ExtUtils.decodeRaw(extChunk);
        if (extCode !== 0x63 - +isMultiBlock /* isMultiBlock ? 0x62 : 0x63 */) throw new InvalidExtensionCodeError(extCode);

        const origLengths: bigint[] = [];
        for (let i: number = 0; i < extData.byteLength;) {
            const uintChunk = extData.subarray(i);

            const len = Uint.deriveIndices(uintChunk).slice(-1)[0]!;

            const uint = Uint.decode(uintChunk);
            origLengths.push(BigInt(uint.data));

            i += len;
        }

        if (origLengths.length !== dataBlocks.length) {
            warnMismatchedBlockCount(origLengths.length, dataBlocks.length);
            if (dataBlocks.length > origLengths.length) dataBlocks.splice(origLengths.length);
        }

        const unpackedBuffers: Uint8Array[] = dataBlocks.map((block, i) => {
            const len = block.byteLength;

            lz4Block.growPreDecode(len);

            const bfr = new Uint8Array(lz4Block.memory.buffer);
            bfr.set(block);

            const iOutStart = len;
            const iOutEnd   = lz4Block.decode(len);

            const origLen = iOutEnd - iOutStart;
            if (BigInt(origLen) !== origLengths[i]) warnMismatchedLengthRedundancyCheck();

            return bfr.slice(iOutStart, iOutEnd);
        });

        const bfrLen = unpackedBuffers.reduce((sum, bfr) => sum + bfr.byteLength, 0);

        const bfr = new Uint8Array(bfrLen);
        for (let iData: number = 0, iBfr: number = 0; iBfr < unpackedBuffers.length; iData += unpackedBuffers[iBfr]!.byteLength, iBfr++) bfr.set(unpackedBuffers[iBfr]!, iData);

        return bfr;
    },

    isUnpackable(chunk: Uint8Array): boolean {
        const isMultiBlock = Arr.isChunkValid(chunk);

        let extChunk: Uint8Array;

        if (isMultiBlock) {
            const ranges = Arr.deriveIndices(chunk);

            const hasLenStartIdx = ranges.length === 4;
            const dataIndices = <number[]>ranges[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];

            extChunk = chunk.subarray(dataIndices.shift());

            for (const i of dataIndices)
                if (!Bfr.isChunkValid(chunk.subarray(i))) return false;
        } else {
            extChunk = chunk;

            const iDataStart = ExtUtils.deriveIndices(extChunk).slice(-1)[0]!;
            if (!Bfr.isChunkValid(chunk.subarray(iDataStart))) return false;
        }

        const [, extCode] = ExtUtils.decodeRaw(extChunk);

        return extCode === 0x63 - +isMultiBlock /* isMultiBlock ? 0x62 : 0x63 */;
    }
}
