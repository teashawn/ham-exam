import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExamHomeView, type HistoryStats } from './ExamHomeView';
import type { UserProfile, ExamHistoryEntry } from '@/types';

const mockUser: UserProfile = {
  id: 'test-id',
  name: 'Test User',
  createdAt: new Date(),
  lastActiveAt: new Date(),
};

const mockStatsEmpty: HistoryStats = {
  totalExams: 0,
  passRate: 0,
  averageScore: 0,
  bestScore: 0,
};

const mockStatsWithData: HistoryStats = {
  totalExams: 5,
  passRate: 85,
  averageScore: 75,
  bestScore: 95,
};

const mockHistoryEmpty: ExamHistoryEntry[] = [];

const mockHistoryWithEntries: ExamHistoryEntry[] = [
  {
    sessionId: 'session-1',
    userId: 'test-id',
    score: 80,
    passed: true,
    totalQuestions: 40,
    correctAnswers: 32,
    completedAt: new Date(),
    config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
  },
  {
    sessionId: 'session-2',
    userId: 'test-id',
    score: 90,
    passed: true,
    totalQuestions: 40,
    correctAnswers: 36,
    completedAt: new Date(),
    config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
  },
  {
    sessionId: 'session-3',
    userId: 'test-id',
    score: 45,
    passed: false,
    totalQuestions: 40,
    correctAnswers: 18,
    completedAt: new Date(),
    config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
  },
];

describe('ExamHomeView', () => {
  it('should render header with title and user name', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Изпит')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should render total questions count', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Общо въпроси')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('should call onStartExam when clicking start exam button', () => {
    const onStartExam = vi.fn();
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={onStartExam}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));
    expect(onStartExam).toHaveBeenCalled();
  });

  it('should call onOpenConfig when clicking settings button', () => {
    const onOpenConfig = vi.fn();
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={vi.fn()}
        onOpenConfig={onOpenConfig}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    expect(onOpenConfig).toHaveBeenCalled();
  });

  it('should call onBack when clicking back button', () => {
    const onBack = vi.fn();
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('should show statistics when there are exams', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsWithData}
        history={mockHistoryWithEntries}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Статистика')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // total exams
    expect(screen.getByText('85%')).toBeInTheDocument(); // pass rate
    expect(screen.getByText('75%')).toBeInTheDocument(); // average score
    expect(screen.getByText('95%')).toBeInTheDocument(); // best score
  });

  it('should not show statistics when there are no exams', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsEmpty}
        history={mockHistoryEmpty}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByText('Статистика')).not.toBeInTheDocument();
  });

  it('should show recent exams when there is history', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsWithData}
        history={mockHistoryWithEntries}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Последни изпити')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument(); // most recent exam first (reversed)
  });

  it('should call onOpenHistory when clicking full history button', () => {
    const onOpenHistory = vi.fn();
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsWithData}
        history={mockHistoryWithEntries}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={onOpenHistory}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));
    expect(onOpenHistory).toHaveBeenCalled();
  });

  it('should show correct and total answers for recent exams', () => {
    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsWithData}
        history={mockHistoryWithEntries}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('18/40')).toBeInTheDocument();
  });

  it('should show only last 3 exams in recent history', () => {
    const manyExams: ExamHistoryEntry[] = [
      ...mockHistoryWithEntries,
      {
        sessionId: 'session-4',
        userId: 'test-id',
        score: 70,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 28,
        completedAt: new Date(),
        config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
      },
      {
        sessionId: 'session-5',
        userId: 'test-id',
        score: 60,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 24,
        completedAt: new Date(),
        config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
      },
    ];

    render(
      <ExamHomeView
        user={mockUser}
        totalQuestions={40}
        stats={mockStatsWithData}
        history={manyExams}
        onStartExam={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenHistory={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Should show 60%, 70%, 45% (last 3 reversed)
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    // Should not show 80%, 90%
    expect(screen.queryByText('90%')).not.toBeInTheDocument();
  });
});
