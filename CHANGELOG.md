# Changelog

This file details the changes that happen in `msgpack-typed`.

## v0.2.0 (23/06/26 - 10:54pm|UTC+8)

- Additions

- - Added subtype specification of wrapper classes.

- Fixes

- - Improved general encoding/decoding performance and reliability (including edge cases)

- - Changed certain names to fit their purpose better.

## v0.1.2 (17/04/26 - 11:41am|UTC+8)

- Fixes

- - Fixed `int` encoding in `Int` when encoding numbers between 0x8000 and 0xffff.

## v0.1.1 (15/04/26 - 10:55am|UTC+8)

- Fixes

- - Fixed `map` parsing when using `Obj.parse` with `Record`s (raw objects).

## v0.1.0 (26/03/26 - 12:38am|UTC+8)

- Additions

- - Published `msgpack-typed`!
