import type { WidgetDescriptor } from "./WidgetTypes";

type RegistryListener = (type: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, WidgetDescriptor<any>>();
const listeners = new Set<RegistryListener>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerWidget(descriptor: WidgetDescriptor<any>): void {
  registry.set(descriptor.type, descriptor);
  for (const listener of listeners) {
    listener(descriptor.type);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWidgetDescriptor(type: string): WidgetDescriptor<any> {
  const descriptor = registry.get(type);
  if (!descriptor) {
    throw new Error(
      `Unknown widget type: "${type}". Did you forget to register it?`,
    );
  }
  return descriptor;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRegisteredDescriptors(): WidgetDescriptor<any>[] {
  return Array.from(registry.values());
}

/** Subscribe to widget type registration events. Returns an unsubscribe function. */
export function onTypeRegistered(listener: RegistryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
