# @luolapeikko/onc-node

This package provides Service Registration, NodeJs transport implementations, and XDR buffer utilities for use in the ONC RPC (Open Network Computing Remote Procedure Call) protocol.

## Common Types

- Transports: `RpcNodeIpcTransport`, `RpcNodeTcpTransport`, `RpcNodeUnixTransport` - Implementations of RPC transports for IPC, TCP, and Unix domain sockets.
- `XdrBuffer`: A specific implementation of `IXdrBuffer` for Node.js `Buffer` objects, used for XDR encoding and decoding in ONC RPC contexts.
- `NodeRpcRegister` - For service registration with rpcbind in Node.js environments.

## Service Registration Example

```typescript
import { SocketAddrV4, SocketAddrV6 } from "net-socket-address";
import { SocketAddrUnix } from "unix-socket-address";
import { NodeRpcRegister } from "@luolapeikko/onc-node";
// service running on port 10000 (tcp/udp and both IPv4 and IPv6) and on a unix socket.
const servicePort = 10000;
const register = new NodeRpcRegister({
	endpoints: [
		{ netid: "tcp", addr: new SocketAddrV4({ port: servicePort }) },
		{ netid: "udp", addr: new SocketAddrV4({ port: servicePort }) },
		{ netid: "tcp6", addr: new SocketAddrV6({ port: servicePort }) },
		{ netid: "udp6", addr: new SocketAddrV6({ port: servicePort }) },
		{ netid: "local", addr: new SocketAddrUnix("/run/service.sock") },
	],
	prog: { prog: 73645, vers: 1 },
	owner: "my-service",
});
await register.init(); // registers the service with rpcbind
```
