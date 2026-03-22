/* Taken and simplified from type-fest's `Class` type */
export type RawClass<T, A extends unknown[] = any[]> = {
    new (...args: A): T;
    prototype: Pick<T, keyof T>;
};
