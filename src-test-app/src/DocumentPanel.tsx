import { useEffect, useState } from 'react';
import { AnchoredDocumentView } from 'hds-forms/conversation';
import type { AnchorBox, DocumentKind } from 'hds-forms/conversation';

// The haemoglobin line of the synthetic report s-lab-fr-0001 (HDS Reader corpus S v0, its PDF capture's anchor e1).
// The document itself is not published with this app: open it (or any PDF or picture) with the picker, or pass
// `?src=<address>` (an address this page may fetch).
const SAMPLE_ANCHOR = { page: 1, bbox: [8.1, 29.69, 83.81, 2.34] as AnchorBox };

const kindOf = (name: string, type = ''): DocumentKind => (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');

export default function DocumentPanel () {
  const [source, setSource] = useState<{ url: string; kind: DocumentKind; name: string } | null>(() => {
    const src = new URLSearchParams(window.location.search).get('src');
    return src ? { url: src, kind: kindOf(src), name: src } : null;
  });
  const [page, setPage] = useState(SAMPLE_ANCHOR.page);
  const [box, setBox] = useState<AnchorBox>(SAMPLE_ANCHOR.bbox);
  const [withBox, setWithBox] = useState(true);
  const [answer, setAnswer] = useState<string | null>(null);

  // an opened file is read from memory; let it go when another one replaces it
  useEffect(() => () => { if (source?.url.startsWith('blob:')) URL.revokeObjectURL(source.url); }, [source]);

  const setBoxAt = (i: number, value: string) => setBox((b) => b.map((n, j) => (j === i ? Number(value) : n)) as AnchorBox);

  return (
    <div className='max-w-xl space-y-4'>
      <div className='space-y-2 rounded-lg border border-gray-200 bg-white p-4'>
        <label className='block text-sm font-medium'>
          Document (PDF or picture)
          <input
            type='file'
            accept='application/pdf,image/*'
            className='mt-1 block w-full text-sm'
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setSource({ url: URL.createObjectURL(file), kind: kindOf(file.name, file.type), name: file.name }); setAnswer(null); }
            }}
          />
        </label>
        <div className='flex flex-wrap items-end gap-2 text-sm'>
          <label>Page <input type='number' min={1} value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value)))} className='w-16 rounded border px-1' /></label>
          {(['x', 'y', 'width', 'height'] as const).map((name, i) => (
            <label key={name}>{name} % <input type='number' step={0.01} value={box[i]} onChange={(e) => setBoxAt(i, e.target.value)} className='w-20 rounded border px-1' disabled={!withBox} /></label>
          ))}
          <label className='flex items-center gap-1'><input type='checkbox' checked={withBox} onChange={(e) => setWithBox(e.target.checked)} /> with a box</label>
        </div>
        <p className='text-xs text-gray-500'>Prefilled: the haemoglobin line of the synthetic report s-lab-fr-0001 (HDS Reader corpus).</p>
      </div>

      {source == null
        ? <p className='text-sm text-gray-500'>Open a document to see it here.</p>
        : (
          <div className='space-y-2 rounded-lg border border-gray-200 bg-white p-4'>
            <p className='text-sm font-medium'>Can you confirm your haemoglobin is 138 g/L?</p>
            <AnchoredDocumentView
              source={{ url: source.url, kind: source.kind }}
              anchor={{ page, bbox: withBox ? box : undefined }}
              label='Haemoglobin 138 g/L'
            >
              <div className='flex gap-2'>
                <button type='button' className='h-11 flex-1 rounded-md bg-blue-600 px-3 text-sm font-medium text-white' onClick={() => setAnswer('confirmed')}>Confirm</button>
                <button type='button' className='h-11 flex-1 rounded-md border border-gray-300 px-3 text-sm font-medium' onClick={() => setAnswer('correct')}>Correct</button>
              </div>
            </AnchoredDocumentView>
            {answer && <p className='text-sm text-gray-600'>Answer: {answer}</p>}
          </div>
          )}
    </div>
  );
}
