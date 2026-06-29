import type { DomainEvent, EventBus, LoggerPort } from "./contracts.js";
import { randomUUID } from "node:crypto";

type Handler = (event: DomainEvent<object>) => Promise<void> | void;

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly allHandlers = new Set<Handler>();

  constructor(private readonly logger: LoggerPort) {}

  async publish<TPayload extends object>(event: DomainEvent<TPayload>): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? new Set();
    this.logger.info("domain_event.published", {
      type: event.type,
      source: event.source,
      handlers: handlers.size
    });

    await Promise.all(
      [...handlers, ...this.allHandlers].map((handler) => handler(event as DomainEvent<object>))
    );
  }

  subscribe<TPayload extends object>(
    eventType: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void> | void
  ): () => void {
    const handlers = this.handlers.get(eventType) ?? new Set<Handler>();
    handlers.add(handler as Handler);
    this.handlers.set(eventType, handlers);

    return () => {
      handlers.delete(handler as Handler);
    };
  }

  subscribeAll(handler: (event: DomainEvent<object>) => Promise<void> | void): () => void {
    this.allHandlers.add(handler);

    return () => {
      this.allHandlers.delete(handler);
    };
  }
}

export function createDomainEvent<TPayload extends object>(
  source: string,
  type: string,
  payload: TPayload
): DomainEvent<TPayload> {
  return {
    id: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    source,
    payload
  };
}
