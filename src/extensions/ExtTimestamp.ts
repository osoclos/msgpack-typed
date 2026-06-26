import { MpError } from "../internal";
import { Ext } from "./Ext";

/** An extension to support timestamps in MessagePack. */
export class ExtTimestamp extends Ext<typeof Timestamp | DateConstructor, -1> {
    /** Creates an extension to allow timestamps and `Date` objects to be parsed as MessagePack chunks. */
    constructor() {
        super([-1]);
    }

    /**
      * Encodes a timestamp which can be used to generate a MessagePack chunk.
      *
      * @param value the timestamp to encode
      * @return a tuple of the payload and the extension code to be used to create an extension MessagePack chunk.
      *
      */
    override encode(date: Timestamp | Date): [Uint8Array, -1] {
        if (date instanceof Date) date = new Timestamp(date);

        const epochSecs = date.epochSecs;
        const nanoseconds = date.nanoseconds;

        let nBytes: number;

        computeByteCount: {
            if (nanoseconds === 0n && 0n <= epochSecs && epochSecs <= 0xffff_ffffn) { nBytes = 4; break computeByteCount; }
            if (0n <= epochSecs && epochSecs <= 0x0000_0003_ffff_ffffn) { nBytes = 8; break computeByteCount; }
            if (0n <= nanoseconds && nanoseconds <= 1_000_000_000n && -0x8000_0000_0000_0000n <= epochSecs && epochSecs <= 0x7fff_ffff_ffff_ffffn) { nBytes = 12; break computeByteCount; }

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
                const payload = nanoseconds << 34n | epochSecs;

                view.setBigUint64(0, payload);
                break;
            }

            case 12: {
                view.setUint32(0, Number(nanoseconds));
                view.setBigInt64(4, epochSecs);

                break;
            }
        }

        return [bfr, -1];
    }

    /**
      * Decodes an appropriate MessagePack chunk into a timestamp via a payload and the extension code from the chunk.
      *
      * @param payload the payload of the extension MessagePack chunk
      * @param _code the extension code
      *
      * @return the timestamp parsed from the payload
      *
      */
    override decode(payload: Uint8Array, _code: -1): Timestamp {
        const view = new DataView(payload.buffer);

        switch (payload.byteLength) {
            case 4: {
                const epochSecs = view.getUint32(0);
                return new Timestamp(epochSecs);
            }

            case 8: {
                const payload = view.getBigUint64(0);

                const nanoseconds = payload >> 34n;
                const epochSecs = payload & 0x0000_0003_ffff_ffffn;

                return new Timestamp(epochSecs, nanoseconds);
            }

            case 12: {
                const nanoseconds = view.getUint32(0);
                const epochSecs = view.getBigInt64(4);

                return new Timestamp(epochSecs, nanoseconds);
            }
        }

        throw new Error("Invalid buffer length for `TimestampExt`.");
    }

    /**
      * Checks if a value is valid and can be encoded by this extension.
      *
      * @param value the value to check
      * @return whether the value can be encoded
      *
      */
    override isEncodable(value: unknown): value is Timestamp | Date {
        return value instanceof Timestamp || value instanceof Date;
    }

    override get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

/** A helper class to easily include timestamps in MessagePack chunks. */
export class Timestamp implements ImplTimestamp {
    #epochSecs: bigint;
    #nanoseconds: bigint;

    /**
      * Creates a timestamp object from time-based values since the Unix epoch
      *
      * @param epochSecs the number of seconds since the Unix epoch
      * @param nanoseconds the number of nanoseconds since the last second
      *
      */
    constructor(epochSecs?: number | bigint, nanoseconds?: number | bigint);

    /**
      * Convert a Date object into a timestamp since the Unix epoch
      * @param date the Date object to convert from
      *
      */
    constructor(date: Date);

    constructor(a?: number | bigint | Date, b?: number | bigint) {
        let epochSecs: bigint;
        let nanoseconds: bigint;

        if (a instanceof Date) {
            const date = a;

            const epochMs = BigInt(date.getTime());

            epochSecs = (epochMs < 0n ? (epochMs - 999n) : epochMs) / 1000n;
            nanoseconds = (epochMs - epochSecs * 1000n) * 1_000_000n;
        } else {
            epochSecs = a === undefined ? 0n : BigInt(a);
            nanoseconds = b === undefined ? 0n : BigInt(b);
        }

        this.#epochSecs = epochSecs;
        this.#nanoseconds = nanoseconds;
    }

    /** How many seconds since the Unix epoch at this point of time */
    get epochSecs(): bigint {
        return this.#epochSecs;
    }

    set epochSecs(epochSecs: bigint) {
        if (epochSecs < -0x8000_0000_0000_0000n || epochSecs > 0x7fff_ffff_ffff_ffffn) throw new MpError.InvalidValue("ExtTimestamp", "ASSIGNMENT");
        this.#epochSecs = epochSecs;
    }

    /** How many nanoseconds since the last second at this point of time */
    get nanoseconds(): bigint {
        return this.#nanoseconds;
    }

    set nanoseconds(nanoseconds: bigint) {
        this.#epochSecs += nanoseconds / 1_000_000_000n;
        nanoseconds %= 1_000_000_000n;

        if (nanoseconds < 0n) {
            nanoseconds += 1_000_000_000n;
            this.#epochSecs -= 1n;
        }
    }

    /**
      * Converts this timestamp into a Date object.
      * @returns the Date object
      *
      */
    toDate(): Date {
        return new Date(Number(this.#epochSecs * 1000n) + Math.trunc(Number(this.#nanoseconds / 1_000_000n)));
    }

    /**
      * Converts this timestamp into the number of milliseconds since the Unix epoch.
      * @returns the number of milliseconds
      *
      */
    valueOf(): number {
        return this.toDate().getTime();
    }

    /**
      * Converts this timestamp into an ISO-formatted date string.
      * @returns the formatted string
      *
      */
    toString(): string {
        return this.toDate().toISOString();
    }

    /**
      * Converts this timestamp into a JSON object.
      * @returns the JSON object
      *
      */
    toJSON(): ImplTimestamp {
        return {
            epochSecs: this.#epochSecs,
            nanoseconds: this.#nanoseconds
        };
    }
}

/** An interface implementation of a timestamp. */
export interface ImplTimestamp {
    /** How many seconds since the Unix epoch at this point of time */
    epochSecs: bigint;

    /** How many nanoseconds since the last second at this point of time */
    nanoseconds: bigint;
}
