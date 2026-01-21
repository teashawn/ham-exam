import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyHomeView } from './StudyHomeView';
import type { ExamSection, StudyProgress } from '@/types';

const mockSections: ExamSection[] = [
  {
    metadata: {
      sectionNumber: 1,
      title: 'Радиотехника',
      titleEn: 'Radio Engineering',
      examClass: 'A',
      lastUpdated: '2024-01-01',
      sourceFile: 'section1.pdf',
    },
    questions: Array(100).fill({}).map((_, i) => ({
      id: `1-${i}`,
      number: i + 1,
      question: `Question ${i}`,
      options: [],
      correctAnswer: 'А' as const,
    })),
  },
  {
    metadata: {
      sectionNumber: 2,
      title: 'Нормативна уредба',
      titleEn: 'Regulatory Framework',
      examClass: 'A',
      lastUpdated: '2024-01-01',
      sourceFile: 'section2.pdf',
    },
    questions: Array(50).fill({}).map((_, i) => ({
      id: `2-${i}`,
      number: i + 1,
      question: `Question ${i}`,
      options: [],
      correctAnswer: 'А' as const,
    })),
  },
  {
    metadata: {
      sectionNumber: 3,
      title: 'Безопасност',
      titleEn: 'Safety',
      examClass: 'A',
      lastUpdated: '2024-01-01',
      sourceFile: 'section3.pdf',
    },
    questions: Array(30).fill({}).map((_, i) => ({
      id: `3-${i}`,
      number: i + 1,
      question: `Question ${i}`,
      options: [],
      correctAnswer: 'А' as const,
    })),
  },
];

const mockProgressEmpty: StudyProgress[] = [
  { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 0, totalQuestions: 100, percentage: 0 },
  { sectionNumber: 2, sectionTitle: 'Нормативна уредба', viewedQuestions: 0, totalQuestions: 50, percentage: 0 },
  { sectionNumber: 3, sectionTitle: 'Безопасност', viewedQuestions: 0, totalQuestions: 30, percentage: 0 },
];

const mockProgressWithProgress: StudyProgress[] = [
  { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 50, totalQuestions: 100, percentage: 50 },
  { sectionNumber: 2, sectionTitle: 'Нормативна уредба', viewedQuestions: 25, totalQuestions: 50, percentage: 50 },
  { sectionNumber: 3, sectionTitle: 'Безопасност', viewedQuestions: 30, totalQuestions: 30, percentage: 100 },
];

describe('StudyHomeView', () => {
  it('should render header with title', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Режим учене')).toBeInTheDocument();
    expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
  });

  it('should render overall progress', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Общ прогрес')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 от 180 въпроса')).toBeInTheDocument();
  });

  it('should render section cards', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Раздел 1')).toBeInTheDocument();
    expect(screen.getByText('Радиотехника')).toBeInTheDocument();
    expect(screen.getByText('Раздел 2')).toBeInTheDocument();
    expect(screen.getByText('Нормативна уредба')).toBeInTheDocument();
    expect(screen.getByText('Раздел 3')).toBeInTheDocument();
    expect(screen.getByText('Безопасност')).toBeInTheDocument();
  });

  it('should call onStartStudy when clicking section card', () => {
    const onStartStudy = vi.fn();
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={onStartStudy}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const section1Card = screen.getByText('Раздел 1').closest('[class*="cursor-pointer"]');
    if (section1Card) {
      fireEvent.click(section1Card);
    }

    expect(onStartStudy).toHaveBeenCalledWith(1);
  });

  it('should call onBack when clicking back button', () => {
    const onBack = vi.fn();
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('should show reset progress button when there is progress', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Изтрий прогреса' })).toBeInTheDocument();
  });

  it('should not show reset progress button when there is no progress', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Изтрий прогреса' })).not.toBeInTheDocument();
  });

  it('should call onResetProgress when clicking reset button', () => {
    const onResetProgress = vi.fn();
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={onResetProgress}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Изтрий прогреса' }));
    expect(onResetProgress).toHaveBeenCalled();
  });

  it('should show progress percentage for each section', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('50/100')).toBeInTheDocument();
    expect(screen.getByText('25/50')).toBeInTheDocument();
    expect(screen.getByText('30/30')).toBeInTheDocument();
  });

  it('should show remaining questions count', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Още 50 въпроса')).toBeInTheDocument();
    expect(screen.getByText('Още 25 въпроса')).toBeInTheDocument();
  });

  it('should show completed badge for 100% sections', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Завършен')).toBeInTheDocument();
  });

  it('should show correct overall progress with partial completion', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressWithProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Total viewed: 50 + 25 + 30 = 105, Total: 180
    // Percentage: 105/180 = 58%
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('105 от 180 въпроса')).toBeInTheDocument();
  });

  it('should show select section prompt', () => {
    render(
      <StudyHomeView
        studyProgress={mockProgressEmpty}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Избери раздел за учене')).toBeInTheDocument();
  });

  it('should show singular question text when 1 question remaining', () => {
    const progressWithOne: StudyProgress[] = [
      { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 99, totalQuestions: 100, percentage: 99 },
      { sectionNumber: 2, sectionTitle: 'Нормативна уредба', viewedQuestions: 0, totalQuestions: 50, percentage: 0 },
      { sectionNumber: 3, sectionTitle: 'Безопасност', viewedQuestions: 0, totalQuestions: 30, percentage: 0 },
    ];

    render(
      <StudyHomeView
        studyProgress={progressWithOne}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Още 1 въпрос')).toBeInTheDocument();
  });

  it('should handle empty studyProgress array (zero total questions)', () => {
    render(
      <StudyHomeView
        studyProgress={[]}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Overall progress should show 0%
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 от 0 въпроса')).toBeInTheDocument();
  });

  it('should handle section without matching progress entry', () => {
    // Only provide progress for section 1, but sections has 3 sections
    const partialProgress: StudyProgress[] = [
      { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 50, totalQuestions: 100, percentage: 50 },
    ];

    render(
      <StudyHomeView
        studyProgress={partialProgress}
        sections={mockSections}
        onStartStudy={vi.fn()}
        onResetProgress={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Section 1 should show progress
    expect(screen.getByText('50/100')).toBeInTheDocument();

    // Sections 2 and 3 should fall back to default values (0 viewed, questions.length for total)
    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByText('0/30')).toBeInTheDocument();
  });
});
