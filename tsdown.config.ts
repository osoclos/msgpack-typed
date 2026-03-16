import { defineConfig } from "tsdown";
import watVitePlugin from "vite-plugin-wat2wasm";

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

    unbundle: true,

    plugins: [
        watVitePlugin({
            parser: {
                exceptions: true,
                mutable_globals: true,

                bulk_memory: true
            }
        })
    ]
});
