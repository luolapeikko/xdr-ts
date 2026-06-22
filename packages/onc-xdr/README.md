# @luolapeikko/onc-xdr

This package provides common XDR (External Data Representation) types and utilities for use in the ONC RPC (Open Network Computing Remote Procedure Call) protocol.

## Common Types
- `IXdrBuffer<T>`: An interface representing a buffer that can be used for XDR encoding and decoding.
- `XdrType`: Utility for encoders and decoders of various primitive XDR types.
- `XdrSchema`: A class for defining and working with XDR schemas, which can be used to encode and decode complex data structures.
- `XdrUint8Buffer`: A specific implementation of `IXdrBuffer` for `Uint8Array` buffers.