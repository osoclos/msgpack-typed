(module
    ;; import math.minUnsigned as math|min_unsigned
    (import "math" "minUnsigned" (func $math|min_unsigned (param $a i32) (param $b i32) (result i32)))

    ;; import hash-table.displace as hash-table|displace
    (import "hashTable" "displace" (func $hash-table|displace (param $key i32) (param $val i32) (result i32)))

    ;; import hash-table.fillWithByte as hash-table|fill_with_byte
    (import "hashTable" "fillWithByte" (func $hash-table|fill_with_byte (param $byte i32)))

    ;; _m = new Memory(initial_size: 1)
    (memory $_m 1)

    (tag $CannotGrowMemory)

    ;; func encode(len: i32) -> i32:
    (func $encode (param $len i32) (result i32)
        (local $p_in  i32)
        (local $p_out i32)

        (local $p_anchor i32)

        (local $header_token i32)

        (local $sequence i32)

        (local $p_match i32)
        (local $match_len i32)

        (local $literal_len i32)

        (local $eff_match_len i32)
        (local $offset i32)

        (local $t_0 i32)

        ;; hash-table|fill_with_byte(I8_MAX) // reset all of the values in the hash table with I8_MAX, which will set the last bit of an i32.
        (call $hash-table|fill_with_byte (i32.const 0xff (; I8_MAX ;)))

        ;; p_in = 0
        (local.set $p_in (i32.const 0))

        ;; p_out = len
        (local.set $p_out (local.get $len))

        ;; p_anchor = p_in
        (local.set $p_anchor (local.get $p_in))

        ;; _l0 = while true:
        (block $_l0_break
            (loop $_l0_continue
                ;; _0_encodable_len = len - MIN_MATCH
                (i32.sub (local.get $len) (i32.const 4) (; MIN_MATCH ;))

                ;; if _0_encodable_len < p_in: break _l0
                (local.get $p_in)

                (i32.lt_u)
                (br_if $_l0_break)

                ;; sequence = _m.i32(i: p_in)
                (i32.load (local.get $p_in))
                (local.tee $sequence) (; {t_0} ;)
                ;; {t_0} (local.set $sequence)

                ;; p_match = hash-table|displace(key: sequence, val: p_in)
                (call $hash-table|displace (; {t_0} (local.get $sequence) ;) (local.get $p_in))
                ;; {t_0} (local.set $p_match)

                (local.tee $p_match) (; {t_0} ;)

                ;; _0 = <bool>(p_match >>> bit_sizeof(i32) - 1) // => p_match < 0
                (i32.shr_u (; {t_0} (local.get $p_match) ;) (i32.const 31) (; bit_sizeof(i32) - 1 ;))

                ;; offset = p_in - p_match
                (i32.sub (local.get $p_in) (local.get $p_match))

                ;; {t_0} (local.set $offset)
                (local.tee $offset) (; {t_0} ;)

                ;; _1 = offset > I16_MAX
                (i32.gt_s (; {t_0} (local.get $offset) ;) (i32.const 0xffff) (; I16_MAX ;))

                ;; _0 = _0 || _1
                (i32.or)

                ;; _1 = _m.i32(i: p_match)
                (i32.load (local.get $p_match))

                ;; _1 = _1 != sequence
                (local.get $sequence)
                (i32.ne)

                ;; if _0 || _1:
                (i32.or)
                (if
                    (then
                        ;; p_in++
                        (i32.add (local.get $p_in) (i32.const 1))
                        (local.set $p_in)

                        (br $_l0_continue)
                    )
                )

                ;; match_len = MIN_MATCH
                (local.set $match_len (i32.const 4) (; MIN_MATCH ;))

                ;; compute_match_len = while true:
                (block $compute_match_len_break
                    (loop $compute_match_len_continue
                        ;; p_curr = p_in + match_len
                        (i32.add (local.get $p_in) (local.get $match_len))
                        ;; {t_0} (local.set $compute_match_len_p_curr)

                        (local.tee $t_0) (; {t_0} ;)

                        ;; _0 = p_curr >= len
                        (i32.ge_u (; {t_0} (local.get $compute_match_len_p_curr) ;) (local.get $len))

                        ;; _1 = _m.i32(i: p_curr)
                        (i32.load (local.get $t_0))

                        ;; _1 &= I8_MAX
                        (i32.and (i32.const 0xff (; I8_MAX ;)))

                        ;; _2_p_match_end = p_match + match_len
                        (i32.add (local.get $p_match) (local.get $match_len))

                        ;; _2 = _m.i32(i: _2_p_match_end)
                        (i32.load)

                        ;; _2 &= I8_MAX
                        (i32.and (i32.const 0xff (; I8_MAX ;)))

                        ;; _1 = _1 != _2
                        (i32.ne)

                        ;; if _0 || _1: break compute_match_len
                        (i32.or)
                        (br_if $compute_match_len_break)

                        ;; match_len++
                        (i32.add (local.get $match_len) (i32.const 1))
                        (local.set $match_len)

                        (br $compute_match_len_continue)
                    )
                )

                ;; literal_len = p_in - p_anchor
                (i32.sub (local.get $p_in) (local.get $p_anchor))
                (local.set $literal_len)

                ;; header_token = 0
                (local.set $header_token (i32.const 0))

                ;; _0_literal_len_nibble = math|min_unsigned(literal_len, 0x0f)
                (call $math|min_unsigned (local.get $literal_len) (i32.const 0x0f))

                ;; _0_literal_len_nibble <<= 4
                (i32.const 4)
                (i32.shl)

                ;; header_token |= _0_literal_len_nibble
                (local.get $header_token)
                (i32.or)

                (local.set $header_token)

                ;; eff_match_len = match_len - MIN_MATCH
                (i32.sub (local.get $match_len) (i32.const 4) (; MIN_MATCH ;))
                ;; {t_0} (local.set $eff_match_len)

                (local.tee $eff_match_len) (; {t_0} ;)

                ;; _0_match_len_nibble = math|min_unsigned(eff_match_len, 0x0f)
                (call $math|min_unsigned (; {t_0} (local.get $eff_match_len) ;) (i32.const 0x0f))

                ;; header_token |= _0_match_len_nibble
                (local.get $header_token)
                (i32.or)

                (local.set $header_token)

                ;; _m[p_out] = header_token
                (i32.store8 (local.get $p_out) (local.get $header_token))

                ;; p_out++
                (i32.add (local.get $p_out) (i32.const 1))
                (local.set $p_out)

                ;; if literal_len >= 0x0f:
                (i32.ge_u (local.get $literal_len) (i32.const 0x0f))
                (if
                    (then
                        ;; literal_len_remaining = literal_len - 0x0f
                        (i32.sub (local.get $literal_len) (i32.const 0x0f))
                        (local.set $t_0)

                        ;; write_literal_len = while true:
                        (block $write_literal_len_break
                            (loop $write_literal_len_continue
                                ;; if literal_len_remaining < I8_MAX: break write_literal_len
                                (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                                (br_if $write_literal_len_break)

                                ;; _m[p_out] = I8_MAX
                                (i32.store8 (local.get $p_out) (i32.const 0xff (; I8_MAX ;)))

                                ;; p_out++
                                (i32.add (local.get $p_out) (i32.const 1))
                                (local.set $p_out)

                                ;; literal_len_remaining -= I8_MAX
                                (i32.sub (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                                (local.set $t_0)

                                (br $write_literal_len_continue)
                            )
                        )

                        ;; _m[p_out] = literal_len_remaining
                        (i32.store8 (local.get $p_out) (local.get $t_0))

                        ;; p_out++
                        (i32.add (local.get $p_out) (i32.const 1))
                        (local.set $p_out)
                    )
                )

                ;; _m.copy(dest: p_out, start: p_anchor, len: literal_len)
                (memory.copy (local.get $p_out) (local.get $p_anchor) (local.get $literal_len))

                ;; _m.i16(i: p_out, val: offset)
                (i32.store16 (local.get $p_out) (local.get $offset))

                ;; p_out += 2
                (i32.add (local.get $p_out) (i32.const 2))
                (local.set $p_out)

                ;; if eff_match_len >= 0x0f:
                (i32.ge_u (local.get $eff_match_len) (i32.const 0x0f))
                (if
                    (then
                        ;; eff_match_len_remaining = eff_match_len - 0x0f
                        (i32.sub (local.get $eff_match_len) (i32.const 0x0f))
                        (local.set $t_0)

                        ;; write_eff_match_len = while true:
                        (block $write_eff_match_len_break
                            (loop $write_eff_match_len_continue
                                ;; if eff_match_len_remaining < I8_MAX: break write_eff_match_len
                                (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                                (br_if $write_eff_match_len_break)

                                ;; _m[p_out] = I8_MAX
                                (i32.store8 (local.get $p_out) (i32.const 0xff (; I8_MAX ;)))

                                ;; p_out++
                                (i32.add (local.get $p_out) (i32.const 1))
                                (local.set $p_out)

                                ;; eff_match_len_remaining -= I8_MAX
                                (i32.sub (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                                (local.set $t_0)

                                (br $write_eff_match_len_continue)
                            )
                        )

                        ;; _m[p_out] = eff_match_len_remaining
                        (i32.store8 (local.get $p_out) (local.get $t_0))

                        ;; p_out++
                        (i32.add (local.get $p_out) (i32.const 1))
                        (local.set $p_out)
                    )
                )

                ;; p_in += match_len
                (i32.add (local.get $p_in) (local.get $match_len))
                ;; {t_0} (local.set $p_in)

                (local.tee $p_in) (; {t_0} ;)

                ;; p_anchor = p_in
                (local.set $p_anchor (; {t_0} (local.get $p_in) ;))

                (br $_l0_continue)
            )
        )

        ;; literal_len = len - p_anchor
        (i32.sub (local.get $len) (local.get $p_anchor))
        (local.set $literal_len)

        ;; _0_literal_len_nibble = math|min_unsigned(literal_len, 0x0f)
        (call $math|min_unsigned (local.get $literal_len) (i32.const 0x0f))

        ;; _0_literal_len_nibble <<= 4
        (i32.const 4)
        (i32.shl)

        ;; header_token = _0_literal_len_nibble
        (local.set $header_token)

        ;; _m[p_out] = header_token
        (i32.store8 (local.get $p_out) (local.get $header_token))

        ;; p_out++
        (i32.add (local.get $p_out) (i32.const 1))
        (local.set $p_out)

        ;; if literal_len >= 0x0f:
        (i32.ge_u (local.get $literal_len) (i32.const 0x0f))
        (if
            (then
                ;; literal_len_remaining = literal_len - 0x0f
                (i32.sub (local.get $literal_len) (i32.const 0x0f))
                (local.set $t_0)

                ;; write_literal_len = while true:
                (block $write_literal_len_break
                    (loop $write_literal_len_continue
                        ;; if literal_len_remaining < I8_MAX: break write_literal_len
                        (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                        (br_if $write_literal_len_break)

                        ;; _m[p_out] = I8_MAX
                        (i32.store8 (local.get $p_out) (i32.const 0xff (; I8_MAX ;)))

                        ;; p_out++
                        (i32.add (local.get $p_out) (i32.const 1))
                        (local.set $p_out)

                        ;; literal_len_remaining -= I8_MAX
                        (i32.sub (local.get $t_0) (i32.const 0xff (; I8_MAX ;)))
                        (local.set $t_0)

                        (br $write_literal_len_continue)
                    )
                )

                ;; _m[p_out] = literal_len_remaining
                (i32.store8 (local.get $p_out) (local.get $t_0))

                ;; p_out++
                (i32.add (local.get $p_out) (i32.const 1))
                (local.set $p_out)
            )
        )

        ;; _m.copy(dest: p_out, start: p_anchor, len: literal_len)
        (memory.copy (local.get $p_out) (local.get $p_anchor) (local.get $literal_len))

        ;; return p_out
        (local.get $p_out)
    )

    ;; func decode(len: i32) -> i32:
    (func $decode (param $len i32) (result i32)
        (local $p_in  i32)
        (local $p_out i32)

        (local $header_token i32)

        (local $literal_len i32)
        (local $match_len   i32)

        (local $p_match i32)
        (local $offset i32)

        (local $t_0 i32)

        ;; p_in = 0
        (local.set $p_in (i32.const 0))

        ;; p_out = len
        (local.set $p_out (local.get $len))

        ;; _l0 = while true:
        (block $_l0_break
            (loop $_l0_continue
                ;; if p_in >= len: break _l0
                (br_if $_l0_break (i32.ge_u (local.get $p_in) (local.get $len)))

                ;; _0 = _m.i32(i: p_in)
                (i32.load (local.get $p_in))

                ;; header_token = _0 & I8_MAX
                (local.set $header_token (i32.and (i32.const 0xff (; I8_MAX ;))))

                ;; p_in++
                (local.set $p_in (i32.add (local.get $p_in) (i32.const 1)))

                ;; literal_len = header_token >>> 4
                (local.tee $literal_len (; local.set $literal_len ;) (i32.shr_u (local.get $header_token) (i32.const 4)))

                ;; if literal_len == 0x0f:
                (if (i32.eq (; local.get $literal_len ;) (i32.const 0x0f))
                    (then
                        ;; compute_literal_len = while true:
                        (block $compute_literal_len_break
                            (loop $compute_literal_len_continue
                                ;; _0 = _m.i32(p_in)
                                (i32.load (local.get $p_in))

                                ;; byte = _0 & I8_MAX
                                (local.set $t_0 (i32.and (i32.const 0xff (; I8_MAX ;))))

                                ;; p_in++
                                (local.set $p_in (i32.add (local.get $p_in) (i32.const 1)))

                                ;; literal_len += byte
                                (local.set $literal_len (i32.add (local.get $literal_len) (local.get $t_0)))

                                ;; if byte == I8_MAX: continue compute_literal_len
                                (br_if $compute_literal_len_continue (i32.eq (local.get $t_0) (i32.const 0xff (; I8_MAX ;))))

                                ;; break compute_literal_len
                                (br $compute_literal_len_break)
                            )
                        )
                    )
                )

                ;; _m.copy(dest: p_out, start: p_in, len: literal_len)
                (memory.copy (local.get $p_out) (local.get $p_in) (local.get $literal_len))

                ;; p_in += literal_len
                (local.set $p_in (i32.add (local.get $p_in) (local.get $literal_len)))

                ;; p_out += literal_len
                (local.set $p_out (i32.add (local.get $p_out) (local.get $literal_len)))

                ;; if p_in >= len: break _l0
                (br_if $_l0_break (i32.ge_u (local.get $p_in) (local.get $len)))

                ;; _0 = _m.i32(i: p_in)
                (i32.load (local.get $p_in))

                ;; offset = _0 & I16_MAX
                (local.set $offset (i32.and (i32.const 0xffff (; I16_MAX ;))))

                ;; p_in += 2
                (i32.add (local.get $p_in) (i32.const 2))
                (local.set $p_in)

                ;; match_len = header_token & 0x0f
                (local.tee $match_len (; local.set $match_len ;) (i32.and (local.get $header_token) (i32.const 0x0f)))

                ;; if match_len == 0x0f:
                (if (i32.eq (; local.get $match_len ;) (i32.const 0x0f))
                    (then
                        ;; compute_match_len = while true:
                        (block $compute_match_len_break
                            (loop $compute_match_len_continue
                                ;; _0 = _m.i32(p_in)
                                (i32.load (local.get $p_in))

                                ;; byte = _0 & I8_MAX
                                (local.set $t_0 (i32.and (i32.const 0xff (; I8_MAX ;))))

                                ;; p_in++
                                (local.set $p_in (i32.add (local.get $p_in) (i32.const 1)))

                                ;; match_len += byte
                                (local.set $match_len (i32.add (local.get $match_len) (local.get $t_0)))

                                ;; if byte == I8_MAX: continue compute_match_len
                                (br_if $compute_match_len_continue (i32.eq (local.get $t_0) (i32.const 0xff (; I8_MAX ;))))

                                ;; break compute_match_len
                                (br $compute_match_len_break)
                            )
                        )
                    )
                )

                ;; match_len += 4
                (local.set $match_len (i32.add (local.get $match_len) (i32.const 4)))

                ;; p_match = p_out - offset
                (local.set $p_match (i32.sub (local.get $p_out) (local.get $offset)))

                ;; match_len_copy = match_len
                (local.set $t_0 (local.get $match_len))

                ;; copy_match = while true:
                (block $copy_match_break
                    (loop $copy_match_continue
                        ;; if offset > match_len_copy: break copy_match
                        (br_if $copy_match_break (i32.gt_u (local.get $offset) (local.get $t_0)))

                        ;; _m.copy(dest: p_out, start: p_match, len: offset)
                        (memory.copy (local.get $p_out) (local.get $p_match) (local.get $offset))

                        ;; p_in += offset
                        (local.set $p_in (i32.add (local.get $p_in) (local.get $offset)))

                        ;; p_match += offset
                        (local.set $p_match (i32.add (local.get $p_match) (local.get $offset)))

                        ;; match_len_copy -= offset
                        (local.set $t_0 (i32.sub (local.get $t_0) (local.get $offset)))

                        (br $copy_match_continue)
                    )
                )

                ;; _m.copy(dest: p_out, start: p_match, len: match_len)
                (memory.copy (local.get $p_out) (local.get $p_match) (local.get $t_0))

                ;; p_out += match_len_copy
                (local.set $p_out (i32.add (local.get $p_out) (local.get $t_0)))

                ;; p_match += match_len_copy
                (local.set $p_match (i32.add (local.get $p_match) (local.get $t_0)))

                (br $_l0_continue)
            )
        )

        ;; return p_out
        (local.get $p_out)
    )

    ;; func grow_pre_encode(len: i32):
    (func $grow_pre_encode (param $len i32)
        ;; _0 = len / I8_MAX
        (i32.div_u (local.get $len) (i32.const 0xff (; I8_MAX ;)))

        ;; _0 += 16
        (i32.add (i32.const 16))

        ;; _0_max_decoded_size = _0 + len
        (i32.add (local.get $len))

        ;; _0_max_total_size = _0_max_decoded_size + len
        (i32.add (local.get $len))

        ;; grow_to_fit_len(len: _0_max_decoded_size)
        (call $grow_to_fit_len)
    )

    ;; func grow_pre_decode(len: i32):
    (func $grow_pre_decode (param $len i32)
        ;; _0_max_total_size = len + len
        (i32.add (local.get $len) (local.get $len))

        ;; grow_to_fit_len(len: _0_max_decoded_size)
        (call $grow_to_fit_len)
    )

    ;; func grow_to_fit_len(len: i32):
    (func $grow_to_fit_len (param $len i32)
        (local $n_pages i32)

        ;; n_pages = len >>> 16 // => len / MEM_PAGE_SIZE
        (i32.shr_u (local.get $len) (i32.const 16))
        (local.set $n_pages)

        ;; if <bool>(len & I16_MAX):
        (i32.and (local.get $len) (i32.const 0xffff) (; I16_MAX ;))
        (if
            (then
                ;; n_pages++
                (i32.add (local.get $n_pages) (i32.const 1))
                (local.set $n_pages)
            )
        )

        ;; n_pages -= _m.size
        (i32.sub (local.get $n_pages) (memory.size))
        ;; {t_0} (local.set $n_pages)

        (local.tee $n_pages) (; {t_0} ;)

        ;; if n_pages >>> (bit_sizeof(i32) - 1) // => if n_pages < 0:
        (i32.shr_u (; {t_0} (local.get $n_pages) ;) (i32.const 31) (; bit_sizeof(i32) - 1 ;))
        (if
            (then
                (return)
            )
        )

        ;; _0 = _m.grow(size: n_pages)
        (memory.grow (local.get $n_pages))

        ;; if (_0 == -1):
        (i32.eq (; _0 ;) (i32.const -1))
        (if
            (then
                (throw $CannotGrowMemory)
            )
        )
    )

    ;; export encode
    (export "encode" (func $encode))

    ;; export decode
    (export "decode" (func $decode))

    ;; export grow_pre_encode as growPreEncode
    (export "growPreEncode" (func $grow_pre_encode))

    ;; export grow_pre_decode as growPreDecode
    (export "growPreDecode" (func $grow_pre_decode))

    ;; export _m as memory
    (export "memory" (memory $_m))
)
