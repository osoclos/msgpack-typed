import { MpClassInterface } from "../types";

export function makeOptional<T>(wrapper: MpClassInterface<T, boolean>): MpClassInterface<T | null, true> {
    (<any>wrapper)["isOptional"] = true;
    return <any>wrapper;
}
