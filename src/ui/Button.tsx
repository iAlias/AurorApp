import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-sun text-deep hover:bg-sun/90',
  secondary: 'bg-sky text-deep hover:bg-sky/90',
  ghost: 'bg-transparent text-deep hover:bg-deep/5 shadow-none',
  danger: 'bg-coral text-white hover:bg-coral/90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'text-base px-5 py-2.5',
  lg: 'text-lg px-6 py-3',
  xl: 'text-xl px-8 py-4',
};

/**
 * Pulsante pillola del design system (§9.2): `font-display`, angoli
 * completamente arrotondati, feedback al tocco con scala .97. L'animazione
 * tocca solo `transform` (mai layout), quindi resta leggera anche con
 * `reducedMotion` attivo altrove nell'app.
 */
export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-display font-bold',
    'shadow-soft transition-transform duration-150 ease-out',
    'active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...rest} />;
}
