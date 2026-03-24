export type ReplaceSubtype<T, A, B> =
    T extends A
        ? B :
    T extends Map<infer K, infer V>
        ? Map<ReplaceSubtype<K, A, B>, ReplaceSubtype<V, A, B>> :
    T extends Set<infer U>
        ? Set<ReplaceSubtype<U, A, B>> :
    T extends (infer U)[]
        ? ReplaceSubtype<U, A, B>[] :
    T extends object
        ? { [K in keyof T]: ReplaceSubtype<T[K], A, B>; }
        : T;
