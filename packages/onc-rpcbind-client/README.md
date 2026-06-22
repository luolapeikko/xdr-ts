# @luolapeikko/onc-rpcbind-client

This package provides a client implementation for interacting with ONC RPC rpcbind services. It includes an `RpcBindClient` class for making remote procedure calls to services registered with rpcbind, as well as utilities for encoding and decoding RPC requests and responses.

## Example Usage

```typescript
import { RpcBindClient } from "@luolapeikko/onc-rpcbind-client";
import { RpcNodeUdpTransport } from "@luolapeikko/onc-node";

const rpcbind = new RpcBindClient(new RpcNodeUdpTransport());

const time = await rpcbind.getTime();
console.log("Current time from rpcbind service:", new Date(time * 1000));
```
