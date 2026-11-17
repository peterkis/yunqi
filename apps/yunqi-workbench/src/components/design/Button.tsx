import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonAttributes = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'style'
>;

export type ButtonProps = ButtonAttributes & {
  readonly children: ReactNode;
} & (
  | { readonly variant?: 'primary' | 'secondary' | 'text' }
  | { readonly variant: 'icon'; readonly 'aria-label': string }
);

export function Button({
  variant = 'primary',
  type = 'button',
  children,
  ...attributes
}: ButtonProps) {
  if (variant === 'icon' && !attributes['aria-label']?.trim()) {
    throw new Error('Icon buttons require a non-empty aria-label.');
  }

  return (
    <button
      {...attributes}
      className={`ds-button ds-button--${variant}`}
      type={type}
    >
      {children}
    </button>
  );
}
