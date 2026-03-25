export class MissingHeaderCodeError extends Error {
    constructor() {
        super("Unable to retrieve the chunk header code from a chunk buffer.");
        this.name = MissingHeaderCodeError.name;
    }
}
