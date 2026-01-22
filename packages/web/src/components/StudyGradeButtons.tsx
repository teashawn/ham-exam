/**
 * StudyGradeButtons Component
 *
 * 4-button grading system for FSRS study mode.
 * Shows next review intervals under each button.
 */

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FSRSRating, formatInterval } from '@ham-exam/exam-core';
import type { SchedulingPreview } from '@ham-exam/exam-core';
import { cn } from '@/lib/utils';

export interface StudyGradeButtonsProps {
  /** Scheduling preview showing intervals for each rating */
  preview: SchedulingPreview | null;
  /** Callback when a rating is selected */
  onRate: (rating: FSRSRating) => void;
  /** Whether the buttons are disabled */
  disabled?: boolean;
  /** Whether to show keyboard hints */
  showKeyboardHints?: boolean;
}

interface GradeButtonConfig {
  rating: FSRSRating;
  label: string;
  labelEn: string;
  keyboardKey: string;
  colorClass: string;
  hoverClass: string;
}

const gradeButtonConfigs: GradeButtonConfig[] = [
  {
    rating: FSRSRating.Again,
    label: 'Не знаех',
    labelEn: 'Again',
    keyboardKey: '1',
    colorClass: 'bg-red-500 hover:bg-red-600 text-white',
    hoverClass: 'hover:bg-red-600',
  },
  {
    rating: FSRSRating.Hard,
    label: 'Трудно',
    labelEn: 'Hard',
    keyboardKey: '2',
    colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
    hoverClass: 'hover:bg-orange-600',
  },
  {
    rating: FSRSRating.Good,
    label: 'Добре',
    labelEn: 'Good',
    keyboardKey: '3',
    colorClass: 'bg-green-500 hover:bg-green-600 text-white',
    hoverClass: 'hover:bg-green-600',
  },
  {
    rating: FSRSRating.Easy,
    label: 'Лесно',
    labelEn: 'Easy',
    keyboardKey: '4',
    colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    hoverClass: 'hover:bg-blue-600',
  },
];

export function StudyGradeButtons({
  preview,
  onRate,
  disabled = false,
  showKeyboardHints = true,
}: StudyGradeButtonsProps) {
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const key = event.key;
      if (key === '1') {
        event.preventDefault();
        onRate(FSRSRating.Again);
      } else if (key === '2') {
        event.preventDefault();
        onRate(FSRSRating.Hard);
      } else if (key === '3') {
        event.preventDefault();
        onRate(FSRSRating.Good);
      } else if (key === '4') {
        event.preventDefault();
        onRate(FSRSRating.Easy);
      }
    },
    [disabled, onRate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {gradeButtonConfigs.map((config) => {
          const interval = preview
            ? formatInterval(preview[config.rating].interval)
            : '...';

          return (
            <Button
              key={config.rating}
              onClick={() => onRate(config.rating)}
              disabled={disabled}
              className={cn(
                'flex flex-col h-auto py-3 px-4 min-h-[70px]',
                config.colorClass,
                'shadow-sm hover:shadow-md active:scale-[0.98]',
                'transition-all duration-200'
              )}
            >
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-xs opacity-80 mt-1">{interval}</span>
              {showKeyboardHints && (
                <span className="text-[10px] opacity-60 mt-0.5">
                  [{config.keyboardKey}]
                </span>
              )}
            </Button>
          );
        })}
      </div>
      {showKeyboardHints && (
        <p className="text-xs text-muted-foreground text-center">
          Натиснете 1-4 за бърза оценка
        </p>
      )}
    </div>
  );
}

/**
 * Get the color class for a rating (for use in other components)
 */
export function getRatingColor(rating: FSRSRating): string {
  const config = gradeButtonConfigs.find((c) => c.rating === rating);
  return config?.colorClass ?? '';
}

/**
 * Get the label for a rating
 */
export function getRatingLabel(rating: FSRSRating): string {
  const config = gradeButtonConfigs.find((c) => c.rating === rating);
  return config?.label ?? '';
}
