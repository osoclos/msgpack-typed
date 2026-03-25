export function warnModuleReinitialization() {
    console.warn("LZ4 block modules are reinitialized again. Did you call `Lz4Block.initModules` more than once?");
}
