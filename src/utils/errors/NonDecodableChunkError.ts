export class NonDecodableChunkError extends TypeError {
    constructor() {
        super("Unable to decode chunk as it is not supported by this extension.");
        this.name = NonDecodableChunkError.name;
    }
}
