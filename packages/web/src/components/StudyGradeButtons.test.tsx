import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  StudyGradeButtons,
  getRatingColor,
  getRatingLabel,
} from './StudyGradeButtons';
import { FSRSRating } from '@ham-exam/exam-core';
import type { SchedulingPreview } from '@ham-exam/exam-core';

const mockPreview: SchedulingPreview = {
  [FSRSRating.Again]: { due: '2024-01-15T12:01:00.000Z', interval: 1 / (24 * 60) }, // 1 minute
  [FSRSRating.Hard]: { due: '2024-01-15T12:10:00.000Z', interval: 10 / (24 * 60) }, // 10 minutes
  [FSRSRating.Good]: { due: '2024-01-16T12:00:00.000Z', interval: 1 }, // 1 day
  [FSRSRating.Easy]: { due: '2024-01-19T12:00:00.000Z', interval: 4 }, // 4 days
};

describe('StudyGradeButtons', () => {
  const mockOnRate = vi.fn();

  beforeEach(() => {
    mockOnRate.mockClear();
  });

  it('should render all four grade buttons', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    expect(screen.getByText('Не знаех')).toBeInTheDocument();
    expect(screen.getByText('Трудно')).toBeInTheDocument();
    expect(screen.getByText('Добре')).toBeInTheDocument();
    expect(screen.getByText('Лесно')).toBeInTheDocument();
  });

  it('should display intervals from preview', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    expect(screen.getByText('1m')).toBeInTheDocument(); // Again
    expect(screen.getByText('10m')).toBeInTheDocument(); // Hard
    expect(screen.getByText('1d')).toBeInTheDocument(); // Good
    expect(screen.getByText('4d')).toBeInTheDocument(); // Easy
  });

  it('should display ... when preview is null', () => {
    render(<StudyGradeButtons preview={null} onRate={mockOnRate} />);

    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBe(4);
  });

  it('should call onRate when button is clicked', async () => {
    const user = userEvent.setup();
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    await user.click(screen.getByText('Добре'));
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Good);
  });

  it('should call onRate for Again when clicked', async () => {
    const user = userEvent.setup();
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    await user.click(screen.getByText('Не знаех'));
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Again);
  });

  it('should call onRate for Hard when clicked', async () => {
    const user = userEvent.setup();
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    await user.click(screen.getByText('Трудно'));
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Hard);
  });

  it('should call onRate for Easy when clicked', async () => {
    const user = userEvent.setup();
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    await user.click(screen.getByText('Лесно'));
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Easy);
  });

  it('should handle keyboard shortcut 1 for Again', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    fireEvent.keyDown(window, { key: '1' });
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Again);
  });

  it('should handle keyboard shortcut 2 for Hard', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    fireEvent.keyDown(window, { key: '2' });
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Hard);
  });

  it('should handle keyboard shortcut 3 for Good', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    fireEvent.keyDown(window, { key: '3' });
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Good);
  });

  it('should handle keyboard shortcut 4 for Easy', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    fireEvent.keyDown(window, { key: '4' });
    expect(mockOnRate).toHaveBeenCalledWith(FSRSRating.Easy);
  });

  it('should not call onRate when disabled', () => {
    render(
      <StudyGradeButtons preview={mockPreview} onRate={mockOnRate} disabled />
    );

    fireEvent.keyDown(window, { key: '3' });
    expect(mockOnRate).not.toHaveBeenCalled();
  });

  it('should disable buttons when disabled prop is true', () => {
    render(
      <StudyGradeButtons preview={mockPreview} onRate={mockOnRate} disabled />
    );

    const buttons = screen.getAllByRole('button');
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it('should show keyboard hints by default', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    expect(screen.getByText('[1]')).toBeInTheDocument();
    expect(screen.getByText('[2]')).toBeInTheDocument();
    expect(screen.getByText('[3]')).toBeInTheDocument();
    expect(screen.getByText('[4]')).toBeInTheDocument();
    expect(
      screen.getByText('Натиснете 1-4 за бърза оценка')
    ).toBeInTheDocument();
  });

  it('should hide keyboard hints when showKeyboardHints is false', () => {
    render(
      <StudyGradeButtons
        preview={mockPreview}
        onRate={mockOnRate}
        showKeyboardHints={false}
      />
    );

    expect(screen.queryByText('[1]')).not.toBeInTheDocument();
    expect(screen.queryByText('[2]')).not.toBeInTheDocument();
    expect(screen.queryByText('[3]')).not.toBeInTheDocument();
    expect(screen.queryByText('[4]')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Натиснете 1-4 за бърза оценка')
    ).not.toBeInTheDocument();
  });

  it('should ignore non-rating keyboard keys', () => {
    render(<StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />);

    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockOnRate).not.toHaveBeenCalled();
  });

  it('should clean up keyboard listener on unmount', () => {
    const { unmount } = render(
      <StudyGradeButtons preview={mockPreview} onRate={mockOnRate} />
    );

    unmount();

    fireEvent.keyDown(window, { key: '1' });
    expect(mockOnRate).not.toHaveBeenCalled();
  });
});

describe('getRatingColor', () => {
  it('should return color class for Again', () => {
    const color = getRatingColor(FSRSRating.Again);
    expect(color).toContain('red');
  });

  it('should return color class for Hard', () => {
    const color = getRatingColor(FSRSRating.Hard);
    expect(color).toContain('orange');
  });

  it('should return color class for Good', () => {
    const color = getRatingColor(FSRSRating.Good);
    expect(color).toContain('green');
  });

  it('should return color class for Easy', () => {
    const color = getRatingColor(FSRSRating.Easy);
    expect(color).toContain('blue');
  });

  it('should return empty string for invalid rating', () => {
    const color = getRatingColor(99 as FSRSRating);
    expect(color).toBe('');
  });
});

describe('getRatingLabel', () => {
  it('should return label for Again', () => {
    expect(getRatingLabel(FSRSRating.Again)).toBe('Не знаех');
  });

  it('should return label for Hard', () => {
    expect(getRatingLabel(FSRSRating.Hard)).toBe('Трудно');
  });

  it('should return label for Good', () => {
    expect(getRatingLabel(FSRSRating.Good)).toBe('Добре');
  });

  it('should return label for Easy', () => {
    expect(getRatingLabel(FSRSRating.Easy)).toBe('Лесно');
  });

  it('should return empty string for invalid rating', () => {
    expect(getRatingLabel(99 as FSRSRating)).toBe('');
  });
});
