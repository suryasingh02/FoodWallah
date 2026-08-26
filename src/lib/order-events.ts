import { EventEmitter } from "node:events";

const globalWithEvents = globalThis as typeof globalThis & { orderEvents?: EventEmitter };

export const orderEvents = globalWithEvents.orderEvents ?? new EventEmitter();
globalWithEvents.orderEvents = orderEvents;
