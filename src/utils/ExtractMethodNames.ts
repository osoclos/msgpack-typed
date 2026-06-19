import type { Constructor } from "./Constructor";

export type ExtractMethodNames<T extends Constructor<unknown> | Constructor<unknown>["prototype"]> =
    T extends Constructor<unknown>
        ? { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never; }[keyof T]
        : { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never; }[keyof T];
