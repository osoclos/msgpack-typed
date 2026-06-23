export type Constructor<T> = {
    new (...args: any[]): T;
    prototype: Pick<T, keyof T>;
};

export type ConstructorChild<T extends Constructor<unknown>["prototype"]> = {
    new (...args: any[]): T;
    prototype: Pick<T, keyof T>;
};
