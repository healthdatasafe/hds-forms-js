import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentPanel } from '../src/components/ConsentPanel';
import { DEFAULT_CONSENT_LABELS } from '../src/components/consentLabels';

const noop = (): void => {};
const perms = [
  { streamId: 'body-weight', level: 'read' as const, name: 'Weight' },
  { streamId: 'symptom', level: 'contribute' as const, defaultName: 'Symptoms' },
  { streamId: '*', level: 'manage' as const }
];

describe('ConsentPanel', () => {
  it('renders app name, permissions with level labels and the default buttons', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'Mira' }} permissions={perms} onAccept={noop} onRefuse={noop} />
    );
    expect(html).toContain('Mira is requesting permission to:');
    expect(html).toContain('Weight');
    expect(html).toContain('Symptoms');
    expect(html).toContain(DEFAULT_CONSENT_LABELS.streamAll);
    expect(html).toContain('>read<');
    expect(html).toContain('>contribute<');
    expect(html).toContain('>manage<');
    expect(html).toContain('>Allow<');
    expect(html).toContain('>Refuse<');
    expect(html).not.toContain('disabled=""');
  });

  it('honours label overrides and placeholders', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel
        app={{ name: 'Mira' }}
        permissions={perms}
        expireAfterSeconds={3600}
        mismatchWarning
        onAccept={noop}
        onRefuse={noop}
        labels={{ requesting: '{app} demande :', accept: 'Accepter', expiresAfter: 'Expire après {seconds} s', eyebrow: '', footnote: '' }}
      />
    );
    expect(html).toContain('Mira demande :');
    expect(html).toContain('>Accepter<');
    expect(html).toContain('Expire après 3600 s');
    expect(html).toContain(DEFAULT_CONSENT_LABELS.mismatchWarning);
    expect(html).not.toContain('Permission request');
    expect(html).not.toContain('revoke this access');
  });

  it('shows the empty-permissions text, consent text and disables buttons while busy', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'X' }} consentText='Line one\nLine two' permissions={[]} busy='accepting' onAccept={noop} onRefuse={noop} />
    );
    expect(html).toContain(DEFAULT_CONSENT_LABELS.noPermissions);
    expect(html).toContain('Line one');
    expect(html).toContain('>Allowing…<');
    expect((html.match(/disabled=""/g) ?? []).length).toBe(2);
  });

  it('renders a custom mismatch text and children above the buttons', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'X' }} permissions={perms} mismatchWarning='Custom warning' onAccept={noop} onRefuse={noop}>
        <span>extra</span>
      </ConsentPanel>
    );
    expect(html).toContain('Custom warning');
    expect(html.indexOf('extra')).toBeLessThan(html.indexOf('>Refuse<'));
  });
});
