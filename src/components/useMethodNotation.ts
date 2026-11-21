import { useEffect, useState } from 'react';
import { getHDSModel } from 'hds-lib';
import { registry } from 'hds-feminine-cycle-ui';
import { readPreferredMethod } from '../schema/convertibleMethod';
import { buildNotation, type NotationModel } from '../schema/methodNotation';

/** The item whose charting method decides the notation, and its converter. */
export const NOTATION_MUCUS_ITEM = 'body-vulva-mucus-inspect';
export const NOTATION_CONVERTER = 'cervical-fluid';

/** Which of `itemKeys` the person's charting method enters as one notation record. */
export interface MethodNotation {
  /** 'none': no notation picker for her method, render generic fields. */
  status: 'loading' | 'none' | 'ready';
  /** e.g. 'creighton' */
  methodId?: string;
  /** Members of itemKeys the picker enters. */
  covers: string[];
  /** Every item key the picker may emit: covers and e.g. body-vulva-bleeding-browndark. */
  writes: string[];
  /** Internal, for `MethodNotationPicker`: the method definition and the picker model. */
  methodDef?: any;
  model?: NotationModel;
}

const NONE: MethodNotation = { status: 'none', covers: [], writes: [] };

/**
 * Which of `itemKeys` the person's charting method enters as one notation record (plan 134). Any method whose
 * definition carries `notation` and whose representation is registered gets the picker.
 */
export function useMethodNotation (itemKeys: string[]): MethodNotation {
  const keysId = itemKeys.join('\n');
  // read at each render: a method chosen while the form is open ("remember it?") takes over at the host's next render
  const methodId = readPreferredMethod(NOTATION_MUCUS_ITEM, NOTATION_CONVERTER);
  const [state, setState] = useState<MethodNotation>({ status: 'loading', covers: [], writes: [] });
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!methodId || !registry.has(methodId)) { if (live) setState(NONE); return; }
        const engine = await getHDSModel().converters.ensureEngine(NOTATION_CONVERTER);
        const methodDef = engine.getMethodDef(methodId);
        const model = buildNotation({ methodDef, rep: registry.get(methodId), itemKeys });
        if (!live) return;
        setState(model ? { status: 'ready', methodId, covers: model.covers, writes: model.writes, methodDef, model } : NONE);
      } catch (e) {
        console.error('Notation picker unavailable:', e);
        if (live) setState(NONE);
      }
    })();
    return () => { live = false; };
  }, [keysId, methodId]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
