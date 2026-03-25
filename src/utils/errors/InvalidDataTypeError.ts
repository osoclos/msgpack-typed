import { makeValueReadable } from "../../internal";

export class InvalidDataTypeError extends TypeError {
    constructor(data: unknown, maxDepth?: number) {
        super();

        this.name = InvalidDataTypeError.name;
        this.message = `An invalid value type was passed into the wrapper; did not expect value (${makeValueReadable(data, maxDepth)}).`;
    }
}
