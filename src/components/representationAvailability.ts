import { registry } from 'hds-feminine-cycle-ui';

/** True when a representation is registered for this method, so `StampGridPicker` can render its options. */
export function isRepresentationAvailable (methodId: string): boolean {
  return registry.has(methodId);
}
