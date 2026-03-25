export class NoModuleInitializationError extends Error {
    constructor() {
        super("LZ4 block modules were not initialized. Did you call `Lz4Block.initModules`?");
        this.name = NoModuleInitializationError.name;
    }
}
