import { useState, useCallback } from 'react';
import { appTemplates } from 'hds-lib';
import { FormBuilder } from 'hds-forms';

const { CollectorRequest } = appTemplates;

export default function TestFormBuilder () {
  const [request] = useState(() => new CollectorRequest({}));

  // Form metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function updateTitle (value: string) {
    setTitle(value);
    if (value) request.title = { en: value };
  }

  function updateDescription (value: string) {
    setDescription(value);
    if (value) request.description = { en: value };
  }

  const handleDirty = useCallback(() => {}, []);

  return (
    <FormBuilder
      request={request}
      showReminders
      defaultPreviewMode='json'
      onDirty={handleDirty}
      metadataSlot={
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Title</label>
            <input
              type='text'
              value={title}
              onChange={e => updateTitle(e.target.value)}
              placeholder='Form title'
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
          </div>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Description</label>
            <input
              type='text'
              value={description}
              onChange={e => updateDescription(e.target.value)}
              placeholder='Form description'
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
          </div>
        </div>
      }
    />
  );
}
