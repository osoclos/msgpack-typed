import { defineConfig } from "vite";
import watVitePlugin from "vite-plugin-wat2wasm";

export default defineConfig({
    root: __dirname,

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
