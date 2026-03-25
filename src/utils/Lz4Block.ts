import { Bfr, Uint } from "../classes";
import { Arr } from "../containers";

import { HashTableModuleImports, initHashTableModule, initLz4BlockModule, initMathModule, Lz4BlockModuleExports } from "../modules";

import { InvalidExtensionCodeError, warnMismatchedBlockCount, warnMismatchedLengthRedundancyCheck, warnModuleReinitialization } from "./errors";

import { ExtUtils } from "./ExtUtils";

let lz4Block: Lz4BlockModuleExports = <Lz4BlockModuleExports><unknown>null;

/** An object to enable compression and decompression of MessagePack buffers. Used by this port and the most popular C# port of MessagePack. */
export const Lz4Block = {
    /** The maximum size for each uncompressed block of data when it is compressed */
    maxBlockSize: 32768, // 2 ^ 15

    /** Checks whether the LZ4 block modules have been initialized. */
    get hasInitialized(): boolean {
        return lz4Block !== null
    },

    /** Initializes the modules used for the LZ4 block compression/decompression algorithms. */
    async initModules(nHashBits?: number): Promise<void> {
        if (this.hasInitialized) warnModuleReinitialization

        const math = await initMathModule();
        const hashTable = await initHashTableModule(<HashTableModuleImports>{ options: { nHashBits } });

        lz4Block = await initLz4BlockModule({ math, hashTable });
    },

    /** Compresses data using the LZ4 block algorithm and converts it into a parsable MessagePack chunk. */
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

        const extCode = 0x62 + +isSingleBlock /* isSingleBlock ? 0x63 : 0x62 */;

        if (isSingleBlock) {
            const [, block] = origLengthsAndBlocks[0]!;

            const preCompressionBfr = extBuffers[0]!;

            const iBlockStart = preCompressionBfr.byteLength;
            const extDataLen = iBlockStart + block.byteLength;

            const extData = new Uint8Array(extDataLen);

            extData.set(preCompressionBfr, 0);
            extData.set(block, iBlockStart);

            const chunk = ExtUtils.encodeRaw(extData, extCode);

            return chunk;
        }

        const extDataLen = extBuffers.reduce((len, bfr) => len + bfr.byteLength, 0);

        const extData = new Uint8Array(extDataLen);
        for (let iData: number = 0, iBfr: number = 0; iBfr < extBuffers.length; iData += extBuffers[iBfr]!.byteLength, iBfr++) extData.set(extBuffers[iBfr]!, iData);

        const extChunk = ExtUtils.encodeRaw(extData, extCode);

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

    /** Decompresses a MessagePack chunk assumed to be packed using the LZ4 block algorithm. */
    unpack(chunk: Uint8Array): Uint8Array {
        const isMultiBlock = Arr.isChunkValid(chunk);

        let extChunk: Uint8Array;
        const dataBlocks: Uint8Array[] = [];

        if (isMultiBlock) {
            const indices = Arr.deriveIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const dataIndices = <number[]>indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];

            extChunk = chunk.subarray(dataIndices.shift()!);

            for (const i of dataIndices) dataBlocks.push(Bfr.decode(chunk.subarray(i)).data);
        } else extChunk = chunk;

        const [extData, extCode] = ExtUtils.decodeRaw(extChunk);
        if (extCode !== 0x63 - +isMultiBlock /* isMultiBlock ? 0x62 : 0x63 */) throw new InvalidExtensionCodeError(extCode);

        const origLengths: bigint[] = [];

        if (isMultiBlock) {
            for (let i: number = 0; i < extData.byteLength;) {
                const uintChunk = extData.subarray(i);

                const len = Uint.deriveIndices(uintChunk).slice(-1)[0]!;

                const uint = Uint.decode(uintChunk);
                origLengths.push(BigInt(uint.data));

                i += len;
            }
        } else {
            const uintChunk = extData;

            const uint = Uint.decode(uintChunk);
            origLengths.push(BigInt(uint.data));

            const iBlockStart = Uint.deriveIndices(extData).slice(-1)[0]!;
            const bfrChunk = extData.subarray(iBlockStart);

            dataBlocks.push(bfrChunk);
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

    /** Checks whether a MessagePack chunk can be decompressed using the LZ4 block algorithm. */
    isUnpackable(chunk: Uint8Array): boolean {
        const isMultiBlock = Arr.isChunkValid(chunk);

        let extChunk: Uint8Array;

        if (isMultiBlock) {
            const indices = Arr.deriveIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const dataIndices = <number[]>indices[<typeof hasLenStartIdx extends true ? 2 : 1>(1 + +hasLenStartIdx)];

            extChunk = chunk.subarray(dataIndices.shift());

            if (!ExtUtils.isChunkValid(extChunk)) return false;

            for (const i of dataIndices)
                if (!Bfr.isChunkValid(chunk.subarray(i))) return false;
        } else {
            extChunk = chunk;
            if (!ExtUtils.isChunkValid(extChunk)) return false;
        }

        const [, extCode] = ExtUtils.decodeRaw(extChunk);

        return extCode === 0x63 - +isMultiBlock /* isMultiBlock ? 0x62 : 0x63 */;
    }
};
