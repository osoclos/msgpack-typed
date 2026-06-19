import { Bfr, Int, Uint } from "../classes";
import { Arr } from "../containers";

import { initHashTableModule, initLZ4BlockModule, initMathModule, type LZ4BlockModuleExports } from "../modules";
import { MpError } from "../primitives";

import { ExtUtils } from "./ExtUtils";

let lz4Block = null as unknown as LZ4BlockModuleExports;

/** An object to enable compression and decompression of MessagePack buffers. Used by this port and the most popular C# port of MessagePack. */
export const LZ4Compression = {
    /** The maximum size for each uncompressed block of data when it is compressed */
    maxBlockSize: 32768, // 2 ^ 15

    /** Checks whether the LZ4 block modules have been initialized. */
    get hasInitialized(): boolean {
        return lz4Block !== null
    },

    /** Initializes the modules used for the LZ4 block compression/decompression algorithms. */
    async initModules(nHashBits: number = 12): Promise<void> {
        if (this.hasInitialized) return;

        const math = await initMathModule();
        const hashTable = await initHashTableModule({ options: { nHashBits } });

        lz4Block = await initLZ4BlockModule({ math, hashTable });
    },

    /** Compresses data using the LZ4 block algorithm and converts it into a parsable MessagePack chunk. */
    pack(data: Uint8Array): Uint8Array {
        if (!this.hasInitialized) throw new MpError.lz4.NotInitalized("LZ4Compression", "pack");

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
        if (!this.hasInitialized) throw new MpError.lz4.NotInitalized("LZ4Compression", "unpack");

        const isMultiBlock = Arr.isChunkValid(chunk);

        let extChunk: Uint8Array;
        const dataBlocks: Uint8Array[] = [];

        if (isMultiBlock) {
            const indices = Arr.deriveChunkIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const dataIndices = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */];

            extChunk = chunk.subarray(dataIndices.shift()!);

            for (const i of dataIndices) dataBlocks.push(Bfr.decode(chunk.subarray(i)).value);
        } else extChunk = chunk;

        const [extData, extCode] = ExtUtils.decodeRaw(extChunk);
        if (extCode !== 0x63 - +isMultiBlock /* isMultiBlock ? 0x62 : 0x63 */) throw new MpError.IncompatibleChunk("LZ4Compression", "INVALID_CODE");

        const origLengths: bigint[] = [];

        if (isMultiBlock) {
            for (let i: number = 0; i < extData.byteLength;) {
                const lenChunk = extData.subarray(i);

                const Num = Uint.isChunkValid(lenChunk) ? Uint : Int;

                const len = Num.deriveChunkIndices(lenChunk).slice(-1)[0]!;

                const num = Num.decode(lenChunk);
                origLengths.push(BigInt(num.value));

                i += len;
            }
        } else {
            const lenChunk = extData;

            const Num = Uint.isChunkValid(lenChunk) ? Uint : Int;

            const num = Num.decode(lenChunk);
            origLengths.push(BigInt(num.value));

            const iBlockStart = Num.deriveChunkIndices(extData).slice(-1)[0]!;
            const bfrChunk = extData.subarray(iBlockStart);

            dataBlocks.push(bfrChunk);
        }

        if (origLengths.length !== dataBlocks.length) {
            warn("MISMATCHED_DATA_BLOCK_COUNT", origLengths.length, dataBlocks.length);
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
            if (BigInt(origLen) !== origLengths[i]) warn("MISMATCHED_LENGTH_CHECK", Number(origLengths[i]), origLen)

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
            const indices = Arr.deriveChunkIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const dataIndices = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */];

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

function warn(code: "MISMATCHED_DATA_BLOCK_COUNT" | "MISMATCHED_LENGTH_CHECK", ...args: number[]) {
    let msg: string;
    switch (code) {
        case "MISMATCHED_DATA_BLOCK_COUNT": { msg = `Expected ${args[0]} data blocks, but received ${args[1]}.`; break; }
        case "MISMATCHED_LENGTH_CHECK": { msg = `Unpacked data block should result in ${args[0]} bytes, but received ${args[1]}.`; break; }

        default: { msg = `Unknown warning with arguments: [${args.join(", ")}]`; break; }
    }

    console.warn(msg);
}
