# @luolapeikko/onc-rpcbind-server

This package provides a server implementation for ONC RPC rpcbind services. It includes an `RpcBindServer` class for handling incoming RPC requests and managing service registrations, as well as utilities for encoding and decoding RPC requests and responses.

Note: This package is heavily under development and the API's and functionality might still change.

## Cli usage (should install as "bin" in package.json)

```bash
onc-rpcbind-server --help
```

## Programmatic usage

```typescript
// by default use tcp/udp on both IPv4 and IPv6 (if available), and local (unix socket) transports. (`'\\\\.\\pipe\\rpcbind' or '/run/rpcbind.sock'`)
const server = new RpcBindServer(11111); // tcp/udp port to listen on for incoming RPC requests
await server.bind();
```
