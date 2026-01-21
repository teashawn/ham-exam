import { useState, useEffect, useCallback } from 'react';
import type {
  ExamConfig,
  ExamData,
  ExamResult,
  ExamSession,
  UserProfile,
  AnswerLetter,
} from '@ham-exam/exam-core';
import {
  DEFAULT_EXAM_CONFIG,
  createExamSession,
  recordAnswer,
  completeExam,
  getExamProgress,
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
} from './lib/storage';
import type { AppView } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
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

  useEffect(() => {
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
    if (!user) return;
    const newSession = createExamSession(examData, config, user.id);
    setSession(newSession);
    setCurrentQuestionIndex(0);
    setResult(null);
    setView('exam');
  }, [config, user]);

  const handleSelectAnswer = useCallback((answer: AnswerLetter) => {
    if (!session) return;
    const question = session.questions[currentQuestionIndex];
    recordAnswer(session, question.id, answer);
    setSession({ ...session });
  }, [session, currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
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

  const totalQuestions = Object.values(config.questionsPerSection).reduce((a, b) => a + b, 0);
  const history = loadExamHistory();
  const stats = calculateHistoryStats(history);

  // Login Screen
  if (view === 'login') {
    return (
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">HAM Exam</h1>
        <p className="text-center text-muted-foreground mb-8">
          Радиолюбителски изпит - Клас 1
        </p>
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
      </div>
    );
  }

  // Home Screen
  if (view === 'home') {
    return (
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <header className="p-4 bg-card border-b flex items-center justify-between">
          <h1 className="text-xl font-semibold">HAM Exam</h1>
          <span className="text-sm text-muted-foreground">{user?.name}</span>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Нов изпит</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                <p className="text-sm text-muted-foreground">Общо въпроси</p>
                <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleStartExam} className="w-full">
                  Започни изпит
                </Button>
                <Button variant="outline" onClick={() => setView('config')} className="w-full">
                  Настройки
                </Button>
              </div>
            </CardContent>
          </Card>

          {stats.totalExams > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                    <p className="text-2xl font-bold">{stats.totalExams}</p>
                    <p className="text-xs text-muted-foreground">Изпити</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                    <p className="text-2xl font-bold text-success">{stats.passRate}%</p>
                    <p className="text-xs text-muted-foreground">Успеваемост</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-xs text-muted-foreground">Среден резултат</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                    <p className="text-2xl font-bold text-success">{stats.bestScore}%</p>
                    <p className="text-xs text-muted-foreground">Най-добър</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setView('history')} className="w-full">
                  История
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
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
        <header className="p-4 bg-card border-b">
          <h1 className="text-xl font-semibold">Настройки</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card>
            <CardContent className="pt-5 space-y-6">
              {examData.sections.map((section) => (
                <div key={section.metadata.sectionNumber} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Раздел {section.metadata.sectionNumber}</span>
                    <span className="text-primary font-semibold">
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
              <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                <p className="text-sm text-muted-foreground">Общо въпроси</p>
                <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
              </div>
            </CardContent>
          </Card>
          <Button onClick={() => setView('home')} className="w-full">
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
        <header className="p-3 bg-card border-b flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1} / {session.questions.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Отговорени: {progress.answered}
          </span>
        </header>
        <Progress value={(currentQuestionIndex + 1) / session.questions.length * 100} />

        <div className="flex-1 overflow-y-auto">
          <Card className="m-4">
            <div className="p-3 bg-muted border-b text-sm text-muted-foreground">
              Въпрос {currentQuestionIndex + 1}
            </div>
            <CardContent className="pt-4">
              <p className="mb-4 leading-relaxed">{question.question}</p>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <button
                    key={option.letter}
                    onClick={() => handleSelectAnswer(option.letter)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-[var(--radius)] border-2 text-left transition-colors',
                      answer?.selectedAnswer === option.letter
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold',
                        answer?.selectedAnswer === option.letter
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {option.letter}
                    </span>
                    <span className="flex-1 leading-relaxed">{option.text}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-card border-t flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex-1"
          >
            Назад
          </Button>
          {currentQuestionIndex < session.questions.length - 1 ? (
            <Button onClick={handleNextQuestion} className="flex-1">
              Напред
            </Button>
          ) : (
            <Button variant="success" onClick={handleFinishExam} className="flex-1">
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
        <header className="p-4 bg-card border-b">
          <h1 className="text-xl font-semibold">Резултати</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card>
            <CardContent className="pt-5">
              <div className="text-center py-6">
                <p
                  className={cn(
                    'text-6xl font-bold',
                    result.passed ? 'text-success' : 'text-destructive'
                  )}
                >
                  {result.score}%
                </p>
                <p
                  className={cn(
                    'text-xl mt-2',
                    result.passed ? 'text-success' : 'text-destructive'
                  )}
                >
                  {result.passed ? 'Успешно издържан!' : 'Неуспешен'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-success">{result.correctAnswers}</p>
                  <p className="text-xs text-muted-foreground">Верни</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-destructive">{result.wrongAnswers}</p>
                  <p className="text-xs text-muted-foreground">Грешни</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-[var(--radius)]">
                  <p className="text-2xl font-bold text-warning">{result.unanswered}</p>
                  <p className="text-xs text-muted-foreground">Без отговор</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">По раздели</h3>
                <div className="space-y-2">
                  {result.sectionResults.map((sr) => (
                    <div
                      key={sr.sectionNumber}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <span className="text-sm">Раздел {sr.sectionNumber}</span>
                      <span className="font-semibold">
                        {sr.correctAnswers}/{sr.totalQuestions} ({sr.score}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
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
        <header className="p-4 bg-card border-b">
          <h1 className="text-xl font-semibold">История</h1>
        </header>
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Няма записани изпити</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((entry, index) => (
                <Card key={index}>
                  <CardContent className="pt-4 flex justify-between items-center">
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
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {entry.correctAnswers}/{entry.totalQuestions}
                      </p>
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

  return null;
}

export default App;
