export class NullInRequiredError extends TypeError {
    constructor() {
        super("`null` was set in a wrapper which expects a required, non-nullable value. If this is intentional, make sure to allow nullable values in the wrapper.");
        this.name = NullInRequiredError.name;
    }
}
