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
    minify: {
        mangle: {
            keepNames: true,
            toplevel: false
        },

        compress: {
            target: ["es2023"],

            sequences: true,
            joinVars: true,

            unused: "keep_assign",

            keepNames: {
                function: true,
                class: true
            },

            dropConsole: false,
            dropDebugger: true
        },

        codegen: { removeWhitespace: true }
    },

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
