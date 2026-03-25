import { formatNumber } from "../../internal";

export class InvalidExtensionCodeError extends TypeError {
    constructor(code: number) {
        super(`An invalid extension header code was passed into an extension that does not support it; did not expect header code (${formatNumber(code, "HEX")}).`);
        this.name = InvalidExtensionCodeError.name;
    }
}
