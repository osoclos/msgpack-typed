export function warnTruncatedChunk() {
    console.warn("Chunk buffer has insufficient data to be decoded. Was the chunk truncated?");
}
