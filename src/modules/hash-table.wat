(module
    ;; import options.nHashBits as N_HASH_BITS
    (global $N_HASH_BITS (import "options" "nHashBits") i32)

    ;; _m = new Memory(initial_size = 1)
    (memory $_m 1)

    (tag $InvalidHashBitCount)
    (tag $CannotGrowMemory)

    (start $__init)
    (func $__init
        (local $shift_count i32)

        ;; if N_HASH_BITS > 20: throw InvalidHashBitCount
        (if (i32.ge_u (global.get $N_HASH_BITS) (i32.const 20))
            (then
                (throw $InvalidHashBitCount)
            )
        )

        ;; shift_count = N_HASH_BITS - 14 // => N_HASH_BITS - log2(MEM_PAGE_SIZE / 4) + log2(sizeof(i32))
        (local.tee $shift_count (i32.sub (global.get $N_HASH_BITS) (i32.const 14)))

        ;; if <bool>(shift_count >>> 31) /* shift_count < 0 */:
        (if (i32.shr_u (; shift_count ;) (i32.const 31))
            (then
                (return)
            )
        )

        ;; _0_page_delta = 1 << shift_count
        (i32.shl (i32.const 1) (local.get $shift_count))

        ;; _0_mem_result = _m.grow(size = _0_page_delta)
        (memory.grow (; _0_page_delta ;))

        ;; if (_0_mem_result == -1): throw CannotGrowMemory
        (if (i32.eq (; _0_mem_result ;) (i32.const -1))
            (then
                (throw $CannotGrowMemory)
            )
        )
    )

    ;; func get(key: i32) -> i32:
    (func $get (param $key i32) (result i32)
        ;; _0_hash = knuth_mul_hash(n = key)
        (call $knuth_mul_hash (local.get $key))

        ;; return get_by_idx(i = _0_hash)
        (call $get_by_idx (; _0_hash ;))
    )

    ;; func get_by_idx(i: i32) -> i32:
    (func $get_by_idx (param $i i32) (result i32)
        ;; return _m.i32(i = i << 2 /* i * sizeof(i32) */)
        (i32.load (i32.shl (local.get $i) (i32.const 2)))
    )

    ;; func get(key: i32, item: i32):
    (func $set (param $key i32) (param $item i32)
        ;; _0_hash = knuth_mul_hash(n = key)
        (call $knuth_mul_hash (local.get $key))

        ;; return set_by_idx(i = _0_hash, item = item)
        (call $set_by_idx (; _0_hash ;) (local.get $item))
    )

    ;; func set_by_idx(i: i32, item: i32):
    (func $set_by_idx (param $i i32) (param $item i32)
        ;; return _m.i32(i = i << 2 /* i * sizeof(i32) */, item = item)
        (i32.store (i32.shl (local.get $i) (i32.const 2)) (local.get $item))
    )

    ;; func displace(key: i32, new_item: i32) -> i32:
    (func $displace (param $key i32) (param $new_item i32) (result i32)
        (local $hash i32)

        ;; hash = knuth_mul_hash(n = key)
        (local.tee $hash (call $knuth_mul_hash (local.get $key)))

        ;; _0_old_item = get_by_idx(i = hash)
        (call $get_by_idx (; hash ;))

        ;; set_by_idx(i = hash, item = new_item)
        (call $set_by_idx (local.get $hash) (local.get $new_item))

        ;; return _0_old_item
        (; _0_old_item ;)
    )

    ;; func knuth_mul_hash(n: i32) -> i32:
    (func $knuth_mul_hash (param $n i32) (result i32)
        ;; _0 = n * KNUTH_CONST // => KNUTH_CONST == 2_654_435_769 == (sqrt(5) - 1) / 2.0 * I32_MAX
        (i32.mul (local.get $n) (i32.const 2_654_435_769))

        ;; return _0 >>> (32 - N_HASH_BITS)
        (i32.shr_u (; _0 ;) (i32.sub (i32.const 32) (global.get $N_HASH_BITS)))
    )

    ;; func fill_memory(byte: i32):
    (func $fill_memory (param $byte i32)
        ;; _m.fill(dest = 0, byte = byte, len = 1 << (N_HASH_BITS + 2 /* log2(sizeof(i32)) */)
        (memory.fill (i32.const 0) (local.get $byte) (i32.shl (i32.const 1) (i32.add (global.get $N_HASH_BITS) (i32.const 2))))
    )

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

    ;; export fill_memory as fillMemory
    (export "fillMemory" (func $fill_memory))
)
