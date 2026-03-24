(module
    ;; import math.minUnsigned as math_min_unsigned
    (import "math" "minUnsigned" (func $math_min_unsigned (param $a i32) (param $b i32) (result i32)))

    ;; import hash-table.displace as hash-table_displace
    (import "hashTable" "displace" (func $hash-table_displace (param $key i32) (param $val i32) (result i32)))

    ;; import hash-table.fillMemory as hash-table_fill_memory
    (import "hashTable" "fillMemory" (func $hash-table_fill_memory (param $byte i32)))

    ;; import debug.log as debug_log
    (import "debug" "log" (func $debug_log (param $n i32)))

    ;; _m = new Memory(initial_size = 1)
    (memory $_m 1)

    (tag $CannotGrowMemory)

    ;; func encode(len: i32) -> i32:
    (func $encode (param $len i32) (result i32)
        (local $p_in  i32)
        (local $p_out i32)

        (local $p_anchor i32)

        (local $sequence i32)

        (local $p_match i32)

        (local $match_len i32)
        (local $literal_len i32)

        (local $header_token i32)

        (local $t_0 i32)

        ;; p_in = 0
        (local.set $p_in (i32.const 0))

        ;; p_out = len
        (local.set $p_out (local.get $len))

        ;; p_anchor = 0
        (local.set $p_anchor (i32.const 0))

        ;; if len >= 4:
        (if (i32.ge_u (local.get $len) (i32.const 4))
            (then
                ;; hash-table_fillMemory(byte = 0xff)
                (call $hash-table_fill_memory (i32.const 0xff))

                ;; while true:
                (block $_l_0_break
                    (loop $_l_0_continue
                        ;; if p_in > len - 12: break // enforce 12 byte margin from end of buffer instead of 4 due to LZ4 requirements
                        (br_if $_l_0_break (i32.gt_u (local.get $p_in) (i32.sub (local.get $len) (i32.const 12))))

                        ;; sequence = _m.i32(i = p_in)
                        (local.set $sequence (i32.load (local.get $p_in)))

                        ;; p_match = hash-table_displace(key = sequence, new_item = p_in)
                        (local.set $p_match (call $hash-table_displace (local.get $sequence) (local.get $p_in)))

                        ;; _0 =>
                        (block $_s_0
                            ;; _0 = <bool>(p_match >>> 31) // => p_match < 0
                            (local.tee $t_0 (i32.shr_u (local.get $p_match) (i32.const 31)))

                            ;; if _0: return _0
                            (br_if $_s_0)

                            ;; _0 = p_match >= p_in
                            (local.tee $t_0 (i32.ge_u (local.get $p_match) (local.get $p_in)))

                            ;; if _0: return _0
                            (br_if $_s_0)

                            ;; _0 = p_in - p_match > I16_MAX
                            (local.tee $t_0 (i32.gt_u (i32.sub (local.get $p_in) (local.get $p_match)) (i32.const 0xffff (; I16_MAX ;))))

                            ;; if _0: return _0
                            (br_if $_s_0)

                            ;; _0 = _m.i32(i = p_match) != sequence
                            (local.set $t_0 (i32.ne (i32.load (local.get $p_match)) (local.get $sequence)))

                            ;; return _0
                            (; _0;)
                        )

                        ;; if _0:
                        (if (local.get $t_0)
                            (then
                                ;; p_in++
                                (local.set $p_in (i32.add (local.get $p_in) (i32.const 1)))

                                ;; continue
                                (br $_l_0_continue)
                            )
                        )

                        ;; match_len = 4
                        (local.set $match_len (i32.const 4))

                        ;; compute_match_len = while true:
                        (block $compute_match_len_break
                            (loop $compute_match_len_continue
                                ;; _0_p_match_end = p_in + match_len
                                (local.tee $t_0 (i32.add (local.get $p_in) (local.get $match_len)))

                                ;; if _0_p_match_end >= len: break compute_match_len
                                (br_if $compute_match_len_break (i32.ge_u (; _0_p_match_end ;) (local.get $len)))

                                ;; if _m[_0_p_match_end] != _m[p_match + match_len]: break compute_match_len
                                (br_if $compute_match_len_break (i32.ne (i32.load8_u (local.get $t_0)) (i32.load8_u (i32.add (local.get $p_match) (local.get $match_len)))))

                                ;; match_len++
                                (local.set $match_len (i32.add (local.get $match_len) (i32.const 1)))

                                (br $compute_match_len_continue)
                            )
                        )

                        ;; literal_len = p_in - p_anchor
                        (local.tee $literal_len (i32.sub (local.get $p_in) (local.get $p_anchor)))

                        ;; header_token = math_min_unsigned(literal_len, 0x0f) << 4
                        (local.set $header_token (i32.shl (call $math_min_unsigned (; literal_len ;) (i32.const 0x0f)) (i32.const 4)))

                        ;; header_token |= math_min_unsigned(match_len - 4, 0x0f)
                        (local.set $header_token (i32.or (local.get $header_token) (call $math_min_unsigned (i32.sub (local.get $match_len) (i32.const 4)) (i32.const 0x0f))))

                        ;; _m[p_out] = header_token
                        (i32.store8 (local.get $p_out) (local.get $header_token))

                        ;; p_out++
                        (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))

                        ;; literal_len_copy = literal_len - 0x0f
                        (local.tee $t_0 (i32.sub (local.get $literal_len) (i32.const 0x0f)))

                        ;; if (literal_len_copy >>> 31) == 0 /* literal_len_copy >= 0 */:
                        (if (i32.eqz (i32.shr_u (; literal_len_copy ;) (i32.const 31)))
                            (then
                                ;; write_literal_len = while true:
                                (block $write_literal_len_break
                                    (loop $write_literal_len_continue
                                        ;; if literal_len_copy < I8_MAX: break write_literal_len
                                        (br_if $write_literal_len_break (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;))))

                                        ;; _m[p_out] = 0xff
                                        (i32.store8 (local.get $p_out) (i32.const 0xff))

                                        ;; p_out++
                                        (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))

                                        ;; literal_len_copy -= 0xff
                                        (local.set $t_0 (i32.sub (local.get $t_0) (i32.const 0xff)))

                                        (br $write_literal_len_continue)
                                    )
                                )

                                ;; _m[p_out] = literal_len_copy
                                (i32.store8 (local.get $p_out) (local.get $t_0))

                                ;; p_out++
                                (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))
                            )
                        )

                        ;; _m.copy(dest = p_out, start = p_anchor, len = literal_len)
                        (memory.copy (local.get $p_out) (local.get $p_anchor) (local.get $literal_len))

                        ;; p_out += literal_len
                        (local.set $p_out (i32.add (local.get $p_out) (local.get $literal_len)))

                        ;; _m.i16(i = p_out, bytes = p_in - p_match)
                        (i32.store16 (local.get $p_out) (i32.sub (local.get $p_in) (local.get $p_match)))

                        ;; p_out += 2
                        (local.set $p_out (i32.add (local.get $p_out) (i32.const 2)))

                        ;; match_len_copy = match_len - 19 // => match_len - 4 - 0x0f
                        (local.tee $t_0 (i32.sub (local.get $match_len) (i32.const 19)))

                        ;; if (match_len_copy >>> 31) == 0 /* match_len_copy >= 0 */:
                        (if (i32.eqz (i32.shr_u (; match_len_copy ;) (i32.const 31)))
                            (then
                                ;; write_match_len = while true:
                                (block $write_match_len_break
                                    (loop $write_match_len_continue
                                        ;; if match_len_copy < I8_MAX: break write_match_len
                                        (br_if $write_match_len_break (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;))))

                                        ;; _m[p_out] = 0xff
                                        (i32.store8 (local.get $p_out) (i32.const 0xff))

                                        ;; p_out++
                                        (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))

                                        ;; match_len_copy -= 0xff
                                        (local.set $t_0 (i32.sub (local.get $t_0) (i32.const 0xff)))

                                        (br $write_match_len_continue)
                                    )
                                )

                                ;; _m[p_out] = match_len_copy
                                (i32.store8 (local.get $p_out) (local.get $t_0))

                                ;; p_out++
                                (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))
                            )
                        )

                        ;; p_in += match_len
                        (local.tee $p_in (i32.add (local.get $p_in) (local.get $match_len)))

                        ;; p_anchor = p_in
                        (local.set $p_anchor (; p_in ;))
                    )
                )
            )
        )

        ;; literal_len = len - p_anchor
        (local.tee $literal_len (i32.sub (local.get $len) (local.get $p_anchor)))

        ;; header_token = math_min_unsigned(literal_len, 0x0f) << 4
        (local.set $header_token (i32.shl (call $math_min_unsigned (; literal_len ;) (i32.const 0x0f)) (i32.const 4)))

        ;; _m[p_out] = header_token
        (i32.store8 (local.get $p_out) (local.get $header_token))

        ;; p_out++
        (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))

        ;; literal_len_copy = literal_len - 0x0f
        (local.tee $t_0 (i32.sub (local.get $literal_len) (i32.const 0x0f)))

        ;; if (literal_len_copy >>> 31) == 0 /* literal_len_copy >= 0 */:
        (if (i32.eqz (i32.shr_u (; literal_len_copy ;) (i32.const 31)))
            (then
                ;; write_literal_len = while true:
                (block $write_literal_len_break
                    (loop $write_literal_len_continue
                        ;; if literal_len_copy < I8_MAX: break write_literal_len
                        (br_if $write_literal_len_break (i32.lt_u (local.get $t_0) (i32.const 0xff (; I8_MAX ;))))

                        ;; _m[p_out] = 0xff
                        (i32.store8 (local.get $p_out) (i32.const 0xff))

                        ;; p_out++
                        (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))

                        ;; literal_len_copy -= 0xff
                        (local.set $t_0 (i32.sub (local.get $t_0) (i32.const 0xff)))

                        (br $write_literal_len_continue)
                    )
                )

                ;; _m[p_out] = literal_len_copy
                (i32.store8 (local.get $p_out) (local.get $t_0))

                ;; p_out++
                (local.set $p_out (i32.add (local.get $p_out) (i32.const 1)))
            )
        )

        ;; _m.copy(dest = p_out, start = p_anchor, len = literal_len)
        (memory.copy (local.get $p_out) (local.get $p_anchor) (local.get $literal_len))

        ;; p_out += literal_len
        (local.tee $p_out (i32.add (local.get $p_out) (local.get $literal_len)))

        ;; return p_out
        (; p_out ;)
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

                ;; header_token = _m[p_in]
                (local.set $header_token (i32.load8_u (local.get $p_in)))

                ;; p_in++
                (local.set $p_in (i32.add (local.get $p_in) (i32.const 1)))

                ;; literal_len = header_token >>> 4
                (local.tee $literal_len (i32.shr_u (local.get $header_token) (i32.const 4)))

                ;; if literal_len == 0x0f:
                (if (i32.eq (; literal_len ;) (i32.const 0x0f))
                    (then
                        ;; compute_literal_len = while true:
                        (block $compute_literal_len_break
                            (loop $compute_literal_len_continue
                                ;; byte = _m[p_in]
                                (local.set $t_0 (i32.load8_u (local.get $p_in)))

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

                ;; _m.copy(dest = p_out, start = p_in, len = literal_len)
                (memory.copy (local.get $p_out) (local.get $p_in) (local.get $literal_len))

                ;; p_in += literal_len
                (local.set $p_in (i32.add (local.get $p_in) (local.get $literal_len)))

                ;; p_out += literal_len
                (local.set $p_out (i32.add (local.get $p_out) (local.get $literal_len)))

                ;; if p_in >= len: break _l0
                (br_if $_l0_break (i32.ge_u (local.get $p_in) (local.get $len)))

                ;; offset = _m.i16(i = p_in)
                (local.set $offset (i32.load16_u (local.get $p_in)))

                ;; p_in += 2
                (local.set $p_in (i32.add (local.get $p_in) (i32.const 2)))

                ;; match_len = header_token & 0x0f
                (local.tee $match_len (i32.and (local.get $header_token) (i32.const 0x0f)))

                ;; if match_len == 0x0f:
                (if (i32.eq (; match_len ;) (i32.const 0x0f))
                    (then
                        ;; compute_match_len = while true:
                        (block $compute_match_len_break
                            (loop $compute_match_len_continue
                                ;; byte = _m[p_in]
                                (local.set $t_0 (i32.load8_u (local.get $p_in)))

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

                ;; t_0_match_len_copy = match_len
                (local.set $t_0 (local.get $match_len))

                ;; copy_match = while true:
                (block $copy_match_break
                    (loop $copy_match_continue
                        ;; if offset > t_0_match_len_copy: break copy_match
                        (br_if $copy_match_break (i32.gt_s (local.get $offset) (local.get $t_0)))

                        ;; _m.copy(dest = p_out, start = p_match, len = offset)
                        (memory.copy (local.get $p_out) (local.get $p_match) (local.get $offset))

                        ;; p_out += offset
                        (local.set $p_out (i32.add (local.get $p_out) (local.get $offset)))

                        ;; p_match += offset
                        (local.set $p_match (i32.add (local.get $p_match) (local.get $offset)))

                        ;; t_0_match_len_copy -= offset
                        (local.set $t_0 (i32.sub (local.get $t_0) (local.get $offset)))

                        (br $copy_match_continue)
                    )
                )

                ;; _m.copy(dest = p_out, start = p_match, len = match_len)
                (memory.copy (local.get $p_out) (local.get $p_match) (local.get $t_0))

                ;; p_out += t_0_match_len_copy
                (local.set $p_out (i32.add (local.get $p_out) (local.get $t_0)))

                ;; p_match += t_0_match_len_copy
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
        (i32.add (; _0 ;) (i32.const 16))

        ;; _0_max_decoded_size = _0 + len
        (i32.add (; _0 ;) (local.get $len))

        ;; _0_max_total_size = _0_max_decoded_size + len
        (i32.add (; _0_max_decoded_size ;) (local.get $len))

        ;; grow_to_fit_len(len = _0_max_total_size)
        (call $grow_to_fit_len (; _0_max_total_size ;))
    )

    ;; func grow_pre_decode(len: i32):
    (func $grow_pre_decode (param $len i32)
        ;; _0_max_total_size = len + len
        (i32.add (local.get $len) (local.get $len))

        ;; grow_to_fit_len(len = _0_max_total_size)
        (call $grow_to_fit_len (; _0_max_total_size ;))
    )

    ;; func grow_to_fit_len(len: i32):
    (func $grow_to_fit_len (param $len i32)
        (local $page_delta i32)

        ;; page_delta = len >>> 16 // => len / MEM_PAGE_SIZE
        (local.set $page_delta (i32.shr_u (local.get $len) (i32.const 16)))

        ;; if <bool>(len & I16_MAX): page_delta++
        (if (i32.and (local.get $len) (i32.const 0xffff) (; I16_MAX ;))
            (then
                (local.set $page_delta (i32.add (local.get $page_delta) (i32.const 1)))
            )
        )

        ;; page_delta -= _m.size
        (local.tee $page_delta (i32.sub (local.get $page_delta) (memory.size)))

        ;; if page_delta >>> 31 /* page_delta < 0 */: return
        (if (i32.shr_u (; page_delta ;) (i32.const 31))
            (then
                (return)
            )
        )

        ;; _0_mem_result = _m.grow(size = page_delta)
        (memory.grow (local.get $page_delta))

        ;; if (_0_mem_result == -1): throw CannotGrowMemory
        (if (i32.eq (; _0_mem_result ;) (i32.const -1))
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
