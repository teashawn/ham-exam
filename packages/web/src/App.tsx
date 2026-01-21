import { useState, useEffect, useCallback } from 'react';
import type {
  ExamConfig,
  ExamData,
  ExamResult,
  ExamSession,
  UserProfile,
  AnswerLetter,
  StudySession,
  StudyProgress,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Radio, Trophy, BookOpen, Settings, History, ChevronLeft, ChevronRight, Check, BarChart3, GraduationCap, Eye, Grid3X3, X } from 'lucide-react';
import { SectionSelect } from '@/components/ui/section-select';
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

  useEffect(() => {
    // Initialize theme on mount
    initTheme();

    const savedUser = loadUserProfile();
    if (savedUser) {
      setUser(savedUser);
      setView('home');
    }

    const savedConfig = loadExamConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    /* c8 ignore next */
    if (!loginName.trim()) return;

    const profile = createUserProfile(loginName.trim());
    saveUserProfile(profile);
    setUser(profile);
    setView('home');
  }, [loginName]);

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
    setView('home');
    setSession(null);
    setResult(null);
    setCurrentQuestionIndex(0);
  }, []);

  // Study mode handlers
  const handleOpenStudyMode = useCallback(() => {
    /* c8 ignore next */
    if (!user) return;

    // Create a study session for all sections to calculate progress
    const newSession = createStudySession(examData, { sectionNumber: 0 }, user.id);

    // Load saved progress
    const savedProgress = loadStudyProgress(user.id);
    if (savedProgress) {
      loadViewedQuestions(newSession, savedProgress.viewedQuestionIds);
    }

    setStudySession(newSession);
    setStudyProgress(getStudyProgress(newSession, examData));
    setView('study-section-select');
  }, [user]);

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

    // Update progress state and return to section select
    setStudyProgress(getStudyProgress(studySession, examData));
    setView('study-section-select');
    setShowQuestionGrid(false);
  }, [studySession, user]);

  const handleJumpToQuestion = useCallback((index: number) => {
    setStudyQuestionIndex(index);
    setShowQuestionGrid(false);
  }, []);

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

  // Home Screen
  if (view === 'home') {
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">HAM Exam</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Нов изпит
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[var(--radius)]">
                <p className="text-sm text-muted-foreground mb-1">Общо въпроси</p>
                <p className="text-4xl font-bold text-primary">{totalQuestions}</p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleStartExam} className="w-full">
                  Започни изпит
                </Button>
                <Button variant="outline" onClick={() => setView('config')} className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in stagger-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Режим учене
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Преглед на всички въпроси с показани верни отговори.
              </p>
              <Button variant="outline" onClick={handleOpenStudyMode} className="w-full">
                <GraduationCap className="w-4 h-4 mr-2" />
                Учи
              </Button>
            </CardContent>
          </Card>

          {stats.totalExams > 0 && (
            <Card className="animate-fade-in stagger-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Статистика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)] transition-colors">
                    <p className="text-2xl font-bold">{stats.totalExams}</p>
                    <p className="text-xs text-muted-foreground">Изпити</p>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-[var(--radius)] transition-colors">
                    <p className="text-2xl font-bold text-success">{stats.passRate}%</p>
                    <p className="text-xs text-muted-foreground">Успеваемост</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)] transition-colors">
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-xs text-muted-foreground">Среден резултат</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-[var(--radius)] transition-colors">
                    <p className="text-2xl font-bold text-primary">{stats.bestScore}%</p>
                    <p className="text-xs text-muted-foreground">Най-добър</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setView('history')} className="w-full">
                  <History className="w-4 h-4 mr-2" />
                  История
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="animate-fade-in stagger-3">
            <CardContent className="pt-5">
              <Button variant="outline" onClick={handleLogout} className="w-full">
                Изход
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
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
            onClick={() => setView('home')}
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
          <Button onClick={() => setView('home')} className="w-full">
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
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
          <button
            onClick={handleGoHome}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
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
                  setView('home');
                }
              }}
              className="w-full"
            >
              Изтрий историята
            </Button>
          )}

          <Button onClick={handleGoHome} className="w-full">
            Назад
          </Button>
        </main>
      </div>
    );
  }

  // Study Section Select Screen
  if (view === 'study-section-select' && studySession) {
    const totalViewedAll = studyProgress.reduce((sum, p) => sum + p.viewedQuestions, 0);
    const totalQuestionsAll = studyProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const overallPercentage = totalQuestionsAll > 0 ? Math.round((totalViewedAll / totalQuestionsAll) * 100) : 0;

    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
          <button
            onClick={handleGoHome}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold font-display">Режим учене</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full study-badge-gradient">
            <GraduationCap className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white font-display">УЧЕНЕ</span>
          </div>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Overall progress summary */}
          <div className="text-center p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-[var(--radius)] animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">Общ прогрес</p>
            <p className="text-3xl font-bold font-display text-amber-600 dark:text-amber-400">{overallPercentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">{totalViewedAll} от {totalQuestionsAll} въпроса</p>
          </div>

          <p className="text-sm text-muted-foreground text-center mb-2">
            Избери раздел за учене
          </p>

          {examData.sections.map((section, index) => {
            const progress = studyProgress.find(
              (p) => p.sectionNumber === section.metadata.sectionNumber
            );
            /* c8 ignore next 3 */
            const viewedCount = progress?.viewedQuestions ?? 0;
            const totalCount = progress?.totalQuestions ?? section.questions.length;
            const percentage = progress?.percentage ?? 0;
            const remaining = totalCount - viewedCount;

            return (
              <Card
                key={section.metadata.sectionNumber}
                className={cn(
                  'cursor-pointer transition-all animate-slide-up',
                  'hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5',
                  'active:scale-[0.99]',
                  `stagger-${index + 1}`
                )}
                onClick={() => handleStartStudy(section.metadata.sectionNumber)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold font-display">Раздел {section.metadata.sectionNumber}</h3>
                      <p className="text-sm text-muted-foreground">{section.metadata.title}</p>
                    </div>
                    <span className={cn(
                      'text-sm font-medium px-3 py-1 rounded-full transition-colors',
                      percentage === 100
                        ? 'bg-success/10 text-success'
                        : 'bg-primary/10 text-primary'
                    )}>
                      {viewedCount}/{totalCount}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">{percentage}% прегледани</p>
                    {remaining > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Още {remaining} {remaining === 1 ? 'въпрос' : 'въпроса'}
                      </p>
                    )}
                    {percentage === 100 && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Завършен
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {studyProgress.some((p) => p.viewedQuestions > 0) && (
            <Button
              variant="outline"
              onClick={handleResetStudyProgress}
              className="w-full"
            >
              Изтрий прогреса
            </Button>
          )}
        </main>
      </div>
    );
  }

  // Study Mode Screen
  if (view === 'study' && studySession) {
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
    const sectionPercentage = Math.round((sectionViewedCount / currentSectionQuestions.length) * 100);
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
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
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
              </CardContent>
            </Card>
          )}

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
