import { EventEmitter } from 'events';

const globalForChat = globalThis as unknown as {
    chatEmitter?: EventEmitter;
};

if (!globalForChat.chatEmitter) {
    globalForChat.chatEmitter = new EventEmitter();
    globalForChat.chatEmitter.setMaxListeners(200);
}

export const chatEmitter = globalForChat.chatEmitter;
