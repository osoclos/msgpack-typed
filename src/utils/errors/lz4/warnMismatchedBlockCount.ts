export function warnMismatchedBlockCount(nExpected: number, nActual: number) {
    console.warn(`Expected ${nExpected} data blocks, but received ${nActual}. Data may be truncated or corrupted.`);
}
