import { initHDSModel, type HDSModel } from 'hds-lib';

let model: HDSModel | null = null;

async function ensureInit (): Promise<HDSModel> {
  if (model != null) return model;
  model = await initHDSModel();
  return model;
}

export async function getItems (): Promise<Array<{ key: string; label: string }>> {
  const m = await ensureInit();
  const items: Array<{ key: string; label: string }> = [];
  for (const itemDef of m.itemsDefs.getAll()) {
    items.push({ key: itemDef.key, label: itemDef.label });
  }
  return items;
}

export function getModel (): HDSModel {
  if (model == null) throw new Error('Call getItems() first to initialize model');
  return model;
}
