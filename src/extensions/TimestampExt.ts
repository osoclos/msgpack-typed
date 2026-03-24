import { Ext } from "../classes";

/** An extension to support timestamps in MessagePack. */
export class TimestampExt extends Ext<DateConstructor, -1> {
    /** Creates an extension to allow Date objects to be parsed as MessagePack chunks. */
    constructor() {
        super(-1, Date);
    }

    override encode(date: Date): [Uint8Array, -1] {
        const epochMs = date.getTime();
        const epochSecs = (epochMs / 1000) >>> 0;

        if (epochMs % 1000 === 0 && epochSecs <= 0xffff_ffff) {
            const bfr = new Uint8Array(4);

            let tmpEpochSecs = epochSecs;
            for (let i: number = 0; i < 4; i++) {
                bfr[i] = tmpEpochSecs & 0xff;
                tmpEpochSecs >>>= 8;
            }

            return [bfr, -1];
        }

        let tmpEpochNs = ((epochMs % 1000) * 1_000_000) & 0xffff_ffff;
        let tmpEpochSecs = epochSecs;

        const canBe64Bit = epochSecs <= 0x0000_0003_ffff_ffff;

        const bfr = new Uint8Array(canBe64Bit ? 8 : 12);

        let i: number = 0;
        for (; i < (canBe64Bit ? 3 : 4); i++) {
            bfr[i] = tmpEpochNs & 0xff;
            tmpEpochNs >>>= 8;
        }

        if (canBe64Bit) {
            tmpEpochSecs <<= 6;
            tmpEpochSecs |= tmpEpochNs;
        }

        for (; i < bfr.byteLength; i++) {
            bfr[i] = tmpEpochSecs & 0xff;
            tmpEpochSecs >>>= 8;
        }

        return [bfr, -1];
    }

    override decode<D extends Date>(bfr: Uint8Array, _code: -1): D {
        switch (bfr.byteLength) {
            case 4: {
                let epochSecs: number = 0;
                for (let i: number = 0; i < 4; i++) epochSecs |= bfr[i]! << (8 * i);

                const epochMs = epochSecs * 1000;

                return <D>new Date(epochMs);
            }

            case 8:
            case 12: {
                const is64Bit = bfr.byteLength === 8;

                let epochNs: number = 0;

                let i: number = 0;
                for (let nBytes: number = 0; i < (is64Bit ? 3 : 4); i++) epochNs |= bfr[i]! << (8 * nBytes);

                if (is64Bit) epochNs |= (bfr[i]! & 0xfc) << (8 * i);

                let epochSecs: number = 0;
                if (is64Bit) epochSecs |= bfr[i]! & 0x03;

                for (let nBytes: number = 0; i < (is64Bit ? 8 : 12); i++) epochSecs |= bfr[i]! << (8 * nBytes + 2);

                const epochMs = epochSecs * 1000 + ((epochNs / 1_000_000) % 1000) >>> 0;
                return <D>new Date(epochMs);
            }

            default: throw new Error("Invalid buffer length for `TimestampExt`.");
        }
    }
}
