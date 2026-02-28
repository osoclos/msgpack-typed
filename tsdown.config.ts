import { defineConfig } from "tsdown";

export default defineConfig({
    entry: "src/index.ts",
    format: "esm",

    fixedExtension: true,
    outExtensions() {
        return {
            js: ".js",
            dts: ".d.ts"
        }
    },

    tsconfig: "tsconfig.lib.json",

    dts: true,
    sourcemap: true,

    clean: true,
    minify: true,

    unbundle: true
});
