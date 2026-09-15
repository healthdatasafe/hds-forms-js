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

  it('shows a custom title while `{app}` labels still use the plain name', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'Mira' }} title='Mira would like to connect' permissions={perms} onAccept={noop} onRefuse={noop} />
    );
    expect(html).toContain('Mira would like to connect');
    expect(html).toContain('Mira is requesting permission to:');
    expect(html).not.toContain('would like to connect is requesting');
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

/**
 * `consentText` is the only part of this panel the requesting app writes, and
 * the only place a user learns in their own words what an app will do with
 * their data. `B-2026-09-15-3` was that a consent screen stopped passing it, so
 * the user approved an access knowing only an app id and a list of stream names.
 *
 * The prop was widened from `string` to `ReactNode` there: a consumer that
 * parses the message (it is markdown by convention) can pass elements instead of
 * losing the formatting. Rendering stays the consumer's job on purpose — this
 * text is untrusted, so the panel must never be handed raw HTML to inject.
 */
describe('ConsentPanel consentText (B-2026-09-15-3)', () => {
  it('renders a node as elements, not as escaped text', () => {
    const html = renderToStaticMarkup(
      <ConsentPanel
        app={{ name: 'X' }}
        consentText={<p><strong>We read</strong> your basal temperature.</p>}
        permissions={perms}
        onAccept={noop}
        onRefuse={noop}
      />
    );
    expect(html).toContain('<strong>We read</strong>');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('keeps pre-line wrapping for a string, and drops it for a node', () => {
    // A plain string still relies on the panel to honour its newlines; a node
    // brings its own block structure, and pre-line there would double the gaps.
    const asString = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'X' }} consentText={'a\nb'} permissions={[]} onAccept={noop} onRefuse={noop} />
    );
    const asNode = renderToStaticMarkup(
      <ConsentPanel app={{ name: 'X' }} consentText={<p>a</p>} permissions={[]} onAccept={noop} onRefuse={noop} />
    );
    expect(asString).toContain('whitespace-pre-line');
    expect(asNode).not.toContain('whitespace-pre-line');
  });

  it('renders the message BEFORE the permission list', () => {
    // Reading order is the requirement, not merely presence: what the app says
    // it will do, then the technical breakdown it introduces. Passing the
    // message through `children` would render it below the list instead.
    const html = renderToStaticMarkup(
      <ConsentPanel
        app={{ name: 'Mira' }}
        consentText='WHY-WE-WANT-IT'
        permissions={perms}
        onAccept={noop}
        onRefuse={noop}
      />
    );
    expect(html.indexOf('WHY-WE-WANT-IT')).toBeGreaterThan(-1);
    expect(html.indexOf('WHY-WE-WANT-IT')).toBeLessThan(html.indexOf('is requesting permission to:'));
  });

  it('renders no consent block at all when absent or empty', () => {
    for (const value of [undefined, null, '']) {
      const html = renderToStaticMarkup(
        <ConsentPanel app={{ name: 'X' }} consentText={value} permissions={perms} onAccept={noop} onRefuse={noop} />
      );
      // Match the consent block specifically — `bg-gray-100` alone also
      // appears on the permission rows.
      expect(html).not.toContain('rounded-lg bg-gray-100 p-4');
    }
  });
});
