import events from 'events';
import http from 'http';
import fs from 'fs';
import net from 'net';
import process from 'process';
import child_process from 'child_process';
import buffer from 'buffer'
import {Console} from 'console';

export default {
    'http.Server.prototype': http.Server.prototype,
    'http.Agent.prototype': http.Agent.prototype,
    'http.ClientRequest.prototype': http.ClientRequest.prototype,
    'http.ServerResponse.prototype': http.ServerResponse.prototype,
    'http.OutgoingMessage.prototype': http.OutgoingMessage.prototype,
    'net.Socket.prototype': net.Socket.prototype,
    'net.Server.prototype': net.Server.prototype,
    'net.SocketAddress.prototype': net.SocketAddress.prototype,
    'fs.Dirent.prototype': fs.Dirent.prototype,
    'fs.ReadStream.prototype': fs.ReadStream.prototype,
    'fs.WriteStream.prototype': fs.WriteStream.prototype,
    'events.EventEmitter.prototype': events.EventEmitter.prototype,
    'events.EventEmitterAsyncResource.prototype': events.EventEmitterAsyncResource.prototype,
    'child_process.ChildProcess.prototype': child_process.ChildProcess.prototype,
    'buffer.Blob.prototype': buffer.Blob.prototype,
    'buffer.Buffer.prototype': buffer.Buffer.prototype,
    'buffer.File.prototype': buffer.File.prototype,
    'Console.prototype': Console.prototype,
    'Object.prototype': Object.prototype
};