export function warnMismatchedLengthRedundancyCheck() {
    console.warn("Redundancy check of original uncompressed block size does not match decompressed size from compressed block. Data may be truncated or corrupted.");
}
