export function warnTruncatedChunk() {
    console.warn("Chunk buffer does not contain sufficient data for proper decoding. Was the chunk truncated before it was passed in?");
}
