import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionOption {
  sectionNumber: number;
  title: string;
}

interface SectionSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  sections: SectionOption[];
  className?: string;
}

const SectionSelect = React.forwardRef<HTMLButtonElement, SectionSelectProps>(
  ({ value, onValueChange, sections, className }, ref) => {
    const selectedSection = sections.find((s) => s.sectionNumber === value);

    return (
      <SelectPrimitive.Root
        value={String(value)}
        onValueChange={(val) => onValueChange(Number(val))}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            'flex items-center justify-between gap-2 w-full px-3 py-2 text-sm font-medium',
            'bg-background/50 hover:bg-background/80 rounded-[var(--radius)]',
            'border border-border/50 hover:border-border',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'group',
            className
          )}
        >
          <span className="truncate text-muted-foreground">
            <span className="text-foreground font-semibold">
              Раздел {selectedSection?.sectionNumber}:
            </span>{' '}
            {selectedSection?.title}
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
              'bg-card border border-border rounded-[var(--radius)] shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {sections.map((section) => (
                <SelectPrimitive.Item
                  key={section.sectionNumber}
                  value={String(section.sectionNumber)}
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer',
                    'text-sm outline-none select-none',
                    'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                    'data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary',
                    'transition-colors duration-150'
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </SelectPrimitive.ItemIndicator>
                  <span className={cn('flex-1', !sections.find(s => s.sectionNumber === section.sectionNumber) && 'pl-6')}>
                    <span className="font-semibold">Раздел {section.sectionNumber}:</span>{' '}
                    <span className="text-muted-foreground">{section.title}</span>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);
SectionSelect.displayName = 'SectionSelect';

export { SectionSelect };
export type { SectionOption, SectionSelectProps };
