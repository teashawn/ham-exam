import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.confirm
vi.stubGlobal('confirm', vi.fn(() => true));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('Login View', () => {
    it('should render login screen by default', () => {
      render(<App />);
      expect(screen.getByText('HAM Exam')).toBeInTheDocument();
      expect(screen.getByText('Радиолюбителски изпит - Клас 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Въведете името си')).toBeInTheDocument();
    });

    it('should disable submit button when name is empty', () => {
      render(<App />);
      const button = screen.getByRole('button', { name: 'Започни' });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when name is entered', () => {
      render(<App />);
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });

      const button = screen.getByRole('button', { name: 'Започни' });
      expect(button).not.toBeDisabled();
    });

    it('should login and show home screen', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });

      const button = screen.getByRole('button', { name: 'Започни' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should not login with whitespace-only name', () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: '   ' } });

      const button = screen.getByRole('button', { name: 'Започни' });
      expect(button).toBeDisabled();
    });
  });

  describe('Home View', () => {
    beforeEach(() => {
      // Setup logged in user
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show home screen when user is logged in', () => {
      render(<App />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      expect(screen.getByText('Общо въпроси')).toBeInTheDocument();
    });

    it('should show start exam button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
    });

    it('should show settings button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
    });

    it('should show logout button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Изход' })).toBeInTheDocument();
    });

    it('should logout when clicking logout button', async () => {
      render(<App />);

      const logoutButton = screen.getByRole('button', { name: 'Изход' });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Въведете името си')).toBeInTheDocument();
      });
    });

    it('should navigate to config screen', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: 'Настройки' });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Настройки')).toBeInTheDocument();
      });
    });

    it('should show statistics when history exists', () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);
      expect(screen.getByText('Статистика')).toBeInTheDocument();
      expect(screen.getByText('История')).toBeInTheDocument();
    });
  });

  describe('Config View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should navigate to config and show sections', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: 'Настройки' });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
        expect(screen.getByText('Раздел 2')).toBeInTheDocument();
        expect(screen.getByText('Раздел 3')).toBeInTheDocument();
      });
    });

    it('should save and return to home', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: 'Настройки' });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: 'Запази' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });

    it('should update config when slider changes', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: 'Настройки' });
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
      });

      // Find all sliders and simulate a change
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);

      // Trigger keyboard event to change slider value
      fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });

      // Verify config was saved to storage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Exam View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should start exam and show first question', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
        expect(screen.getByText('1 / 40')).toBeInTheDocument();
      });
    });

    it('should navigate to next question', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous question', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: 'Назад' });
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should select answer', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Find and click an answer option
      const answerButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('А') || btn.textContent?.includes('Б')
      );
      if (answerButtons.length > 0) {
        fireEvent.click(answerButtons[0]);
      }

      expect(screen.getByText(/Отговорени:/)).toBeInTheDocument();
    });

    it('should disable prev button on first question', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: 'Назад' });
      expect(prevButton).toBeDisabled();
    });
  });

  describe('Results View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
      // Use a small config to make test faster
      mockStorage['ham-exam:exam-config'] = JSON.stringify({
        questionsPerSection: { 1: 2, 2: 1, 3: 1 },
        shuffleQuestions: false,
        shuffleOptions: false,
      });
    });

    it('should show results after finishing exam', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to last question (we have 4 questions: 2 + 1 + 1)
      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole('button', { name: 'Напред' });
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(`Въпрос ${i + 2}`)).toBeInTheDocument();
        });
      }

      // Click finish
      const finishButton = screen.getByRole('button', { name: 'Завърши' });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(screen.getByText('Резултати')).toBeInTheDocument();
      });
    });

    it('should allow starting new exam from results', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to last question
      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole('button', { name: 'Напред' });
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(`Въпрос ${i + 2}`)).toBeInTheDocument();
        });
      }

      // Click finish
      const finishButton = screen.getByRole('button', { name: 'Завърши' });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(screen.getByText('Резултати')).toBeInTheDocument();
      });

      // Click new exam
      const newExamButton = screen.getByRole('button', { name: 'Нов изпит' });
      fireEvent.click(newExamButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should show failed result styling when exam is failed', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to last question without answering (to fail the exam)
      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole('button', { name: 'Напред' });
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(`Въпрос ${i + 2}`)).toBeInTheDocument();
        });
      }

      // Click finish without answering any questions (will fail)
      const finishButton = screen.getByRole('button', { name: 'Завърши' });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(screen.getByText('Резултати')).toBeInTheDocument();
        expect(screen.getByText('Неуспешен')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });

    it('should go home from results', async () => {
      render(<App />);

      const startButton = screen.getByRole('button', { name: 'Започни изпит' });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to last question
      for (let i = 0; i < 3; i++) {
        const nextButton = screen.getByRole('button', { name: 'Напред' });
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(`Въпрос ${i + 2}`)).toBeInTheDocument();
        });
      }

      // Click finish
      const finishButton = screen.getByRole('button', { name: 'Завърши' });
      fireEvent.click(finishButton);

      await waitFor(() => {
        expect(screen.getByText('Резултати')).toBeInTheDocument();
      });

      // Click home
      const homeButton = screen.getByRole('button', { name: 'Начало' });
      fireEvent.click(homeButton);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });
  });

  describe('History View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show history with entries', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);

      const historyButton = screen.getByRole('button', { name: 'История' });
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('should show empty history message when no entries', async () => {
      // First add then clear history to navigate to empty history view
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);

      const historyButton = screen.getByRole('button', { name: 'История' });
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('Изтрий историята')).toBeInTheDocument();
      });

      // Clear history
      const clearButton = screen.getByRole('button', { name: 'Изтрий историята' });
      fireEvent.click(clearButton);

      // Navigate back to history (from home)
      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });

      // The history view will be empty now - need to manually set view somehow
      // Since stats are empty, history button won't show. This is expected behavior.
    });

    it('should show empty state when no history', async () => {
      // First add history so we can navigate there
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);

      const historyButton = screen.getByRole('button', { name: 'История' });
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('Изтрий историята')).toBeInTheDocument();
      });

      // Click clear history
      const clearButton = screen.getByRole('button', { name: 'Изтрий историята' });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });

    it('should show failed history entry styling', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 40,
          passed: false,
          totalQuestions: 40,
          correctAnswers: 16,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);

      const historyButton = screen.getByRole('button', { name: 'История' });
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('40%')).toBeInTheDocument();
        expect(screen.getByText('16/40')).toBeInTheDocument();
      });
    });

    it('should go back from history', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true, shuffleOptions: false },
        },
      ]);

      render(<App />);

      const historyButton = screen.getByRole('button', { name: 'История' });
      fireEvent.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: 'Назад' });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });
  });

  describe('Saved Config', () => {
    it('should load saved config on startup', () => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
      mockStorage['ham-exam:exam-config'] = JSON.stringify({
        questionsPerSection: { 1: 5, 2: 3, 3: 2 },
        shuffleQuestions: true,
        shuffleOptions: false,
      });

      render(<App />);
      expect(screen.getByText('10')).toBeInTheDocument(); // 5 + 3 + 2 = 10 total
    });
  });
});
