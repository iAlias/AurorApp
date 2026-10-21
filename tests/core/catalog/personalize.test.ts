import { ACTIVITIES } from '../../../src/core/catalog/activities';
import { personalize, personalizeActivity } from '../../../src/core/catalog/personalize';
import type { Activity } from '../../../src/core/catalog/types';

const SOFIA = { name: 'Sofia', gender: 'f' } as const;
const LEO = { name: 'Leo', gender: 'm' } as const;

function allText(a: Activity): string[] {
  return [a.title, ...a.materials, ...a.steps, ...a.develops, a.variation, a.safety ?? ''];
}

describe('personalize', () => {
  test('sceglie la variante di genere e mette il nome', () => {
    expect(personalize('comanda {lei|lui}, brav{a|o} {nome}!', SOFIA)).toBe('comanda lei, brava Sofia!');
    expect(personalize('comanda {lei|lui}, brav{a|o} {nome}!', LEO)).toBe('comanda lui, bravo Leo!');
  });

  test('una variante vuota è ammessa', () => {
    expect(personalize('Chiudete{ abbracciate|}.', LEO)).toBe('Chiudete.');
  });

  test('il testo senza segnaposto resta identico', () => {
    expect(personalize('Si incolla tutto.', LEO)).toBe('Si incolla tutto.');
  });
});

describe('catalogo personalizzato', () => {
  test('nessun segnaposto rimasto per entrambi i generi', () => {
    for (const who of [SOFIA, LEO]) {
      for (const a of ACTIVITIES) {
        for (const t of allText(personalizeActivity(a, who))) {
          expect(t, a.id).not.toMatch(/[{}|]/);
        }
      }
    }
  });

  test('al maschile non restano riferimenti femminili al bambino', () => {
    // "ecco a lei" è il Lei di cortesia rivolto al cliente del ristorante.
    const feminine =
      /\b(lei|Lei|LEI|brava|pronta|sdraiata|sdraiate|bimba|piccolina|nata|eroina|Supereroina|maestra|dottoressa|postina|lettrice|giardiniera|scienziata|esperta|fradicia|attenta|aiutarla|Eccola|silenziosissime|rannicchiate|Regina)\b|poi da sola|della chef|la capotreno|la maître|uno (dietro|contro) l'altra|fronte all'altra/;
    for (const a of ACTIVITIES) {
      for (const t of allText(personalizeActivity(a, LEO))) {
        expect(t.replace('ecco a lei', ''), a.id).not.toMatch(feminine);
      }
    }
  });

  test('il nome sostituisce {nome} anche nei titoli', () => {
    const sim01 = personalizeActivity(ACTIVITIES.find((a) => a.id === 'SIM-01')!, LEO);
    expect(sim01.title).toBe('Il ristorante di Leo');
  });
});
