export class TruncationCannotProceedError extends Error {
    constructor() {
        super("The chunk being read by the container cannot proceed with reading as the chunk is truncated.");
        this.name = TruncationCannotProceedError.name;
    }
}
