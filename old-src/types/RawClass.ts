export interface RawClass<T, A extends any[]> extends Function { new (...args: A): T; }
