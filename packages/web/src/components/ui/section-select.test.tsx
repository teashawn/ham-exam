import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionSelect } from './section-select';

// Mock scrollIntoView which is not available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('SectionSelect', () => {
  const mockSections = [
    { sectionNumber: 1, title: 'Основи на радиотехниката' },
    { sectionNumber: 2, title: 'Разпространение на радиовълни' },
    { sectionNumber: 3, title: 'Правила и регулации' },
  ];

  it('should render with selected section', () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={1}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    expect(screen.getByText('Раздел 1:')).toBeInTheDocument();
    expect(screen.getByText('Основи на радиотехниката')).toBeInTheDocument();
  });

  it('should render trigger button with combobox role', () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={1}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={1}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // The dropdown should show all sections as options
    await screen.findByRole('listbox');
    expect(screen.getAllByRole('option').length).toBe(3);
  });

  it('should call onValueChange when selecting a different section', async () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={1}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    // Open dropdown
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await screen.findByRole('listbox');

    // Click on section 2 option
    const options = screen.getAllByRole('option');
    const section2Option = options.find(opt => opt.textContent?.includes('Раздел 2'));
    if (section2Option) {
      fireEvent.click(section2Option);
    }

    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it('should apply custom className', () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={1}
        onValueChange={onValueChange}
        sections={mockSections}
        className="custom-class"
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('custom-class');
  });

  it('should display selected section info correctly', () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={2}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    expect(screen.getByText('Раздел 2:')).toBeInTheDocument();
    expect(screen.getByText('Разпространение на радиовълни')).toBeInTheDocument();
  });

  it('should render with section 3 selected', () => {
    const onValueChange = vi.fn();
    render(
      <SectionSelect
        value={3}
        onValueChange={onValueChange}
        sections={mockSections}
      />
    );

    expect(screen.getByText('Раздел 3:')).toBeInTheDocument();
    expect(screen.getByText('Правила и регулации')).toBeInTheDocument();
  });
});
