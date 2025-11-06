import React, { useState } from 'react';

type AccordionProps = {
  children: React.ReactNode;
  variant?: 'light' | 'dark' | string;
  className?: string;
};

export function Accordion({ children, variant = 'light', className = '' }: AccordionProps) {
  return (
    <div className={`space-y-2 ${className}`} data-accordion-variant={variant}>
      {children}
    </div>
  );
}

type AccordionItemProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  defaultOpen?: boolean;
};

export function AccordionItem({ title, children, ariaLabel, className = '', defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const id = typeof title === 'string' ? title.replace(/\s+/g, '-').toLowerCase() : Math.random().toString(36).slice(2, 9);

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        aria-label={ariaLabel || String(title)}
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dba661] flex items-center justify-between transition-colors duration-200 ${
          open ? 'bg-white/8' : 'bg-white/4 hover:bg-white/6'
        }`}
      >
        <span className="text-sm font-semibold text-slate-50">{title}</span>
        <span className="ml-3 text-lg text-slate-300 transition-transform duration-150" style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>

      <div
        id={`panel-${id}`}
        role="region"
        aria-hidden={!open}
        style={{
          maxHeight: open ? '500px' : '0',
          opacity: open ? 1 : 0,
          transition: 'max-height 150ms ease-out, opacity 150ms ease-out',
          overflow: 'hidden'
        }}
        className={`px-5 text-sm text-slate-200/90 leading-relaxed ${open ? 'py-4' : 'py-0'} bg-white/2`}
      >
        {children}
      </div>
    </div>
  );
}

export default Accordion;
