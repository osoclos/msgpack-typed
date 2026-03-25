import { MpClassInterface } from "../types";

/** Make a wrapper non-nullable (requires type coercion or assignment to another variable for correct type completion) */
export function makeRequired<T>(wrapper: MpClassInterface<T, boolean>): MpClassInterface<T, false> {
    (<any>wrapper)["isOptional"] = false;
    wrapper.reset();

    return <any>wrapper;
}
