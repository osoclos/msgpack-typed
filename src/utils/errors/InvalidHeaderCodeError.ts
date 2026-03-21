import { formatNumber } from "../../internal";

export class InvalidHeaderCodeError extends TypeError {
    constructor(code: number) {
        super(`An invalid chunk header code was passed into a wrapper that does not support it; unexpected header code \`0x${formatNumber(code, "HEX")}\`.`);
        this.name = InvalidHeaderCodeError.name;
    }
}
