(module
    ;; import N_HASH_BITS from options.nHashBits
    (global $N_HASH_BITS (import "options" "nHashBits") i32)
    (global $~TABLE_SIZE (mut i32) (i32.const -1))

    ;; _m = new Memory(initial_size: 1)
    (memory 1)

    (tag $InvalidHashBitCount)
    (tag $OutOfBoundsAccess)

    (func $__init
        ;; if N_HASH_BITS < bit_sizeof(i16):
        (i32.lt_u (global.get $N_HASH_BITS) (i32.const 16) (; bit_sizeof(i16) ;))
        (if
            (then
                ;; throw InvalidHashBitCount
                (throw $InvalidHashBitCount)
            )
        )

        ;; if N_HASH_BITS == bit_sizeof(i16) - 1: // since 15-bit hashes can have 32768 (0x0000 - 0x7fff) unique values and each value in the table takes 4 bits, 32768 * 4 > 1 64KB memory page, as such it will require growing to ensure enough space
        (i32.eq (global.get $N_HASH_BITS) (i32.const 15) (; bit_sizeof(i16) - 1 ;))
        (if
            (then
                ;; _0 = _m.grow(size: 1)
                (memory.grow (i32.const 1))

                ;; drop _0
                (drop)
            )
        )

        ;; ~TABLE_SIZE = 1 << N_HASH_BITS
        (i32.shl (i32.const 1) (global.get $N_HASH_BITS))
        (global.set $~TABLE_SIZE)
    )

    ;; func get(key: i32) -> i32:
    (func $get (param $key i32) (result i32)
        ;; _0_hash = knuth_mul_hash(n: key)
        (local.get $key)
        (call $knuth_mul_hash)

        ;; return get_raw(i: _0_hash)
        (call $get_raw)
    )

    (func $get_by_idx (param $i i32) (result i32)
        ;; if i >= TABLE_SIZE:
        (i32.ge_u (local.get $i) (global.get $~TABLE_SIZE))
        (if
            (then
                ;; throw OutOfBoundsAccess
                (throw $OutOfBoundsAccess)
            )
        )

        ;; return get_raw(i: i)
        (call $get_raw (local.get $i))
    )

    ;; func get_raw(i: i32) -> i32:
    (func $get_raw (param $i i32) (result i32)
        ;; _0_ptr = i << 3 // => i * sizeof(i32)
        (i32.shl (local.get $i) (i32.const 3))

        ;; return _m.i32(i: _0_ptr)
        (i32.load)
    )

    ;; func set(key: i32, val: i32):
    (func $set (param $key i32) (param $val i32)
        ;; _0_hash = knuth_mul_hash(n: key)
        (local.get $key)
        (call $knuth_mul_hash)

        ;; set_raw(i: _0_hash, val: val)
        (local.get $val)
        (call $set_raw)
    )

    (func $set_by_idx (param $i i32) (param $val i32)
        ;; if i >= TABLE_SIZE:
        (i32.ge_u (local.get $i) (global.get $~TABLE_SIZE))
        (if
            (then
                ;; throw OutOfBoundsAccess
                (throw $OutOfBoundsAccess)
            )
        )

        ;; return set_raw(i: i, val: val)
        (call $set_raw (local.get $i) (local.get $val))
    )

    ;; func set_raw(i: i32, val: i32) -> i32:
    (func $set_raw (param $i i32) (param $val i32)
        ;; _0_ptr = i << 3 // => i * sizeof(i32)
        (i32.shl (local.get $i) (i32.const 3))

        ;; _m.i32(i: _0_ptr, val: val)
        (local.get $val)
        (i32.store)
    )

    ;; func displace(key: i32, val: i32) -> i32:
    (func $displace (param $key i32) (param $val i32) (result i32)
        (local $hash i32)

        ;; hash = knuth_mul_hash(n: key)
        (local.get $key)

        (call $knuth_mul_hash)
        ;; {t_0} (local.set $hash)

        (local.tee $hash) (; {t_0} ;)

        ;; _0_old_val = get_raw(hash)
        (call $get_raw (; {t_0} (local.get $hash) ;))

        ;; set_raw(hash, val)
        (call $set_raw (local.get $hash) (local.get $val))

        ;; return _0_old_val
    )

    ;; func knuth_mul_hash(n: i32) -> i32:
    (func $knuth_mul_hash (param $n i32) (result i32)
        ;; KNUTH_CONSTANT = (sqrt(5) - 1) / 2.0 * I32_MAX

        ;; _0 = n * KNUTH_CONSTANT
        (i32.mul (local.get $n) (i32.const 2_654_435_769) (; KNUTH_CONSTANT ;))

        ;; _1_shift_count = bit_sizeof(i32) - N_HASH_BITS
        (i32.sub (i32.const 32) (; bit_sizeof(i32) ;) (global.get $N_HASH_BITS))

        ;; return _0 >>> _1_shift_count
        (i32.shr_u)
    )

    ;; func fill_with_byte(byte: i32):
    (func $fill_with_byte (param $byte i32)
        ;; _0_start = 0
        (i32.const 0)

        ;; _1_byte = byte
        (local.get $byte)

        ;; _2_len = _m.size << 16 // => _m.size * MEM_PAGE_SIZE
        (i32.shl (memory.size) (i32.const 16))

        ;; _m.fill(start: _0_start, byte: _1_byte, len: _2_len)
        (memory.fill)
    )

    (start $__init)

    ;; export get
    (export "get" (func $get))

    ;; export get_by_idx as getByIdx
    (export "getByIdx" (func $get_by_idx))

    ;; export set
    (export "set" (func $set))

    ;; export set_by_idx as setByIdx
    (export "setByIdx" (func $set_by_idx))

    ;; export displace
    (export "displace" (func $displace))

    ;; export fill_with_byte as fillWithByte
    (export "fillWithByte" (func $fill_with_byte))
)
