import { makeValueReadable } from "../../internal";

export class NonEncodableChunkError extends TypeError {
    constructor(data: unknown, maxDepth?: number) {
        super(`Unable to encode data as it is not supported by MessagePack; did not expect value (${makeValueReadable(data, maxDepth)}).`);
        this.name = NonEncodableChunkError.name;
    }
}
