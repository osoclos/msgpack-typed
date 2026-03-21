import { MpClassInterface } from "../types";

export function makeRequired<T>(wrapper: MpClassInterface<T, boolean>): MpClassInterface<T, false> {
    (<any>wrapper)["isOptional"] = false;
    wrapper.data = wrapper.default;

    return <any>wrapper;
}
