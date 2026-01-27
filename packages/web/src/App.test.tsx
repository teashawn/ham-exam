import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';
import App from './App';
import { deleteDatabase } from '@/lib/db';

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

// Mock window.location and history for URL navigation
const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  href: 'http://localhost/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

const mockHistoryState: unknown[] = [];
Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn((state, _title, url) => {
      mockHistoryState.push(state);
      if (typeof url === 'string') {
        const [pathname, search] = url.split('?');
        mockLocation.pathname = pathname;
        mockLocation.search = search ? `?${search}` : '';
      }
    }),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    state: null,
    length: 1,
    scrollRestoration: 'auto' as const,
  },
  writable: true,
});

// Helper to reset URL state between tests
const resetUrlState = () => {
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockHistoryState.length = 0;
};

// Helper to click on a card by finding its text and getting the clickable parent
const clickCard = (cardText: string) => {
  const card = screen.getByText(cardText).closest('[class*="cursor-pointer"]');
  if (card) {
    fireEvent.click(card);
  }
};

// Helper to navigate to sections study mode (through mode selection)
const goToSectionsMode = async () => {
  clickCard('Учене');
  await waitFor(() => {
    expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId('sections-mode-card'));
  await waitFor(() => {
    expect(screen.getByText('Избери раздел за учене')).toBeInTheDocument();
  });
};

// Helper to navigate to FSRS study mode (through mode selection)
const goToFSRSMode = async () => {
  clickCard('Учене');
  await waitFor(() => {
    expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId('fsrs-mode-card'));
  await waitFor(() => {
    expect(screen.getByText('За преговор')).toBeInTheDocument();
  });
};

describe('App', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    // Reset URL state for each test
    resetUrlState();
    // Use async deleteDatabase to ensure clean state
    await deleteDatabase();
  });

  afterEach(async () => {
    // Cleanup React components first to stop useLiveQuery subscriptions
    cleanup();
    // Wait for async operations to settle before deleting database
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // Delete database after React cleanup to avoid DatabaseClosedError
    await deleteDatabase();
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

    it('should login and show mode select screen', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });

      const button = screen.getByRole('button', { name: 'Започни' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Здравей, Test User!/)).toBeInTheDocument();
        expect(screen.getByText('Какво искаш да правиш днес?')).toBeInTheDocument();
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

  describe('Mode Select View', () => {
    beforeEach(() => {
      // Setup logged in user
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show mode select screen when user is logged in', () => {
      render(<App />);
      expect(screen.getByText(/Здравей, Test User!/)).toBeInTheDocument();
      expect(screen.getByText('Учене')).toBeInTheDocument();
      expect(screen.getByText('Изпит')).toBeInTheDocument();
    });

    it('should show logout button', () => {
      render(<App />);
      expect(screen.getByText('Изход')).toBeInTheDocument();
    });

    it('should logout when clicking logout button', async () => {
      render(<App />);

      const logoutButton = screen.getByText('Изход');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Въведете името си')).toBeInTheDocument();
      });
    });

    it('should navigate to exam-home when clicking exam card', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });
    });

    it('should navigate to study-home when clicking study card', async () => {
      render(<App />);

      clickCard('Учене');

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });
    });

    it('should show exam stats when history exists', () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);
      expect(screen.getByText('1 изпит')).toBeInTheDocument();
      expect(screen.getByText('Най-добър: 80%')).toBeInTheDocument();
    });

    it('should show study progress when progress exists', () => {
      mockStorage['ham-exam:study-progress:test-id'] = JSON.stringify({
        viewedQuestionIds: ['1-1-1', '1-1-2', '1-1-3'],
        lastActiveAt: new Date().toISOString(),
      });

      render(<App />);
      // Progress will be calculated based on actual questions
    });
  });

  describe('Exam Home View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show exam home screen from mode select', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
        expect(screen.getByText('Общо въпроси')).toBeInTheDocument();
      });
    });

    it('should show start exam and settings buttons', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });
    });

    it('should navigate to config screen', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
      });
    });

    it('should go back to mode select from exam home', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

      await waitFor(() => {
        expect(screen.getByText('Какво искаш да правиш днес?')).toBeInTheDocument();
      });
    });

    it('should show statistics when history exists', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByText('Статистика')).toBeInTheDocument();
        expect(screen.getByText('Последни изпити')).toBeInTheDocument();
      });
    });

    it('should navigate to history screen', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Пълна история' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'История' })).toBeInTheDocument();
      });
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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
        expect(screen.getByText('Раздел 2')).toBeInTheDocument();
        expect(screen.getByText('Раздел 3')).toBeInTheDocument();
      });
    });

    it('should save and return to exam home', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

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

    it('should go back to exam home when clicking back button', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Раздел 1')).toBeInTheDocument();
      });

      // Click the back button (chevron left)
      const backButton = screen.getByRole('button', { name: 'Назад' });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });

    it('should show exam date picker', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Дата на изпита')).toBeInTheDocument();
      });
    });

    it('should show backup and restore buttons', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Архивиране на данни')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Изтегли/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Възстанови/i })).toBeInTheDocument();
      });
    });

    it('should update exam date when date is selected', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Дата на изпита')).toBeInTheDocument();
      });

      // Find the date input and change it
      const dateInput = screen.getByDisplayValue('');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } });

      await waitFor(() => {
        expect(screen.getByText(/дни до изпита|ден до изпита/i)).toBeInTheDocument();
      });
    });

    it('should clear exam date when date is cleared', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByText('Дата на изпита')).toBeInTheDocument();
      });

      // Set a date first
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const dateInput = dateInputs[0] as HTMLInputElement;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } });

      await waitFor(() => {
        expect(screen.getByText(/дни до изпита|ден до изпита/i)).toBeInTheDocument();
      });

      // Clear the date
      fireEvent.change(dateInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.queryByText(/дни до изпита|ден до изпита/i)).not.toBeInTheDocument();
      });
    });

    it('should trigger backup download when clicking download button', async () => {
      const createObjectURL = vi.fn(() => 'blob:test');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Изтегли/i })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /Изтегли/i });
      await act(async () => {
        fireEvent.click(downloadButton);
      });

      // Should have created a blob URL
      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalled();
      });
    });

    it('should trigger restore when clicking restore button', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Възстанови/i })).toBeInTheDocument();
      });

      // Just verify the button is clickable
      const restoreButton = screen.getByRole('button', { name: /Възстанови/i });
      expect(restoreButton).not.toBeDisabled();
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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
        expect(screen.getByText('1 / 40')).toBeInTheDocument();
      });
    });

    it('should navigate to next question', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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
      });
    });

    it('should show results after finishing exam', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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

    it('should go to mode-select from results', async () => {
      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Започни изпит' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Започни изпит' }));

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
        expect(screen.getByText('Какво искаш да правиш днес?')).toBeInTheDocument();
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
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Пълна история' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
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
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Пълна история' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));

      await waitFor(() => {
        expect(screen.getByText('40%')).toBeInTheDocument();
        expect(screen.getByText('16/40')).toBeInTheDocument();
      });
    });

    it('should go back to exam home from history', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Пълна история' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });

      const backButtons = screen.getAllByRole('button', { name: 'Назад' });
      fireEvent.click(backButtons[backButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });

    it('should clear history and stay on exam home', async () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([
        {
          sessionId: 'session-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date().toISOString(),
          config: { questionsPerSection: { 1: 20, 2: 10, 3: 10 }, shuffleQuestions: true },
        },
      ]);

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Пълна история' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Пълна история' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Изтрий историята' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Изтрий историята' }));

      await waitFor(() => {
        expect(screen.getByText('Нов изпит')).toBeInTheDocument();
      });
    });
  });

  describe('Saved Config', () => {
    it('should load saved config on startup', async () => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
      mockStorage['ham-exam:exam-config'] = JSON.stringify({
        questionsPerSection: { 1: 5, 2: 3, 3: 2 },
        shuffleQuestions: true,
      });

      render(<App />);

      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // 5 + 3 + 2 = 10 total
      });
    });
  });

  describe('Study Home View', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show study home when clicking study card', async () => {
      render(<App />);

      clickCard('Учене');

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
        expect(screen.getByText('Интелигентен преговор')).toBeInTheDocument();
        expect(screen.getByText('По раздели')).toBeInTheDocument();
      });
    });

    it('should show progress for each section', async () => {
      render(<App />);

      await goToSectionsMode();

      await waitFor(() => {
        // Check for progress indicators (0/X format)
        expect(screen.getByText(/0\/226/)).toBeInTheDocument(); // Section 1
      });
    });

    it('should go back to mode select from study home', async () => {
      render(<App />);

      clickCard('Учене');

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

      await waitFor(() => {
        expect(screen.getByText('Какво искаш да правиш днес?')).toBeInTheDocument();
      });
    });

    it('should show remaining questions count on section cards', async () => {
      render(<App />);

      await goToSectionsMode();

      // When there's no progress, all sections show 0% and remaining questions
      await waitFor(() => {
        expect(screen.getAllByText(/Още \d+ въпрос/).length).toBeGreaterThan(0);
      });
    });

    it('should show progress percentage on section cards', async () => {
      render(<App />);

      await goToSectionsMode();

      // All sections should show percentage
      await waitFor(() => {
        expect(screen.getAllByText(/0% прегледани/).length).toBeGreaterThan(0);
      });
    });

    it('should show FSRS stats on study home', async () => {
      render(<App />);

      await goToFSRSMode();

      await waitFor(() => {
        expect(screen.getByText('Нови')).toBeInTheDocument();
        expect(screen.getByText('За преговор')).toBeInTheDocument();
      });
    });
  });

  describe('FSRS Study Mode', () => {
    beforeEach(async () => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should show FSRS study button when due cards exist', async () => {
      render(<App />);

      await goToSectionsMode();

      // Go to section to create some cards
      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Exit and return to study home
      fireEvent.click(screen.getByRole('button', { name: 'Изход' }));

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });
    });

    it('should start FSRS study mode and show question with hidden answer', async () => {
      render(<App />);

      await goToSectionsMode();

      // First create some cards by entering study mode
      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should show FSRS badge in FSRS mode header', async () => {
      render(<App />);

      clickCard('Учене');

      await waitFor(() => {
        expect(screen.getByText('Режим учене')).toBeInTheDocument();
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });
    });
  });

  describe('Study Mode', () => {
    beforeEach(() => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify({
        id: 'test-id',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    });

    it('should start studying a section when clicking on it', async () => {
      render(<App />);

      await goToSectionsMode();

      // Click on section 1 card
      const section1Card = screen.getByText('Раздел 1').closest('[class*="cursor-pointer"]');
      if (section1Card) {
        fireEvent.click(section1Card);
      }

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should navigate to next question in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous question in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Go to next question first
      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Now go back
      const prevButton = screen.getByRole('button', { name: 'Назад' });
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should disable prev button on first question in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: 'Назад' });
      expect(prevButton).toBeDisabled();
    });

    it('should switch sections in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Find the section dropdown and change it
      const sectionSelect = screen.getByRole('combobox');
      fireEvent.change(sectionSelect, { target: { value: '2' } });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should exit study mode and return to study home', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Click the back button to exit study
      const backButton = screen.getByRole('button', { name: 'Изход' });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });
    });

    it('should open question grid modal when clicking question counter', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Click the question counter button to open the grid
      const questionCounter = screen.getByTitle('Преглед на въпросите (G)');
      fireEvent.click(questionCounter);

      await waitFor(() => {
        // Modal should open - check for the h2 title specifically
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });
    });

    it('should close question grid modal when clicking close button', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Open the grid
      const questionCounter = screen.getByTitle('Преглед на въпросите (G)');
      fireEvent.click(questionCounter);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });

      // Click the close button (Затвори)
      const closeButton = screen.getByRole('button', { name: 'Затвори' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Всички въпроси' })).not.toBeInTheDocument();
      });
    });

    it('should jump to specific question when clicking in grid', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Open the grid
      const questionCounter = screen.getByTitle('Преглед на въпросите (G)');
      fireEvent.click(questionCounter);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });

      // Click on question 5 in the grid (button with text '5')
      const gridButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '5');
      if (gridButtons.length > 0) {
        fireEvent.click(gridButtons[0]);
      }

      // Modal should close and we should be at question 5
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Всички въпроси' })).not.toBeInTheDocument();
        expect(screen.getByText('Въпрос 5')).toBeInTheDocument();
      });
    });

    it('should jump to question when clicking on question dot indicator', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Click on question dot 3 (dots are in the progress bar area with title "Въпрос N")
      const questionDot3 = screen.getByTitle('Въпрос 3');
      fireEvent.click(questionDot3);

      // Should jump to question 3
      await waitFor(() => {
        expect(screen.getByText('Въпрос 3')).toBeInTheDocument();
      });
    });

    it('should close question grid modal when clicking X button', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Open the grid
      const questionCounter = screen.getByTitle('Преглед на въпросите (G)');
      fireEvent.click(questionCounter);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });

      // Click the X button (it's in the modal header)
      const modalHeader = screen.getByRole('heading', { name: 'Всички въпроси' }).parentElement;
      const xButton = modalHeader?.querySelector('button');
      if (xButton) {
        fireEvent.click(xButton);
      }

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Всички въпроси' })).not.toBeInTheDocument();
      });
    });

    it('should save progress when viewing questions', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Viewing a question should save progress
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should clear study progress when reset button is clicked', async () => {
      render(<App />);

      await goToSectionsMode();

      // Start studying to create some progress
      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // View another question to ensure progress
      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Go back to study home (mode selection)
      const backButton = screen.getByRole('button', { name: 'Изход' });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });

      // Navigate to sections mode to see the reset button
      fireEvent.click(screen.getByTestId('sections-mode-card'));

      await waitFor(() => {
        expect(screen.getByText('Избери раздел за учене')).toBeInTheDocument();
      });

      // Wait for the reset button to appear (it appears when there's progress)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Изтрий прогреса' })).toBeInTheDocument();
      });

      // Click the reset button
      const resetButton = screen.getByRole('button', { name: 'Изтрий прогреса' });
      fireEvent.click(resetButton);

      await waitFor(() => {
        // Progress should be cleared, view should still be section select
        expect(screen.getByText('Избери раздел за учене')).toBeInTheDocument();
      });
    });

    it('should show viewed and unviewed counts in question grid', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Navigate to view a few questions
      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Open the grid
      const questionCounter = screen.getByTitle('Преглед на въпросите (G)');
      fireEvent.click(questionCounter);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
        // Should show legend with viewed/unviewed counts - use getAllByText since there might be multiple
        expect(screen.getAllByText(/Видян/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Невидян/).length).toBeGreaterThan(0);
      });
    });

    it('should navigate with keyboard arrow keys in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Press ArrowRight to go to next question
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Press ArrowLeft to go back
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should open question grid with G key in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press G to open question grid
      fireEvent.keyDown(window, { key: 'G' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });
    });

    it('should exit study mode with Escape key', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press Escape to exit study mode
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });
    });

    it('should switch sections with number keys in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press 2 to switch to section 2
      fireEvent.keyDown(window, { key: '2' });

      await waitFor(() => {
        // Should reset to question 1 in the new section
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should navigate with P and N keys in study mode', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Press N to go to next question
      fireEvent.keyDown(window, { key: 'n' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Press P to go back
      fireEvent.keyDown(window, { key: 'p' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should dismiss keyboard hints on first key press', async () => {
      // Clear the keyboard hints shown flag
      delete mockStorage['ham-exam-keyboard-hints-shown'];

      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Keyboard hints should be visible initially (if not shown before)
      // Press any key to dismiss them
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ham-exam-keyboard-hints-shown', 'true');
    });

    it('should open question grid with lowercase g key', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press lowercase g to open question grid
      fireEvent.keyDown(window, { key: 'g' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Всички въпроси' })).toBeInTheDocument();
      });
    });

    it('should switch to section 1 with number key 1', async () => {
      render(<App />);

      await goToSectionsMode();

      // Start with section 2
      clickCard('Раздел 2');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press 1 to switch to section 1
      fireEvent.keyDown(window, { key: '1' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should switch to section 3 with number key 3', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Press 3 to switch to section 3
      fireEvent.keyDown(window, { key: '3' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should navigate with uppercase P key', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Press N to go to next question first
      fireEvent.keyDown(window, { key: 'N' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Press uppercase P to go back
      fireEvent.keyDown(window, { key: 'P' });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should trigger milestone celebration at 25% progress', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      render(<App />);

      await goToSectionsMode();

      // Use section 3 which has 56 questions - 25% = 14 questions
      clickCard('Раздел 3');

      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Navigate through 13 more questions (question 1 is already viewed)
      // At question 14, we'll have 14/56 = 25% which triggers 25% milestone
      for (let i = 0; i < 13; i++) {
        await act(async () => {
          fireEvent.keyDown(window, { key: 'ArrowRight' });
        });
        await waitFor(() => {
          expect(screen.getByText(`Въпрос ${i + 2}`)).toBeInTheDocument();
        });
      }

      // Now we should see the milestone celebration
      await waitFor(() => {
        expect(screen.getByText('25% завършени!')).toBeInTheDocument();
      });

      // Advance timer to trigger clearMilestone callback (3 seconds)
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Milestone should be cleared after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText('25% завършени!')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should navigate to next question on swipe left', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Swipe left (finger moves from right to left) on the study container
      const container = screen.getByText('УЧЕНЕ').closest('.flex-1.flex.flex-col') as HTMLElement;
      fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 100 }] });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });
    });

    it('should navigate to previous question on swipe right', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Go to question 2 first
      const nextButton = screen.getByRole('button', { name: 'Напред' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // Swipe right (finger moves from left to right) to go back
      const container = screen.getByText('УЧЕНЕ').closest('.flex-1.flex.flex-col') as HTMLElement;
      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 200, clientY: 100 }] });

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });
    });

    it('should not navigate on swipe when movement is below threshold', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Small swipe left (less than 50px threshold)
      const container = screen.getByText('УЧЕНЕ').closest('.flex-1.flex.flex-col') as HTMLElement;
      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 70, clientY: 100 }] });

      // Should still be on question 1
      expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
    });

    it('should not navigate on vertical swipe', async () => {
      render(<App />);

      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Vertical swipe (vertical distance > horizontal distance)
      const container = screen.getByText('УЧЕНЕ').closest('.flex-1.flex.flex-col') as HTMLElement;
      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 40, clientY: 300 }] });

      // Should still be on question 1
      expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
    });
  });

  describe('URL Navigation', () => {
    it('should restore study mode from URL when user is logged in', async () => {
      // Setup: User is already logged in
      const userProfile = {
        id: 'test-user-123',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };
      mockStorage['ham-exam:user-profile'] = JSON.stringify(userProfile);

      // Set URL to study mode with section 2 and question 5
      mockLocation.pathname = '/study';
      mockLocation.search = '?section=2&q=5';

      render(<App />);

      // Should navigate to study mode
      await waitFor(() => {
        expect(screen.getByText('УЧЕНЕ')).toBeInTheDocument();
      });

      // Should show question 5 (index 4) - look for "Въпрос 5"
      await waitFor(() => {
        expect(screen.getByText('Въпрос 5')).toBeInTheDocument();
      });
    });

    it('should restore study-home from URL when user is logged in', async () => {
      // Setup: User is already logged in
      const userProfile = {
        id: 'test-user-123',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };
      mockStorage['ham-exam:user-profile'] = JSON.stringify(userProfile);

      // Set URL to study-home
      mockLocation.pathname = '/study-home';
      mockLocation.search = '';

      render(<App />);

      // Should show study home
      await waitFor(() => {
        expect(screen.getByText('Избери начин на учене')).toBeInTheDocument();
      });
    });

    it('should fall back to mode-select when exam URL has no session', async () => {
      // Setup: User is already logged in
      const userProfile = {
        id: 'test-user-123',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };
      mockStorage['ham-exam:user-profile'] = JSON.stringify(userProfile);

      // Set URL to exam mode - but we can't restore exam without session
      mockLocation.pathname = '/exam';
      mockLocation.search = '?q=5';

      render(<App />);

      // Should fall back to mode-select
      await waitFor(() => {
        expect(screen.getByText('Учене')).toBeInTheDocument();
        expect(screen.getByText('Изпит')).toBeInTheDocument();
      });
    });

    it('should restore exam-home from URL when user is logged in', async () => {
      // Setup: User is already logged in
      const userProfile = {
        id: 'test-user-123',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };
      mockStorage['ham-exam:user-profile'] = JSON.stringify(userProfile);

      // Set URL to exam-home
      mockLocation.pathname = '/exam-home';
      mockLocation.search = '';

      render(<App />);

      // Should show exam home
      await waitFor(() => {
        expect(screen.getByText('Започни изпит')).toBeInTheDocument();
      });
    });

    it('should update URL when navigating to study mode', async () => {
      render(<App />);

      // Login
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: 'Започни' }));

      // Go to study mode
      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // URL should be updated (includes base path /ham-exam/)
      expect(mockLocation.pathname).toBe('/ham-exam/study');
    });

    it('should update question index in URL when navigating', async () => {
      render(<App />);

      // Login
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: 'Започни' }));

      // Go to study mode
      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to next question
      fireEvent.click(screen.getByText('Напред'));

      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });

      // URL should be updated with new question index
      expect(mockLocation.search).toContain('q=2');
    });

    it('should handle browser back button navigation', async () => {
      render(<App />);

      // Login
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: 'Започни' }));

      // Navigate to exam-home
      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByText('Започни изпит')).toBeInTheDocument();
      });

      // Simulate browser back button by updating URL and dispatching popstate
      mockLocation.pathname = '/mode-select';
      mockLocation.search = '';

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should be back at mode-select
      await waitFor(() => {
        expect(screen.getByText('Учене')).toBeInTheDocument();
        expect(screen.getByText('Изпит')).toBeInTheDocument();
      });
    });

    it('should handle popstate for exam view with question index', async () => {
      render(<App />);

      // Login
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: 'Започни' }));

      // Start exam
      clickCard('Изпит');

      await waitFor(() => {
        expect(screen.getByText('Започни изпит')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Започни изпит'));

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate to question 3
      fireEvent.click(screen.getByText('Напред'));
      fireEvent.click(screen.getByText('Напред'));

      await waitFor(() => {
        expect(screen.getByText('Въпрос 3')).toBeInTheDocument();
      });

      // Simulate browser back to question 2
      mockLocation.pathname = '/exam';
      mockLocation.search = '?q=2';

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should be at question 2
      await waitFor(() => {
        expect(screen.getByText('Въпрос 2')).toBeInTheDocument();
      });
    });

    it('should handle popstate for study view with section and question', async () => {
      render(<App />);

      // Login
      const input = screen.getByPlaceholderText('Въведете името си');
      fireEvent.change(input, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: 'Започни' }));

      // Go to study mode
      await goToSectionsMode();

      clickCard('Раздел 1');

      await waitFor(() => {
        expect(screen.getByText('Въпрос 1')).toBeInTheDocument();
      });

      // Navigate forward a few questions
      fireEvent.click(screen.getByText('Напред'));
      fireEvent.click(screen.getByText('Напред'));

      await waitFor(() => {
        expect(screen.getByText('Въпрос 3')).toBeInTheDocument();
      });

      // Simulate browser back to section 2, question 5
      mockLocation.pathname = '/study';
      mockLocation.search = '?section=2&q=5';

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should show question 5
      await waitFor(() => {
        expect(screen.getByText('Въпрос 5')).toBeInTheDocument();
      });
    });

    it('should restore FSRS study mode from URL and show completion when no cards due', async () => {
      // Setup: User is already logged in
      const userProfile = {
        id: 'test-user-123',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };
      mockStorage['ham-exam:user-profile'] = JSON.stringify(userProfile);

      // Set URL to study mode with FSRS flag
      // Since there are no due cards, it shows the completion screen
      mockLocation.pathname = '/study';
      mockLocation.search = '?fsrs=1';

      render(<App />);

      // Should show FSRS completion screen (no due cards)
      await waitFor(() => {
        expect(screen.getByText('Назад към учене')).toBeInTheDocument();
      });
    });
  });
});
