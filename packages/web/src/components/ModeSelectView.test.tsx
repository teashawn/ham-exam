import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelectView } from './ModeSelectView';
import type { UserProfile, StudyProgress, ExamHistoryEntry } from '@/types';

const mockUser: UserProfile = {
  id: 'test-id',
  name: 'Test User',
  createdAt: new Date(),
  lastActiveAt: new Date(),
};

const mockStudyProgressEmpty: StudyProgress[] = [
  { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 0, totalQuestions: 100, percentage: 0 },
  { sectionNumber: 2, sectionTitle: 'Нормативна уредба', viewedQuestions: 0, totalQuestions: 50, percentage: 0 },
];

const mockStudyProgressWithProgress: StudyProgress[] = [
  { sectionNumber: 1, sectionTitle: 'Радиотехника', viewedQuestions: 32, totalQuestions: 100, percentage: 32 },
  { sectionNumber: 2, sectionTitle: 'Нормативна уредба', viewedQuestions: 25, totalQuestions: 50, percentage: 50 },
];

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
];

describe('ModeSelectView', () => {
  it('should render greeting with user name', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText(/Здравей, Test User!/)).toBeInTheDocument();
    expect(screen.getByText('Какво искаш да правиш днес?')).toBeInTheDocument();
  });

  it('should render study and exam cards', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Учене')).toBeInTheDocument();
    expect(screen.getByText('Изпит')).toBeInTheDocument();
  });

  it('should call onSelectStudy when clicking study card', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    const studyCard = screen.getByText('Учене').closest('[class*="cursor-pointer"]');
    if (studyCard) {
      fireEvent.click(studyCard);
    }

    expect(onSelectStudy).toHaveBeenCalled();
  });

  it('should call onSelectExam when clicking exam card', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    const examCard = screen.getByText('Изпит').closest('[class*="cursor-pointer"]');
    if (examCard) {
      fireEvent.click(examCard);
    }

    expect(onSelectExam).toHaveBeenCalled();
  });

  it('should call onLogout when clicking logout button', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    const logoutButton = screen.getByText('Изход');
    fireEvent.click(logoutButton);

    expect(onLogout).toHaveBeenCalled();
  });

  it('should show study progress when there is progress', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressWithProgress}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText(/38% завършено/)).toBeInTheDocument();
  });

  it('should show start message when no study progress', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Започни да учиш')).toBeInTheDocument();
  });

  it('should show exam stats when there is history', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryWithEntries}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('2 изпита')).toBeInTheDocument();
    expect(screen.getByText('Най-добър: 90%')).toBeInTheDocument();
  });

  it('should show start message when no exam history', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Направи първия си изпит')).toBeInTheDocument();
  });

  it('should show singular exam text for single exam', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={[mockHistoryWithEntries[0]]}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('1 изпит')).toBeInTheDocument();
  });

  it('should render study card descriptions', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Преглед на въпросите по раздели с показани верни отговори.')).toBeInTheDocument();
    expect(screen.getByText('Всички въпроси')).toBeInTheDocument();
    expect(screen.getByText('Без таймер')).toBeInTheDocument();
  });

  it('should render exam card descriptions', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={mockStudyProgressEmpty}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Симулиран изпит с таймер и оценяване.')).toBeInTheDocument();
    expect(screen.getByText('45 минути')).toBeInTheDocument();
    expect(screen.getByText('90 въпроса')).toBeInTheDocument();
  });

  it('should handle empty studyProgress array (zero total questions)', () => {
    const onSelectStudy = vi.fn();
    const onSelectExam = vi.fn();
    const onLogout = vi.fn();

    render(
      <ModeSelectView
        user={mockUser}
        studyProgress={[]}
        history={mockHistoryEmpty}
        onSelectStudy={onSelectStudy}
        onSelectExam={onSelectExam}
        onLogout={onLogout}
      />
    );

    // When there's no progress data, should show start message
    expect(screen.getByText('Започни да учиш')).toBeInTheDocument();
  });
});
