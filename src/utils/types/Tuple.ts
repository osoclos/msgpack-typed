export type Tuple<T, L extends number, _A extends T[] = []> = _A["length"] extends L ? _A : Tuple<T, L, [..._A, T]>;
