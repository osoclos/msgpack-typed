export class NullInRequiredError extends TypeError {
    constructor() {
        super("Tried to store null as a value in a non-nullable wrapper. If this is intentional, make sure to mark the wrapper as nullable.");
        this.name = NullInRequiredError.name;
    }
}
