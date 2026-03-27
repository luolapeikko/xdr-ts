#!/usr/bin/env node

import {RpcBindServer} from './dist/index.mjs'


async function startServer() {
    const server = new RpcBindServer(111, {tcp:true, udp:true, logger: console});
    await server.bind();
}

await startServer();
