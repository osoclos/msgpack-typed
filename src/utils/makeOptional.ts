import { MpClassInterface } from "../types";

/** Make a wrapper nullable (requires type coercion or assignment to another variable for correct type completion) */
export function makeOptional<T>(wrapper: MpClassInterface<T, boolean>): MpClassInterface<T | null, true> {
    (<any>wrapper)["isOptional"] = true;
    return <any>wrapper;
}
