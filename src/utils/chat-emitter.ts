import { EventEmitter } from 'events';

const globalForChat = globalThis as unknown as {
    chatEmitter?: EventEmitter;
    activeClientChats?: Map<string, number>;
    emailTimers?: Map<string, NodeJS.Timeout>;
};

if (!globalForChat.chatEmitter) {
    globalForChat.chatEmitter = new EventEmitter();
    globalForChat.chatEmitter.setMaxListeners(200);
}

if (!globalForChat.activeClientChats) {
    globalForChat.activeClientChats = new Map<string, number>();
}

if (!globalForChat.emailTimers) {
    globalForChat.emailTimers = new Map<string, NodeJS.Timeout>();
}

export const chatEmitter = globalForChat.chatEmitter;
export const activeClientChats = globalForChat.activeClientChats;
export const emailTimers = globalForChat.emailTimers;
