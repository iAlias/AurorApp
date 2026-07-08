import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogPage } from '../../../src/features/catalog/CatalogPage';
import { ACTIVITIES } from '../../../src/core/catalog/activities';
import { CATEGORIES } from '../../../src/core/catalog/categories';

// Pagina di consultazione libera del catalogo (non collegata al piano di un
// giorno specifico): mostra le 150 attività, filtrabili per categoria e
// altri filtri, con dettaglio in sola lettura (senza Fatta/Saltata/
// Cambiala/Scelgo io).

function itemsCount() {
  return screen.getAllByTestId('catalog-item').length;
}

test('mostra tutte le attività del catalogo di default', () => {
  render(<CatalogPage />);
  expect(itemsCount()).toBe(ACTIVITIES.length);
});

test('il filtro categoria riduce la lista alle sole attività di quella categoria', async () => {
  const user = userEvent.setup();
  render(<CatalogPage />);

  const musExpected = ACTIVITIES.filter((a) => a.category === 'MUS').length;
  await user.click(screen.getByRole('tab', { name: new RegExp(CATEGORIES.MUS.name, 'i') }));

  expect(itemsCount()).toBe(musExpected);

  // Tornando su "Tutte" si rivede l'elenco completo.
  await user.click(screen.getByRole('tab', { name: /^tutte$/i }));
  expect(itemsCount()).toBe(ACTIVITIES.length);
});

test('cliccare una card apre il popup di dettaglio senza azioni (readOnly)', async () => {
  const user = userEvent.setup();
  render(<CatalogPage />);

  const firstActivity = ACTIVITIES[0];
  const items = screen.getAllByTestId('catalog-item');
  await user.click(items[0]);

  expect(screen.getByRole('heading', { name: new RegExp(firstActivity.title, 'i') })).toBeInTheDocument();
  expect(screen.getByText(/sviluppa:/i)).toBeInTheDocument();

  // Nessuna azione che modifichi un piano: readOnly nasconde l'intera riga.
  expect(screen.queryByRole('button', { name: /^fatta/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /saltata/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /cambiala/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /scelgo io/i })).not.toBeInTheDocument();
});

test('il filtro energia combinato con la categoria restringe ulteriormente la lista', async () => {
  const user = userEvent.setup();
  render(<CatalogPage />);

  const expected = ACTIVITIES.filter((a) => a.category === 'MOT' && a.energy === 'alta').length;
  await user.click(screen.getByRole('tab', { name: new RegExp(CATEGORIES.MOT.name, 'i') }));
  const energiaGroup = screen.getByText('Energia').parentElement as HTMLElement;
  await user.click(within(energiaGroup).getByRole('button', { name: /^alta$/i }));

  expect(itemsCount()).toBe(expected);
});
