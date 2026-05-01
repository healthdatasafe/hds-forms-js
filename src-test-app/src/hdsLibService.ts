import HDSLib, { initHDSModel, getHDSModel, type HDSModel } from 'hds-lib';

let model: HDSModel | null = null;

// For local dev: override service-info URL or load model directly
const LOCAL_SERVICE_INFO_URL = import.meta.env.VITE_SERVICE_INFO_URL;
const LOCAL_MODEL_URL = import.meta.env.VITE_MODEL_URL;
const LOCAL_DATASETS_URL = import.meta.env.VITE_DATASETS_URL;

async function ensureInit (): Promise<HDSModel> {
  if (model != null) return model;
  if (LOCAL_MODEL_URL) {
    // Bypass service-info entirely — load pack.json directly into the
    // hds-lib singleton so components that call `getHDSModel()` (e.g.
    // HDSFormSection) get the same instance.
    model = getHDSModel();
    if (!model.isLoaded) {
      model.assets = {
        'hds-model': LOCAL_MODEL_URL,
        ...(LOCAL_DATASETS_URL ? { datasets: LOCAL_DATASETS_URL } : {}),
      };
      await model.load(LOCAL_MODEL_URL);
    }
  } else {
    // Use service-info (default or overridden)
    if (LOCAL_SERVICE_INFO_URL) {
      HDSLib.settings.setServiceInfoURL(LOCAL_SERVICE_INFO_URL);
    }
    model = await initHDSModel();
  }
  return model;
}

export async function getItems (): Promise<Array<{ key: string; label: string }>> {
  const m = await ensureInit();
  const items: Array<{ key: string; label: string }> = [];
  for (const itemDef of m.itemsDefs.getAllActive()) {
    items.push({ key: itemDef.key, label: itemDef.label });
  }
  return items;
}

export function getModel (): HDSModel {
  if (model == null) throw new Error('Call getItems() first to initialize model');
  return model;
}
