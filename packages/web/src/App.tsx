import { useState, useEffect, useCallback, useRef } from 'react';
import { useSwipe } from './hooks/useSwipe';
import { useUrlNavigation, parseUrl, type UrlState } from './hooks/useUrlNavigation';
import type {
  ExamConfig,
  ExamData,
  ExamResult,
  ExamSession,
  UserProfile,
  AnswerLetter,
  StudySession,
  StudyProgress,
  FSRSRating,
  SchedulingPreview,
} from '@ham-exam/exam-core';
import {
  DEFAULT_EXAM_CONFIG,
  createExamSession,
  recordAnswer,
  completeExam,
  getExamProgress,
  createStudySession,
  markQuestionViewed,
  getStudyProgress,
  getStudySectionQuestions,
  loadViewedQuestions,
} from '@ham-exam/exam-core';
import {
  loadUserProfile,
  saveUserProfile,
  createUserProfile,
  clearUserProfile,
  loadExamConfig,
  saveExamConfig,
  loadExamHistory,
  addToHistory,
  calculateHistoryStats,
  clearExamHistory,
  saveStudyProgress,
  loadStudyProgress,
  clearStudyProgress,
} from './lib/storage';
import { initTheme } from './lib/theme';
import type { AppView } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Radio, Trophy, ChevronLeft, ChevronRight, Check, GraduationCap, Eye, Grid3X3, X, History, BarChart3, Calendar, Download, Upload, AlertTriangle } from 'lucide-react';
import { SectionSelect } from '@/components/ui/section-select';
import { ModeSelectView } from '@/components/ModeSelectView';
import { ExamHomeView, type HistoryStats } from '@/components/ExamHomeView';
import { StudyHomeView } from '@/components/StudyHomeView';
import { StudyGradeButtons } from '@/components/StudyGradeButtons';
import { useSRS } from '@/hooks/useSRS';
import examDataJson from './data/exam-questions.json';

const examData = examDataJson as ExamData;

function App() {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loginName, setLoginName] = useState('');

  // Study mode state
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [studyQuestionIndex, setStudyQuestionIndex] = useState(0);
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(() => {
    return localStorage.getItem('ham-exam-keyboard-hints-shown') !== 'true';
  });
  const [milestoneReached, setMilestoneReached] = useState<number | null>(null);

  // FSRS study mode state
  const [fsrsStudyMode, setFsrsStudyMode] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<SchedulingPreview | null>(null);

  // URL navigation state
  const urlInitialized = useRef(false);
  const pendingUrlState = useRef<UrlState | null>(null);

  // Get all questions for useSRS hook
  const allQuestions = examData.sections.flatMap(s => s.questions);

  // FSRS hook - only active when we have a user
  const srs = useSRS({
    profileId: user?.id ?? 'anonymous',
    questions: allQuestions,
  });

  // Handle URL changes (browser back/forward)
  const handleUrlChange = useCallback((urlState: UrlState) => {
    // Store pending state to be applied after data is loaded
    /* c8 ignore next 4 - defensive check for race condition */
    if (!urlInitialized.current) {
      pendingUrlState.current = urlState;
      return;
    }

    setView(urlState.view);

    if (urlState.view === 'exam' && urlState.questionIndex !== undefined) {
      setCurrentQuestionIndex(urlState.questionIndex);
    }

    if (urlState.view === 'study') {
      if (urlState.sectionNumber !== undefined) {
        setStudySession(prev => {
          /* c8 ignore next - defensive null check */
          if (!prev) return prev;
          return { ...prev, currentSectionNumber: urlState.sectionNumber! };
        });
      }
      if (urlState.questionIndex !== undefined) {
        setStudyQuestionIndex(urlState.questionIndex);
      }
      setFsrsStudyMode(urlState.fsrsMode ?? false);
    }
  }, []);

  // URL navigation hook
  useUrlNavigation({
    view,
    questionIndex: view === 'exam' ? currentQuestionIndex : studyQuestionIndex,
    sectionNumber: studySession?.currentSectionNumber,
    fsrsMode: fsrsStudyMode,
    onUrlChange: handleUrlChange,
  });

  // Initialize study session helper
  const initializeStudySessionHelper = useCallback((userProfile: UserProfile, sectionNumber?: number) => {
    const newSession = createStudySession(examData, { sectionNumber: sectionNumber ?? 0 }, userProfile.id);
    const savedProgress = loadStudyProgress(userProfile.id);
    if (savedProgress) {
      loadViewedQuestions(newSession, savedProgress.viewedQuestionIds);
    }
    setStudySession(newSession);
    setStudyProgress(getStudyProgress(newSession, examData));
    return newSession;
  }, []);

  // Main initialization effect
  useEffect(() => {
    // Initialize theme on mount
    initTheme();

    const savedConfig = loadExamConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }

    // Parse initial URL state
    const urlState = parseUrl();
    const savedUser = loadUserProfile();

    if (savedUser) {
      setUser(savedUser);

      // Apply URL state if user is logged in and URL has a valid view
      if (urlState.view !== 'login') {
        // Initialize study session with section from URL if applicable
        const sectionNum = urlState.view === 'study' ? urlState.sectionNumber : undefined;
        initializeStudySessionHelper(savedUser, sectionNum);

        setView(urlState.view);

        // Handle study view state
        if (urlState.view === 'study') {
          if (urlState.questionIndex !== undefined) {
            setStudyQuestionIndex(urlState.questionIndex);
          }
          setFsrsStudyMode(urlState.fsrsMode ?? false);
        }

        // Store pending state for exam (needs session to be created first via user action)
        if (urlState.view === 'exam') {
          pendingUrlState.current = urlState;
          // Fall back to mode-select since we can't restore exam without session
          setView('mode-select');
        }
      } else {
        initializeStudySessionHelper(savedUser);
        setView('mode-select');
      }
    }

    urlInitialized.current = true;
  }, [initializeStudySessionHelper]);

  // Initialize study session for a user (used on login and mode-select)
  const initializeStudySession = useCallback((userProfile: UserProfile) => {
    initializeStudySessionHelper(userProfile);
  }, [initializeStudySessionHelper]);

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    /* c8 ignore next */
    if (!loginName.trim()) return;

    const profile = createUserProfile(loginName.trim());
    saveUserProfile(profile);
    setUser(profile);
    initializeStudySession(profile);
    setView('mode-select');
  }, [loginName, initializeStudySession]);

  const handleLogout = useCallback(() => {
    clearUserProfile();
    setUser(null);
    setView('login');
    setLoginName('');
  }, []);

  const handleConfigChange = useCallback((section: number, value: number) => {
    const newConfig = {
      ...config,
      questionsPerSection: {
        ...config.questionsPerSection,
        [section]: value,
      },
    };
    setConfig(newConfig);
    saveExamConfig(newConfig);
  }, [config]);

  const handleStartExam = useCallback(() => {
    /* c8 ignore next */
    if (!user) return;
    const newSession = createExamSession(examData, config, user.id);
    setSession(newSession);
    setCurrentQuestionIndex(0);
    setResult(null);
    setView('exam');
  }, [config, user]);

  const handleSelectAnswer = useCallback((answer: AnswerLetter) => {
    /* c8 ignore next */
    if (!session) return;
    const question = session.questions[currentQuestionIndex];
    recordAnswer(session, question.id, answer);
    setSession({ ...session });
  }, [session, currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    /* c8 ignore next */
    if (!session) return;
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [session, currentQuestionIndex]);

  const handlePrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleFinishExam = useCallback(() => {
    /* c8 ignore next */
    if (!session) return;
    const examResult = completeExam(session, examData);
    addToHistory(examResult, config);
    setResult(examResult);
    setView('results');
  }, [session, config]);

  const handleGoHome = useCallback(() => {
    setView('mode-select');
    setSession(null);
    setResult(null);
    setCurrentQuestionIndex(0);
  }, []);

  // Navigation to exam home
  const handleSelectExamMode = useCallback(() => {
    setView('exam-home');
  }, []);

  // Navigation to study home
  const handleSelectStudyMode = useCallback(() => {
    // Initialize FSRS cards for all questions (lazy creation)
    // Fire and forget - cards will be created in background and UI updates reactively
    // Catch errors to avoid unhandled rejections (e.g., during test cleanup)
    srs.initializeCards().catch(() => {/* ignore - database may be closed during cleanup */});
    setView('study-home');
  }, [srs]);

  const handleStartStudy = useCallback((sectionNumber: number) => {
    /* c8 ignore next */
    if (!studySession) return;

    studySession.currentSectionNumber = sectionNumber;
    setStudyQuestionIndex(0);
    setView('study');
  }, [studySession]);

  const handleStudyNextQuestion = useCallback(() => {
    /* c8 ignore next */
    if (!studySession || !user) return;

    const currentSectionQuestions = getStudySectionQuestions(
      studySession,
      examData,
      studySession.currentSectionNumber
    );

    // Mark current question as viewed
    const currentQuestion = currentSectionQuestions[studyQuestionIndex];
    if (currentQuestion) {
      markQuestionViewed(studySession, currentQuestion.id);
      setStudySession({ ...studySession });

      // Save progress
      saveStudyProgress(user.id, Array.from(studySession.viewedQuestions));
    }

    // Move to next question
    if (studyQuestionIndex < currentSectionQuestions.length - 1) {
      setStudyQuestionIndex(studyQuestionIndex + 1);
    }
  }, [studySession, studyQuestionIndex, user]);

  const handleStudyPrevQuestion = useCallback(() => {
    if (studyQuestionIndex > 0) {
      setStudyQuestionIndex(studyQuestionIndex - 1);
    }
  }, [studyQuestionIndex]);

  const handleStudySwitchSection = useCallback((sectionNumber: number) => {
    /* c8 ignore next */
    if (!studySession) return;

    studySession.currentSectionNumber = sectionNumber;
    setStudyQuestionIndex(0);
    setStudySession({ ...studySession });
  }, [studySession]);

  const handleExitStudy = useCallback(() => {
    /* c8 ignore next */
    if (!studySession || !user) return;

    // Save progress before exiting
    saveStudyProgress(user.id, Array.from(studySession.viewedQuestions));

    // Update progress state and return to study home
    setStudyProgress(getStudyProgress(studySession, examData));
    setView('study-home');
    setShowQuestionGrid(false);
  }, [studySession, user]);

  const handleJumpToQuestion = useCallback((index: number) => {
    setStudyQuestionIndex(index);
    setShowQuestionGrid(false);
  }, []);

  const studySwipeHandlers = useSwipe({
    onSwipeLeft: handleStudyNextQuestion,
    onSwipeRight: handleStudyPrevQuestion,
  });

  // Check for milestone achievements
  const checkMilestone = useCallback((viewedCount: number, totalCount: number) => {
    const percentage = Math.round((viewedCount / totalCount) * 100);
    const milestones = [25, 50, 75, 100];

    for (const milestone of milestones) {
      if (percentage >= milestone && ((viewedCount - 1) / totalCount) * 100 < milestone) {
        setMilestoneReached(milestone);
        setTimeout(() => setMilestoneReached(null), 3000);
        break;
      }
    }
  }, []);

  // Keyboard navigation for study mode
  useEffect(() => {
    if (view !== 'study' || !studySession) return;

    const currentSectionQuestions = getStudySectionQuestions(
      studySession,
      examData,
      studySession.currentSectionNumber
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      /* c8 ignore next 3 */
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'p':
        case 'P':
          if (studyQuestionIndex > 0) {
            setStudyQuestionIndex(studyQuestionIndex - 1);
          }
          break;
        case 'ArrowRight':
        case 'n':
        case 'N':
          if (studyQuestionIndex < currentSectionQuestions.length - 1) {
            handleStudyNextQuestion();
          }
          break;
        case '1':
        case '2':
        case '3':
          const sectionNum = parseInt(e.key);
          if (examData.sections.some(s => s.metadata.sectionNumber === sectionNum)) {
            handleStudySwitchSection(sectionNum);
          }
          break;
        case 'Escape':
          handleExitStudy();
          break;
        case 'g':
        case 'G':
          setShowQuestionGrid(true);
          break;
      }

      // Dismiss keyboard hints on first key press
      if (showKeyboardHints) {
        setShowKeyboardHints(false);
        localStorage.setItem('ham-exam-keyboard-hints-shown', 'true');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, studySession, studyQuestionIndex, showKeyboardHints, handleStudyNextQuestion, handleStudySwitchSection, handleExitStudy]);

  // Keyboard navigation for FSRS study mode
  /* c8 ignore start - FSRS keyboard handlers require complex integration test setup with due cards */
  useEffect(() => {
    if (view !== 'study' || !fsrsStudyMode) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space to reveal answer
      if (e.key === ' ' && !answerRevealed) {
        e.preventDefault();
        setAnswerRevealed(true);
        const currentDueCard = srs.getNextDueCard();
        if (currentDueCard) {
          const preview = await srs.getSchedulePreview(currentDueCard.questionId);
          setSchedulePreview(preview);
        }
        return;
      }

      // 1-4 to rate card (only when answer is revealed)
      if (answerRevealed && ['1', '2', '3', '4'].includes(e.key)) {
        const currentDueCard = srs.getNextDueCard();
        if (!currentDueCard) return;
        const rating = parseInt(e.key) as FSRSRating;
        await srs.reviewCard(currentDueCard.questionId, rating);
        setAnswerRevealed(false);
        setSchedulePreview(null);
        return;
      }

      // Escape to exit FSRS study
      if (e.key === 'Escape') {
        setFsrsStudyMode(false);
        setAnswerRevealed(false);
        setSchedulePreview(null);
        setView('study-home');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, fsrsStudyMode, answerRevealed, srs]);
  /* c8 ignore stop */

  const handleResetStudyProgress = useCallback(() => {
    /* c8 ignore next */
    if (!user) return;

    if (confirm('Изтриване на прогреса от ученето?')) {
      clearStudyProgress(user.id);

      // Reset study session
      const newSession = createStudySession(examData, { sectionNumber: 0 }, user.id);
      setStudySession(newSession);
      setStudyProgress(getStudyProgress(newSession, examData));
    }
  }, [user]);

  const totalQuestions = Object.values(config.questionsPerSection).reduce((a, b) => a + b, 0);
  const history = loadExamHistory();
  const stats = calculateHistoryStats(history);

  // Login Screen
  if (view === 'login') {
    return (
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full animate-fade-in">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">HAM Exam</h1>
          <p className="text-muted-foreground">
            Радиолюбителски изпит - Клас 1
          </p>
        </div>
        <Card className="animate-slide-up">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="name">Вашето име</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Въведете името си"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!loginName.trim()}>
                Започни
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode Select Screen
  if (view === 'mode-select' && user) {
    return (
      <ModeSelectView
        user={user}
        studyProgress={studyProgress}
        history={history}
        onSelectStudy={handleSelectStudyMode}
        onSelectExam={handleSelectExamMode}
        onLogout={handleLogout}
      />
    );
  }

  // Exam Home Screen
  if (view === 'exam-home' && user) {
    return (
      <ExamHomeView
        user={user}
        totalQuestions={totalQuestions}
        stats={stats as HistoryStats}
        history={history}
        onStartExam={handleStartExam}
        onOpenConfig={() => setView('config')}
        onOpenHistory={() => setView('history')}
        onBack={handleGoHome}
      />
    );
  }

  // Study Home Screen
  if (view === 'study-home' && studySession) {
    /* c8 ignore start - handler only available when due cards exist */
    const handleStartFSRSStudy = () => {
      setFsrsStudyMode(true);
      setAnswerRevealed(false);
      setSchedulePreview(null);
      setView('study');
    };
    /* c8 ignore stop */

    return (
      <StudyHomeView
        studyProgress={studyProgress}
        sections={examData.sections}
        onStartStudy={handleStartStudy}
        onResetProgress={handleResetStudyProgress}
        onBack={handleGoHome}
        fsrsStats={srs.stats}
        examDate={srs.config.examDate}
        /* c8 ignore next */
        onStartFSRSStudy={srs.stats.dueNow > 0 ? handleStartFSRSStudy : undefined}
      />
    );
  }

  // Config Screen
  if (view === 'config') {
    const maxQuestions: Record<number, number> = {};
    examData.sections.forEach((s) => {
      maxQuestions[s.metadata.sectionNumber] = s.questions.length;
    });

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
          <button
            onClick={() => setView('exam-home')}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Настройки</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card className="animate-fade-in">
            <CardContent className="pt-5 space-y-6">
              {examData.sections.map((section, index) => (
                <div
                  key={section.metadata.sectionNumber}
                  className={cn('space-y-3 animate-slide-up', `stagger-${index + 1}`)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Раздел {section.metadata.sectionNumber}</span>
                    <span className="text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full text-sm">
                      {config.questionsPerSection[section.metadata.sectionNumber]} / {maxQuestions[section.metadata.sectionNumber]}
                    </span>
                  </div>
                  <Slider
                    value={[config.questionsPerSection[section.metadata.sectionNumber]]}
                    onValueChange={([value]) => handleConfigChange(section.metadata.sectionNumber, value)}
                    max={maxQuestions[section.metadata.sectionNumber]}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">{section.metadata.title}</p>
                </div>
              ))}
              <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[var(--radius)] mt-6">
                <p className="text-sm text-muted-foreground mb-1">Общо въпроси</p>
                <p className="text-4xl font-bold text-primary">{totalQuestions}</p>
              </div>
            </CardContent>
          </Card>

          {/* Exam Date Picker */}
          <Card className="animate-fade-in stagger-2 overflow-hidden">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Дата на изпита</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Задайте датата на изпита за оптимизиране на интервалите за учене.
              </p>
              <Input
                type="date"
                value={srs.config.examDate?.split('T')[0] ?? ''}
                onChange={async (e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    await srs.updateConfig({ examDate: new Date(dateValue).toISOString() });
                  } else {
                    await srs.updateConfig({ examDate: undefined });
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
              {/* c8 ignore start - countdown display tested via StudyHomeView */}
              {srs.config.examDate && (
                <div className="text-center p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[var(--radius)]">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {(() => {
                      const days = Math.ceil((new Date(srs.config.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (days <= 0) return 'Изпитът е днес!';
                      if (days === 1) return '1 ден до изпита';
                      return `${days} дни до изпита`;
                    })()}
                  </p>
                </div>
              )}
              {/* c8 ignore stop */}
            </CardContent>
          </Card>

          {/* Data Backup/Restore */}
          <Card className="animate-fade-in stagger-3">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Архивиране на данни</h3>
              </div>
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <span>Прогресът се съхранява само в този браузър. Изтриването на данните ще изтрие прогреса.</span>
              </p>
              {/* c8 ignore start - file download/upload requires browser APIs difficult to mock */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    const data = await srs.exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ham-exam-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Изтегли
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      try {
                        const data = JSON.parse(text);
                        await srs.importData(data);
                        alert('Данните са възстановени успешно!');
                      } catch {
                        alert('Грешка при възстановяване на данните.');
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Възстанови
                </Button>
              </div>
              {/* c8 ignore stop */}
            </CardContent>
          </Card>

          <Button onClick={() => setView('exam-home')} className="w-full">
            <Check className="w-4 h-4 mr-2" />
            Запази
          </Button>
        </main>
      </div>
    );
  }

  // Exam Screen
  if (view === 'exam' && session) {
    const question = session.questions[currentQuestionIndex];
    const answer = session.answers.get(question.id);
    const progress = getExamProgress(session);

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-3 bg-card border-b flex justify-between items-center shadow-soft">
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
            {currentQuestionIndex + 1} / {session.questions.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Отговорени: <span className="font-medium text-foreground">{progress.answered}</span>
          </span>
        </header>
        <Progress value={(currentQuestionIndex + 1) / session.questions.length * 100} className="h-1" />

        <div className="flex-1 overflow-y-auto animate-fade-in" key={currentQuestionIndex}>
          <Card className="m-4">
            <div className="px-4 py-3 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
              Въпрос {currentQuestionIndex + 1}
            </div>
            <CardContent className="pt-4">
              <p className="mb-5 leading-relaxed text-lg">{question.question}</p>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <button
                    key={option.letter}
                    onClick={() => handleSelectAnswer(option.letter)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-[var(--radius)] border-2 text-left transition-all duration-200',
                      answer?.selectedAnswer === option.letter
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-accent active:scale-[0.99]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                        answer?.selectedAnswer === option.letter
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted'
                      )}
                    >
                      {option.letter}
                    </span>
                    <span className="flex-1 leading-relaxed pt-1">{option.text}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-card border-t flex gap-3 shadow-soft">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          {currentQuestionIndex < session.questions.length - 1 ? (
            <Button onClick={handleNextQuestion} className="flex-1">
              Напред
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="success" onClick={handleFinishExam} className="flex-1">
              <Check className="w-4 h-4 mr-1" />
              Завърши
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Results Screen
  if (view === 'results' && result) {
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b shadow-soft">
          <h1 className="text-xl font-semibold">Резултати</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card className="animate-scale-in">
            <CardContent className="pt-5">
              <div className="text-center py-8">
                <div
                  className={cn(
                    'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4',
                    /* c8 ignore next */
                    result.passed ? 'bg-success/10' : 'bg-destructive/10'
                  )}
                >
                  <Trophy
                    className={cn(
                      'w-10 h-10',
                      /* c8 ignore next */
                      result.passed ? 'text-success' : 'text-destructive'
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-6xl font-bold',
                    /* c8 ignore next */
                    result.passed ? 'text-success' : 'text-destructive'
                  )}
                >
                  {result.score}%
                </p>
                <p
                  className={cn(
                    'text-xl mt-2 font-medium',
                    /* c8 ignore next */
                    result.passed ? 'text-success' : 'text-destructive'
                  )}
                >
                  {/* c8 ignore next */}
                  {result.passed ? 'Успешно издържан!' : 'Неуспешен'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-success/10 rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-success">{result.correctAnswers}</p>
                  <p className="text-xs text-muted-foreground">Верни</p>
                </div>
                <div className="text-center p-4 bg-destructive/10 rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-destructive">{result.wrongAnswers}</p>
                  <p className="text-xs text-muted-foreground">Грешни</p>
                </div>
                <div className="text-center p-4 bg-warning/10 rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-warning">{result.unanswered}</p>
                  <p className="text-xs text-muted-foreground">Без отговор</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  По раздели
                </h3>
                <div className="space-y-3">
                  {result.sectionResults.map((sr) => (
                    <div
                      key={sr.sectionNumber}
                      className="p-3 bg-muted/50 rounded-[var(--radius)]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Раздел {sr.sectionNumber}</span>
                        <span className="font-semibold text-sm">
                          {sr.correctAnswers}/{sr.totalQuestions} ({sr.score}%)
                        </span>
                      </div>
                      <Progress value={sr.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 animate-fade-in">
            <Button onClick={handleStartExam} className="w-full">
              Нов изпит
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="w-full">
              Начало
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // History Screen
  if (view === 'history') {
    const handleBackToExamHome = () => setView('exam-home');
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
          <button
            onClick={handleBackToExamHome}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">История</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* c8 ignore next 8 */}
          {history.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Няма записани изпити</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((entry, index) => (
                <Card key={index} className={cn('animate-slide-up', index < 5 && `stagger-${index + 1}`)}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          entry.passed ? 'bg-success/10' : 'bg-destructive/10'
                        )}
                      >
                        <Trophy
                          className={cn(
                            'w-5 h-5',
                            entry.passed ? 'text-success' : 'text-destructive'
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            'text-2xl font-bold',
                            entry.passed ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {entry.score}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.completedAt).toLocaleDateString('bg-BG')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {entry.correctAnswers}/{entry.totalQuestions}
                      </p>
                      <p className="text-xs text-muted-foreground">верни</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Изтриване на историята?')) {
                  clearExamHistory();
                  setView('exam-home');
                }
              }}
              className="w-full"
            >
              Изтрий историята
            </Button>
          )}

          <Button onClick={handleBackToExamHome} className="w-full">
            Назад
          </Button>
        </main>
      </div>
    );
  }

  // Study Mode Screen
  if (view === 'study' && studySession) {
    // FSRS Study Mode - review due cards with grading
    /* c8 ignore start - FSRS study mode requires complex integration test setup with due cards */
    if (fsrsStudyMode) {
      const currentDueCard = srs.getNextDueCard();
      const fsrsQuestion = currentDueCard
        ? allQuestions.find(q => q.id === currentDueCard.questionId)
        : null;

      // Handle grading
      const handleGrade = async (rating: FSRSRating) => {
        if (!currentDueCard) return;
        await srs.reviewCard(currentDueCard.questionId, rating);
        setAnswerRevealed(false);
        setSchedulePreview(null);
      };

      // Handle reveal answer
      const handleRevealAnswer = async () => {
        setAnswerRevealed(true);
        if (currentDueCard) {
          const preview = await srs.getSchedulePreview(currentDueCard.questionId);
          setSchedulePreview(preview);
        }
      };

      // Handle exit FSRS study
      const handleExitFSRSStudy = () => {
        setFsrsStudyMode(false);
        setAnswerRevealed(false);
        setSchedulePreview(null);
        setView('study-home');
      };

      // No more due cards
      if (!currentDueCard || !fsrsQuestion) {
        return (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
            <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
              <button
                onClick={handleExitFSRSStudy}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Назад"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">Преговор завършен!</h1>
            </header>
            <main className="flex-1 p-4 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="p-6 bg-success/10 rounded-full mb-4">
                <Check className="w-12 h-12 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Браво!</h2>
              <p className="text-muted-foreground mb-6">
                Прегледахте всички карти за днес.
              </p>
              <Button onClick={handleExitFSRSStudy} className="w-full max-w-xs">
                Назад към учене
              </Button>
            </main>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
          <header className="p-3 bg-card border-b flex justify-between items-center shadow-soft">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExitFSRSStudy}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Изход"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-full">
                {srs.stats.dueNow} за преговор
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500">
              <GraduationCap className="w-4 h-4 text-white" />
              <span className="text-xs font-semibold text-white font-display">FSRS</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto animate-fade-in" key={currentDueCard.id}>
            <Card className="m-4">
              <div className="px-4 py-3 bg-muted/50 border-b">
                <span className="text-sm font-medium text-muted-foreground font-display">
                  Въпрос
                </span>
              </div>
              <CardContent className="pt-4">
                <p className="mb-5 leading-relaxed text-lg">{fsrsQuestion.question}</p>
                <div className="space-y-2">
                  {fsrsQuestion.options.map((option) => {
                    const isCorrect = option.letter === fsrsQuestion.correctAnswer;
                    const showCorrect = answerRevealed && isCorrect;

                    return (
                      <div
                        key={option.letter}
                        className={cn(
                          'w-full flex items-start gap-3 p-4 rounded-[var(--radius)] border-2 text-left transition-all duration-200',
                          showCorrect
                            ? 'border-success correct-answer-gradient animate-success-glow'
                            : 'border-border',
                          !answerRevealed && 'opacity-50'
                        )}
                      >
                        <span
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                            showCorrect
                              ? 'bg-success text-white'
                              : 'bg-muted'
                          )}
                        >
                          {showCorrect ? (
                            <Check className="w-4 h-4 animate-check-pop" />
                          ) : (
                            answerRevealed ? option.letter : '?'
                          )}
                        </span>
                        <span className={cn(
                          'flex-1 leading-relaxed pt-1',
                          showCorrect && 'font-medium',
                          !answerRevealed && 'blur-sm select-none'
                        )}>
                          {option.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation section - only shown when answer is revealed */}
                {answerRevealed && fsrsQuestion.explanation && (
                  <div className="mt-5 pt-4 border-t border-dashed animate-fade-in">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-[var(--radius)]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Обяснение</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {fsrsQuestion.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="p-4 bg-card border-t shadow-soft">
            {!answerRevealed ? (
              <Button onClick={handleRevealAnswer} className="w-full h-14 text-lg">
                Покажи отговора
                <span className="ml-2 text-xs opacity-70">(Space)</span>
              </Button>
            ) : (
              <StudyGradeButtons
                preview={schedulePreview}
                onRate={handleGrade}
                disabled={srs.isLoading}
              />
            )}
          </div>
        </div>
      );
    }
    /* c8 ignore stop */

    // Legacy Study Mode - section-based linear progression
    const currentSectionQuestions = getStudySectionQuestions(
      studySession,
      examData,
      studySession.currentSectionNumber
    );
    const question = currentSectionQuestions[studyQuestionIndex];
    const isViewed = question && studySession.viewedQuestions.has(question.id);

    // Calculate section progress
    const sectionViewedCount = currentSectionQuestions.filter(q =>
      studySession.viewedQuestions.has(q.id)
    ).length;
    const remaining = currentSectionQuestions.length - sectionViewedCount;

    // Mark question as viewed when displayed and check for milestones
    if (question && !isViewed && user) {
      markQuestionViewed(studySession, question.id);
      saveStudyProgress(user.id, Array.from(studySession.viewedQuestions));
      checkMilestone(sectionViewedCount + 1, currentSectionQuestions.length);
    }

    // Section options for the dropdown
    const sectionOptions = examData.sections.map(s => ({
      sectionNumber: s.metadata.sectionNumber,
      title: s.metadata.title
    }));

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full" {...studySwipeHandlers}>
        <header className="p-3 bg-card border-b flex justify-between items-center shadow-soft">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExitStudy}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              title="Изход (Esc)"
              aria-label="Изход"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Clickable question counter */}
            <button
              onClick={() => setShowQuestionGrid(true)}
              className="flex items-center gap-1.5 text-sm font-medium bg-muted hover:bg-muted/80 px-3 py-1 rounded-full transition-colors"
              title="Преглед на въпросите (G)"
            >
              <span>{studyQuestionIndex + 1} / {currentSectionQuestions.length}</span>
              <Grid3X3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {/* Enhanced study mode badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full study-badge-gradient">
            <GraduationCap className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white font-display">УЧЕНЕ</span>
          </div>
        </header>

        {/* Progress bar with milestone animation */}
        {/* c8 ignore next */}
        <div className={cn('h-1 relative', milestoneReached && 'animate-milestone')}>
          <Progress value={(studyQuestionIndex + 1) / currentSectionQuestions.length * 100} className="h-1" />
        </div>

        {/* Question dot indicators */}
        <div className="px-4 py-2 bg-muted/20 border-b flex items-center gap-1 overflow-x-auto">
          {currentSectionQuestions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleJumpToQuestion(idx)}
              className={cn(
                'question-dot flex-shrink-0 hover:scale-150 cursor-pointer',
                idx === studyQuestionIndex
                  ? 'question-dot-current'
                  : studySession.viewedQuestions.has(q.id)
                    ? 'question-dot-viewed'
                    : 'question-dot-unviewed'
              )}
              title={`Въпрос ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto animate-fade-in" key={`${studySession.currentSectionNumber}-${studyQuestionIndex}`}>
          {/* Section selector with custom dropdown */}
          <div className="px-4 py-2 bg-muted/30 border-b">
            <SectionSelect
              value={studySession.currentSectionNumber}
              onValueChange={handleStudySwitchSection}
              sections={sectionOptions}
            />
          </div>

          {question && (
            <Card className={cn('m-4', isViewed && 'border-l-4 border-l-success/50')}>
              <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground font-display">
                  Въпрос {studyQuestionIndex + 1}
                </span>
                {/* Viewed indicator */}
                {isViewed && (
                  <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <Eye className="w-3 h-3" />
                    Видян
                  </span>
                )}
              </div>
              <CardContent className="pt-4">
                <p className="mb-5 leading-relaxed text-lg">{question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isCorrect = option.letter === question.correctAnswer;

                    return (
                      <div
                        key={option.letter}
                        className={cn(
                          'w-full flex items-start gap-3 p-4 rounded-[var(--radius)] border-2 text-left transition-all duration-200',
                          isCorrect
                            ? 'border-success correct-answer-gradient animate-success-glow'
                            : 'border-border'
                        )}
                      >
                        <span
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                            isCorrect
                              ? 'bg-success text-white'
                              : 'bg-muted'
                          )}
                        >
                          {isCorrect ? (
                            <Check className="w-4 h-4 animate-check-pop" />
                          ) : (
                            option.letter
                          )}
                        </span>
                        <span className={cn(
                          'flex-1 leading-relaxed pt-1',
                          isCorrect && 'font-medium'
                        )}>
                          {option.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation section */}
                {question.explanation && (
                  <div className="mt-5 pt-4 border-t border-dashed">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-[var(--radius)]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Обяснение</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* c8 ignore start */}
          {/* Milestone celebration */}
          {milestoneReached && (
            <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-[var(--radius)] text-center animate-scale-in">
              <p className="text-lg font-bold font-display text-amber-600 dark:text-amber-400">
                {milestoneReached === 100 ? 'Браво!' : `${milestoneReached}% завършени!`}
              </p>
              <p className="text-sm text-muted-foreground">
                {milestoneReached === 100
                  ? 'Завършихте всички въпроси в този раздел!'
                  : `Продължавай! Още ${remaining} ${remaining === 1 ? 'въпрос' : 'въпроса'}.`}
              </p>
            </div>
          )}
          {/* c8 ignore stop */}

          {/* Keyboard hints (shown only on first use) */}
          {showKeyboardHints && (
            <div className="mx-4 mb-4 p-3 bg-muted/50 rounded-[var(--radius)] text-xs text-muted-foreground animate-fade-in">
              <p className="font-medium mb-1">Клавишни комбинации:</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">→</kbd> Навигация</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">1-3</kbd> Смяна на раздел</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">G</kbd> Всички въпроси</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Изход</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-card border-t flex gap-3 shadow-soft">
          <Button
            variant="outline"
            onClick={handleStudyPrevQuestion}
            disabled={studyQuestionIndex === 0}
            className="flex-1"
            title="Назад (←, P)"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          <Button
            onClick={handleStudyNextQuestion}
            disabled={studyQuestionIndex >= currentSectionQuestions.length - 1}
            className="flex-1"
            title="Напред (→, N)"
          >
            Напред
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Question Grid Modal */}
        {showQuestionGrid && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card rounded-[var(--radius)] shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden animate-scale-in">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold font-display">Всички въпроси</h2>
                <button
                  onClick={() => setShowQuestionGrid(false)}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-5 gap-2">
                  {currentSectionQuestions.map((q, idx) => {
                    const qIsViewed = studySession.viewedQuestions.has(q.id);
                    const isCurrent = idx === studyQuestionIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => handleJumpToQuestion(idx)}
                        className={cn(
                          'aspect-square rounded-[var(--radius)] flex items-center justify-center text-sm font-medium transition-all',
                          'hover:scale-105 active:scale-95',
                          isCurrent
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                            : qIsViewed
                              ? 'bg-success/20 text-success border border-success/30'
                              : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-success/20 border border-success/30"></span>
                    Видян ({sectionViewedCount})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-muted"></span>
                    Невидян ({remaining})
                  </span>
                </div>
              </div>
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowQuestionGrid(false)}
                  className="w-full"
                >
                  Затвори
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
