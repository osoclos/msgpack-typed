export class MissingHeaderCodeError extends TypeError {
    constructor() {
        super("Unable to retrieve the chunk header code of the given chunk.");
        this.name = MissingHeaderCodeError.name;
    }
}
