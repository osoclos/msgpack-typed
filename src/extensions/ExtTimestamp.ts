import { MpError } from "../internal";
import { Ext } from "./Ext";

/** An extension to support timestamps in MessagePack. */
export class ExtTimestamp extends Ext<typeof Timestamp, -1> {
    /** Creates an extension to allow Date objects to be parsed as MessagePack chunks. */
    constructor() {
        super([-1]);
    }

    override encode(date: Timestamp): [Uint8Array, -1] {
        const epochSecs = date.epochSecs;
        const epochNs = date.epochNs;

        let nBytes: number;

        computeByteCount: {
            if (epochNs === 0n && 0n <= epochSecs && epochSecs <= 0xffff_ffffn) { nBytes = 4; break computeByteCount; }
            if (0n <= epochSecs && epochSecs <= 0x0000_0003_ffff_ffffn) { nBytes = 8; break computeByteCount; }
            if (0n <= epochNs && epochNs <= 1_000_000_000n && -0x8000_0000_0000_0000n <= epochSecs && epochSecs <= 0x7fff_ffff_ffff_ffffn) { nBytes = 12; break computeByteCount; }

            throw new MpError.InvalidValue("ExtTimestamp", "ASSIGNMENT");
        }

        const bfr = new Uint8Array(nBytes);
        const view = new DataView(bfr.buffer);

        switch (nBytes) {
            case 4: {
                view.setUint32(0, Number(epochSecs));
                break;
            }

            case 8: {
                const payload = epochNs << 34n | epochSecs;

                view.setBigUint64(0, payload);
                break;
            }

            case 12: {
                view.setUint32(0, Number(epochNs));
                view.setBigInt64(4, epochSecs);

                break;
            }
        }

        return [bfr, -1];
    }

    override decode(bfr: Uint8Array, _code: -1): Timestamp {
        const view = new DataView(bfr.buffer);

        switch (bfr.byteLength) {
            case 4: {
                const epochSecs = view.getUint32(0);
                return new Timestamp(epochSecs);
            }

            case 8: {
                const payload = view.getBigUint64(0);

                const epochNs = payload >> 34n;
                const epochSecs = payload & 0x0000_0003_ffff_ffffn;

                return new Timestamp(epochSecs, epochNs);
            }

            case 12: {
                const epochNs = view.getUint32(0);
                const epochSecs = view.getBigInt64(4);

                return new Timestamp(epochSecs, epochNs);
            }
        }

        throw new Error("Invalid buffer length for `TimestampExt`.");
    }

    override isEncodable(value: unknown): value is Timestamp {
        return value instanceof Timestamp;
    }

    override get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

export class Timestamp implements ImplTimestamp {
    #epochSecs: bigint;
    #epochNs: bigint;

    constructor(epochSecs?: number | bigint, epochNs?: number | bigint);
    constructor(date: Date);
    constructor(a?: number | bigint | Date, b?: number | bigint) {
        let epochSecs: bigint;
        let epochNs: bigint;

        if (a instanceof Date) {
            const date = a;

            const epochMs = BigInt(date.getTime());

            epochSecs = (epochMs < 0n ? (epochMs - 999n) : epochMs) / 1000n;
            epochNs = (epochMs - epochSecs * 1000n) * 1_000_000n;
        } else {
            epochSecs = a === undefined ? 0n : BigInt(a);
            epochNs = b === undefined ? 0n : BigInt(b);
        }

        this.#epochSecs = epochSecs;
        this.#epochNs = epochNs;
    }

    get epochSecs(): bigint {
        return this.#epochSecs;
    }

    set epochSecs(epochSecs: bigint) {
        if (epochSecs < -0x8000_0000_0000_0000n || epochSecs > 0x7fff_ffff_ffff_ffffn) throw new MpError.InvalidValue("ExtTimestamp", "ASSIGNMENT");
        this.#epochSecs = epochSecs;
    }

    get epochNs(): bigint {
        return this.#epochNs;
    }

    set epochNs(epochNs: bigint) {
        this.#epochSecs += epochNs / 1_000_000_000n;
        epochNs %= 1_000_000_000n;

        if (epochNs < 0n) {
            epochNs += 1_000_000_000n;
            this.#epochSecs -= 1n;
        }
    }

    toDate(): Date {
        return new Date(Number(this.#epochSecs * 1000n) + Math.trunc(Number(this.#epochNs / 1_000_000n)));
    }

    valueOf(): number {
        return this.toDate().getTime();
    }

    toString(): string {
        return this.toDate().toISOString();
    }

    toJSON(): ImplTimestamp {
        return {
            epochSecs: this.#epochSecs,
            epochNs: this.#epochNs
        };
    }
}

export interface ImplTimestamp {
    epochSecs: bigint;
    epochNs: bigint;
}
