import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyHomeView } from './StudyHomeView';
import type { ExamSection, StudyProgress } from '@/types';
import type { FSRSStats } from '@ham-exam/exam-core';

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

  describe('Mode selection screen', () => {
    it('should render mode selection cards initially', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      expect(screen.getByText('Интелигентен преговор')).toBeInTheDocument();
      expect(screen.getByText('По раздели')).toBeInTheDocument();
    });

    it('should show FSRS card description', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText(/Адаптивно учене с FSRS алгоритъм/)).toBeInTheDocument();
    });

    it('should show sections card description', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText(/Преглеждай въпросите последователно/)).toBeInTheDocument();
    });

    it('should show question counts in sections card', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText('100 + 50 + 30 въпроса')).toBeInTheDocument();
    });

    it('should show due cards count in FSRS card when fsrsStats provided', () => {
      const mockFSRSStats: FSRSStats = {
        totalCards: 180,
        newCards: 100,
        learningCards: 30,
        reviewCards: 40,
        relearningCards: 10,
        dueNow: 25,
      };

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
        />
      );

      expect(screen.getByText('25 карти за преговор')).toBeInTheDocument();
    });

    it('should call onBack when clicking back button from select mode', () => {
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
  });

  describe('FSRS mode', () => {
    const mockFSRSStats: FSRSStats = {
      totalCards: 180,
      newCards: 100,
      learningCards: 30,
      reviewCards: 40,
      relearningCards: 10,
      dueNow: 25,
    };

    it('should navigate to FSRS mode when clicking FSRS card', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      // Should show FSRS stats grid
      expect(screen.getByText('За преговор')).toBeInTheDocument();
      expect(screen.getByText('Нови')).toBeInTheDocument();
      expect(screen.getByText('Учене')).toBeInTheDocument();
      expect(screen.getByText('Преговор')).toBeInTheDocument();
    });

    it('should show FSRS stats values in FSRS mode', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      expect(screen.getByText('25')).toBeInTheDocument(); // dueNow
      expect(screen.getByText('100')).toBeInTheDocument(); // newCards
      expect(screen.getByText('30')).toBeInTheDocument(); // learningCards
      expect(screen.getByText('40')).toBeInTheDocument(); // reviewCards
    });

    it('should show start FSRS study button when due cards exist', () => {
      const onStartFSRSStudy = vi.fn();

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
          onStartFSRSStudy={onStartFSRSStudy}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      const button = screen.getByRole('button', { name: /Преговори 25 карти/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onStartFSRSStudy).toHaveBeenCalled();
    });

    it('should not show start FSRS study button when no due cards', () => {
      const statsNoDue: FSRSStats = {
        ...mockFSRSStats,
        dueNow: 0,
      };

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={statsNoDue}
          onStartFSRSStudy={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      expect(screen.queryByRole('button', { name: /Преговори/i })).not.toBeInTheDocument();
    });

    it('should show no due cards message when dueNow is 0', () => {
      const statsNoDue: FSRSStats = {
        ...mockFSRSStats,
        dueNow: 0,
      };

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={statsNoDue}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      expect(screen.getByText('Няма карти за преговор!')).toBeInTheDocument();
      expect(screen.getByText('Върни се по-късно за нови карти.')).toBeInTheDocument();
    });

    it('should not show start FSRS study button when onStartFSRSStudy is not provided', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      expect(screen.queryByRole('button', { name: /Преговори/i })).not.toBeInTheDocument();
    });

    it('should return to select mode when clicking back from FSRS mode', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          fsrsStats={mockFSRSStats}
        />
      );

      // Go to FSRS mode
      fireEvent.click(screen.getByTestId('fsrs-mode-card'));
      expect(screen.getByText('За преговор')).toBeInTheDocument();

      // Click back
      fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

      // Should be back to select mode
      expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      expect(screen.getByText('Интелигентен преговор')).toBeInTheDocument();
    });
  });

  describe('Sections mode', () => {
    it('should navigate to sections mode when clicking sections card', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('sections-mode-card'));

      // Should show section cards
      expect(screen.getByText('Раздел 1')).toBeInTheDocument();
      expect(screen.getByText('Радиотехника')).toBeInTheDocument();
      expect(screen.getByText('Раздел 2')).toBeInTheDocument();
      expect(screen.getByText('Раздел 3')).toBeInTheDocument();
    });

    it('should render overall progress in sections mode', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('sections-mode-card'));

      expect(screen.getByText('Общ прогрес')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 от 180 въпроса')).toBeInTheDocument();
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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

      const section1Card = screen.getByText('Раздел 1').closest('[class*="cursor-pointer"]');
      if (section1Card) {
        fireEvent.click(section1Card);
      }

      expect(onStartStudy).toHaveBeenCalledWith(1);
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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

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

      fireEvent.click(screen.getByTestId('sections-mode-card'));

      // Section 1 should show progress
      expect(screen.getByText('50/100')).toBeInTheDocument();

      // Sections 2 and 3 should fall back to default values (0 viewed, questions.length for total)
      expect(screen.getByText('0/50')).toBeInTheDocument();
      expect(screen.getByText('0/30')).toBeInTheDocument();
    });

    it('should return to select mode when clicking back from sections mode', () => {
      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
        />
      );

      // Go to sections mode
      fireEvent.click(screen.getByTestId('sections-mode-card'));
      expect(screen.getByText('Раздел 1')).toBeInTheDocument();

      // Click back
      fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

      // Should be back to select mode
      expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      expect(screen.getByText('По раздели')).toBeInTheDocument();
    });
  });

  describe('Exam countdown', () => {
    it('should show exam countdown when examDate is provided', () => {
      // Set exam date 5 days in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          examDate={futureDate.toISOString()}
        />
      );

      expect(screen.getByText('5 дни до изпита')).toBeInTheDocument();
    });

    it('should show "1 day until exam" for singular day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          examDate={tomorrow.toISOString()}
        />
      );

      expect(screen.getByText('1 ден до изпита')).toBeInTheDocument();
    });

    it('should show "Exam is today!" when exam is today', () => {
      const today = new Date();

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          examDate={today.toISOString()}
        />
      );

      expect(screen.getByText('Изпитът е днес!')).toBeInTheDocument();
    });

    it('should show exam countdown in FSRS mode', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const mockFSRSStats: FSRSStats = {
        totalCards: 180,
        newCards: 100,
        learningCards: 30,
        reviewCards: 40,
        relearningCards: 10,
        dueNow: 25,
      };

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          examDate={futureDate.toISOString()}
          fsrsStats={mockFSRSStats}
        />
      );

      fireEvent.click(screen.getByTestId('fsrs-mode-card'));

      expect(screen.getByText('3 дни до изпита')).toBeInTheDocument();
    });

    it('should show exam countdown in sections mode', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      render(
        <StudyHomeView
          studyProgress={mockProgressEmpty}
          sections={mockSections}
          onStartStudy={vi.fn()}
          onResetProgress={vi.fn()}
          onBack={vi.fn()}
          examDate={futureDate.toISOString()}
        />
      );

      fireEvent.click(screen.getByTestId('sections-mode-card'));

      expect(screen.getByText('7 дни до изпита')).toBeInTheDocument();
    });
  });
});
