(module
    ;; func min(a: i32, b: i32) -> i32:
    (func $min (param $a i32) (param $b i32) (result i32)
        ;; return a < b ? a : b
        (select (local.get $a) (local.get $b) (i32.lt_s (local.get $a) (local.get $b)))
    )

    ;; func min_unsigned(a: i32, b: i32) -> i32:
    (func $min_unsigned (param $a i32) (param $b i32) (result i32)
        ;; return a < b ? a : b
        (select (local.get $a) (local.get $b) (i32.lt_u (local.get $a) (local.get $b)))
    )

    ;; func max(a: i32, b: i32) -> i32:
    (func $max (param $a i32) (param $b i32) (result i32)
        ;; return a > b ? a : b
        (select (local.get $a) (local.get $b) (i32.gt_s (local.get $a) (local.get $b)))
    )

    ;; func max_unsigned(a: i32, b: i32) -> i32:
    (func $max_unsigned (param $a i32) (param $b i32) (result i32)
        ;; return a > b ? a : b
        (select (local.get $a) (local.get $b) (i32.gt_u (local.get $a) (local.get $b)))
    )

    ;; export min
    (export "min" (func $min))

    ;; export min_unsigned as minUnsigned
    (export "minUnsigned" (func $min_unsigned))

    ;; export max
    (export "max" (func $max))

    ;; export max_unsigned as maxUnsigned
    (export "maxUnsigned" (func $max_unsigned))
)
