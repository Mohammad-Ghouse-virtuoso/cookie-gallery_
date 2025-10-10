import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base = 'inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:pointer-events-none';
const byVariant: Record<Variant, string> = {
  default: 'bg-indigo-600 text-white hover:bg-indigo-300',
  secondary: 'bg-gray-800 text-white hover:bg-gray-300',
  ghost: 'bg-transparent text-gray-800 hover:bg-indigo-20',
  outline: 'bg-transparent text-gray-800 border border-gray-300 hover:bg-gray-50',
};
const bySize: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const classes = cn(base, byVariant[variant], bySize[size], className);
    return <button ref={ref} className={classes} {...props} />;
  },
);

Button.displayName = 'Button';

export default Button;
