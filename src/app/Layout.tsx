import { NavLink, Outlet } from 'react-router-dom';
import type { NavLinkRenderProps } from 'react-router-dom';
import { PageFlip3D } from '../ui/PageFlip3D';
import { UpdatePrompt } from './UpdatePrompt';

interface NavItem {
  to: string;
  label: string;
  emoji: string;
}

/** Le 4 destinazioni principali (FR-1): l'ordine qui è l'ordine visivo in tab bar/sidebar. */
const NAV_ITEMS: NavItem[] = [
  { to: '/oggi', label: 'Oggi', emoji: '📅' },
  { to: '/calendario', label: 'Calendario', emoji: '🗓️' },
  { to: '/timer', label: 'Timer', emoji: '🌈' },
  { to: '/impostazioni', label: 'Impostazioni', emoji: '⚙️' },
];

function tabClasses({ isActive }: NavLinkRenderProps): string {
  return [
    'flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 font-display text-xs font-bold transition-colors',
    isActive ? 'text-deep' : 'text-stone',
  ].join(' ');
}

function sidebarClasses({ isActive }: NavLinkRenderProps): string {
  return [
    'flex items-center gap-2.5 rounded-full px-4 py-2.5 font-display text-base font-bold transition-colors',
    isActive ? 'bg-sun text-deep' : 'text-stone hover:bg-deep/5',
  ].join(' ');
}

/**
 * Chrome persistente dell'app (FR-1): tab bar in basso su mobile, sidebar a
 * sinistra da `lg:` in su — stesse 4 voci, stessa destinazione. `/timer` e'
 * incluso: la navigazione resta visibile anche durante il timer del pasto.
 * Solo `/wizard` resta FUORI da questo componente (fullscreen, FR-1/FR-6):
 * la sua route non passa da qui.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:border-r lg:border-deep/10 lg:bg-card lg:p-6">
        <span className="mb-6 font-display text-2xl text-deep">AurorApp 🌈</span>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={sidebarClasses}>
              <span aria-hidden="true">{item.emoji}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 pb-20 lg:pb-0">
        <PageFlip3D>
          <Outlet />
        </PageFlip3D>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-deep/10 bg-card/95 px-2 py-1.5 shadow-lift backdrop-blur lg:hidden"
        aria-label="Navigazione principale"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={tabClasses}>
            <span aria-hidden="true" className="text-xl">
              {item.emoji}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  );
}
