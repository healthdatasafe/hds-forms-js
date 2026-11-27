import type { ConsentPermission } from './ConsentPanel';

/** The id an annotation refers to: a stream permission's streamId, or a feature's name. */
export function permissionId (p: ConsentPermission): string {
  return (p as { feature?: string }).feature ?? p.streamId;
}
