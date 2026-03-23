export class NoDecodableChunkError extends TypeError {
    constructor() {
        super("Unable to decode chunk as it is not supported by this extension.");
        this.name = NoDecodableChunkError.name;
    }
}
