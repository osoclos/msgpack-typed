import { Bfr, Int, Uint } from "../classes";
import { Arr } from "../containers";

import { initHashTableModule, initLZ4BlockModule, initMathModule, type LZ4BlockModuleExports } from "../modules";
import { MpError } from "../internal";

import { ExtUtils } from "./ExtUtils";

let lz4Block = null as unknown as LZ4BlockModuleExports;

/** An object to enable compression and decompression of MessagePack buffers. Used by this port and the most popular C# port of MessagePack. */
export const LZ4Compression = {
    /** The maximum size for each uncompressed block of data when it is compressed */
    maxBlockSize: 8192, // 2 ^ 13

    /** Checks whether the LZ4 block modules have been initialized. */
    get hasInitialized(): boolean {
        return lz4Block !== null;
    },

    /** Initializes the modules used for the LZ4 block compression/decompression algorithms. */
    async initModules(nHashBits: number = 12): Promise<void> {
        if (this.hasInitialized) return;

        const math = await initMathModule();
        const hashTable = await initHashTableModule({ options: { nHashBits } });

        lz4Block = await initLZ4BlockModule({ math, hashTable });
    },

    /** Compresses data using the LZ4 block algorithm and converts it into a parsable MessagePack chunk. */
    pack(bfrDecoded: Uint8Array): Uint8Array {
        if (!this.hasInitialized) throw new MpError.lz4.NotInitalized("LZ4Compression", "pack");

        const blocks: Uint8Array[] = [];
        const lengthsOrig: number[] = [];

        let memLz4 = new Uint8Array();

        for (let i: number = 0, len = this.maxBlockSize; i < bfrDecoded.byteLength; i += len) {
            len = Math.min(len, bfrDecoded.byteLength - i);

            lz4Block.growPreEncode(len);
            if (memLz4.buffer !== lz4Block.memory.buffer) memLz4 = new Uint8Array(lz4Block.memory.buffer);

            memLz4.set(bfrDecoded.subarray(i, i + len));

            const iOutStart = len;
            const iOutEnd = lz4Block.encode(len);

            lengthsOrig.push(len);
            blocks.push(memLz4.slice(iOutStart, iOutEnd));
        }

        if (blocks.length === 1) {
            const block = blocks[0]!;
            const lenOrig = lengthsOrig[0]!;

            const subchunkLen = new Uint(lenOrig, Uint.value2Subtype(lenOrig)).encode();

            const payload = new Uint8Array(subchunkLen.byteLength + block.byteLength);

            payload.set(subchunkLen, 0);
            payload.set(block, subchunkLen.byteLength);

            const chunk = ExtUtils.encodeRaw(payload, 0x63);

            return chunk;
        }

        let payloadLengthsLen: number = 0;
        for (const len of lengthsOrig) payloadLengthsLen += Uint.value2LenEncoded(len);

        const subchunksLengthsOrig = new Uint8Array(payloadLengthsLen);
        for (let iPayload: number = 0, iLen: number = 0; iLen < lengthsOrig.length; iLen++) {
            const len = lengthsOrig[iLen]!;

            const uint = new Uint(len, Uint.value2Subtype(len));

            const bfrUint = uint.encode();
            subchunksLengthsOrig.set(bfrUint, iPayload);

            iPayload += bfrUint.byteLength;
        }

        const subchunkExt = ExtUtils.encodeRaw(subchunksLengthsOrig, 0x62);

        const subchunks = Array<Uint8Array>(1 + blocks.length);
        subchunks[0] = subchunkExt;

        let chunkBlocksLen: number = 0;
        for (let iBlock: number = 0, iChunk: number = 1; iBlock < blocks.length; iBlock++, iChunk++) {
            const block = blocks[iBlock]!;

            const bfr = new Bfr(block);
            const chunk = bfr.encode();

            subchunks[iChunk] = chunk;
            chunkBlocksLen += chunk.byteLength;
        }

        const header = Arr.encodeHeader(subchunks);

        const chunk = new Uint8Array(header.byteLength + subchunkExt.byteLength + chunkBlocksLen);
        chunk.set(header, 0);

        for (let iChunk = header.byteLength, iSubchunk: number = 0; iSubchunk < subchunks.length; iSubchunk++) {
            const subchunk = subchunks[iSubchunk]!;

            chunk.set(subchunk, iChunk);
            iChunk += subchunk.byteLength;
        }

        return chunk;
    },

    /** Decompresses a MessagePack chunk assumed to be packed using the LZ4 block algorithm. */
    unpack(chunk: Uint8Array): Uint8Array {
        if (!this.hasInitialized) throw new MpError.lz4.NotInitalized("LZ4Compression", "unpack");

        if (ExtUtils.isChunkValid(chunk)) {
            const payload = ExtUtils.decodeRaw(chunk)[0];

            const Num = Uint.isChunkValid(payload) ? Uint : Int;

            const indices = Num.deriveChunkIndices(payload);

            const iBlockStart = indices[indices.length - 1]!;
            const block = payload.subarray(iBlockStart);

            const len = block.byteLength;

            lz4Block.growPreDecode(len);

            const bfr = new Uint8Array(lz4Block.memory.buffer);
            bfr.set(block);

            const iOutStart = len;
            const iOutEnd   = lz4Block.decode(len);

            const lenUnpacked = iOutEnd - iOutStart;

            const lenOrig = Num.decode(payload).value as number;
            if (lenUnpacked !== lenOrig) warn("MISMATCHED_LENGTH_CHECK", lenOrig, lenUnpacked)

            return bfr.slice(iOutStart, iOutEnd);
        }

        if (Arr.isChunkValid(chunk)) {
            const indices = Arr.deriveChunkIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const iSubchunks = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */] as number[];

            const iExt = iSubchunks[0]!;
            const subchunkExt = chunk.subarray(iExt);

            const subchunksLengthsOrig = ExtUtils.decodeRaw(subchunkExt)[0];

            const lengthsOrig: number[] = [];
            let bfrLen: number = 0;

            for (let i: number = 0; i < subchunksLengthsOrig.byteLength;) {
                const subchunk = subchunksLengthsOrig.subarray(i);

                const Num = Uint.isChunkValid(subchunk) ? Uint : Int;

                const indices = Num.deriveChunkIndices(subchunk);
                const subchunkLen = indices[indices.length - 1]!;

                const lenOrig = Num.decode(subchunk).value as number;
                lengthsOrig.push(lenOrig);

                i += subchunkLen;
                bfrLen += lenOrig;
            }

            const nBlocks = iSubchunks.length - 1;
            if (nBlocks !== lengthsOrig.length) warn("MISMATCHED_DATA_BLOCK_COUNT", lengthsOrig.length, nBlocks);

            const bfrDecoded = new Uint8Array(bfrLen);
            let memLz4 = new Uint8Array();

            for (let iSubchunk: number = 1, iBfr: number = 0; iSubchunk < iSubchunks.length; iSubchunk++) {
                const subchunk = chunk.subarray(iSubchunks[iSubchunk]);

                const bfr = Bfr.decode(subchunk).value;
                const len = bfr.byteLength;

                lz4Block.growPreDecode(len);
                if (memLz4.buffer !== lz4Block.memory.buffer) memLz4 = new Uint8Array(lz4Block.memory.buffer);

                memLz4.set(bfr);

                const iOutStart = len;
                const iOutEnd   = lz4Block.decode(len);

                const lenUnpacked = iOutEnd - iOutStart;

                const lenOrig = lengthsOrig[iSubchunk - 1]!;
                if (lenUnpacked !== lenOrig) warn("MISMATCHED_LENGTH_CHECK", lenOrig, lenUnpacked);

                const block = memLz4.subarray(iOutStart, iOutEnd);

                bfrDecoded.set(block, iBfr);
                iBfr += lenUnpacked;
            }

            return bfrDecoded;
        }

        throw new MpError.IncompatibleChunk("LZ4Compression", "DECODING");
    },

    /** Checks whether a MessagePack chunk can be decompressed using the LZ4 block algorithm. */
    isUnpackable(chunk: Uint8Array): boolean {
        if (ExtUtils.isChunkValid(chunk)) {
            const resDecoded = ExtUtils.decodeRaw(chunk);

            const codeExt = resDecoded[1];
            if (codeExt !== 0x63) return false;

            const payload = resDecoded[0];

            return !!(Uint.isChunkValid(payload) || Int.isChunkValid(payload));
        }

        if (Arr.isChunkValid(chunk)) {
            const indices = Arr.deriveChunkIndices(chunk);

            const hasLenStartIdx = indices.length === 4;
            const iSubchunks = indices[1 + +hasLenStartIdx /* hasLenStartIdx ? 2 : 1 */]! as number[];

            const iExt = iSubchunks[0]!;
            const subchunkExt = chunk.subarray(iExt);

            if (!ExtUtils.isChunkValid(subchunkExt)) return false;

            const resDecodedExt = ExtUtils.decodeRaw(subchunkExt);

            const codeExt = resDecodedExt[1];
            if (codeExt !== 0x62) return false;

            const subchunksLengthsUnpacked = resDecodedExt[0];

            for (let i: number = 0; i < subchunksLengthsUnpacked.byteLength;) {
                const subchunkLen = subchunksLengthsUnpacked.subarray(i);

                const isUint = Uint.isChunkValid(subchunkLen);
                if (!isUint && !Int.isChunkValid(subchunkLen)) return false;

                const Num = isUint ? Uint : Int;

                const indices = Num.deriveChunkIndices(subchunkLen);

                const lenLen = indices[indices.length - 1]!;
                i += lenLen;
            }

            for (let iSubchunk: number = 1; iSubchunk < iSubchunks.length; iSubchunk++) {
                const i = iSubchunks[iSubchunk];

                const block = chunk.subarray(i);
                if (!Bfr.isChunkValid(block)) return false;
            }

            return true;
        }

        return false;
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
