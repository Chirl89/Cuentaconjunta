import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock BroadcastChannel for multi-window sync testing in jsdom
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  listeners: Set<(event: MessageEvent) => void> = new Set();
  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  postMessage(data: unknown) {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const peer of Array.from(peers)) {
      if (peer !== this) {
        const ev = { data, type: "message" } as MessageEvent;
        if (peer.onmessage) {
          peer.onmessage(ev);
        }
        peer.listeners.forEach((listener) => {
          listener(ev);
        });
      }
    }
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
      if (peers.size === 0) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }
    this.listeners.clear();
  }
}

if (typeof window !== "undefined") {
  if (!window.BroadcastChannel) {
    // @ts-expect-error Mocking global BroadcastChannel
    window.BroadcastChannel = MockBroadcastChannel;
  }

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
