import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ChevronLeft, Check, Clock, Flame, BookOpen, RefreshCw, Calendar, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamSection, StudyProgress } from '@/types';
import type { FSRSStats } from '@ham-exam/exam-core';
import { getDaysUntilExam } from '@ham-exam/exam-core';

type StudySubMode = 'select' | 'fsrs' | 'sections';

interface StudyHomeViewProps {
  studyProgress: StudyProgress[];
  sections: ExamSection[];
  onStartStudy: (sectionNumber: number) => void;
  onResetProgress: () => void;
  onBack: () => void;
  /** FSRS statistics (optional - if not provided, shows legacy progress view) */
  fsrsStats?: FSRSStats;
  /** Exam date for countdown (optional) */
  examDate?: string;
  /** Callback to start FSRS study mode (reviews due cards) */
  onStartFSRSStudy?: () => void;
}

export function StudyHomeView({
  studyProgress,
  sections,
  onStartStudy,
  onResetProgress,
  onBack,
  fsrsStats,
  examDate,
  onStartFSRSStudy,
}: StudyHomeViewProps) {
  const [subMode, setSubMode] = useState<StudySubMode>('select');

  const totalViewedAll = studyProgress.reduce((sum, p) => sum + p.viewedQuestions, 0);
  const totalQuestionsAll = studyProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
  const overallPercentage = totalQuestionsAll > 0 ? Math.round((totalViewedAll / totalQuestionsAll) * 100) : 0;

  const hasProgress = studyProgress.some((p) => p.viewedQuestions > 0);
  const daysUntilExam = examDate ? getDaysUntilExam(examDate) : null;

  const handleBack = () => {
    if (subMode === 'select') {
      onBack();
    } else {
      setSubMode('select');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
        <button
          onClick={handleBack}
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
        {/* Exam countdown (if exam date is set) - always visible */}
        {daysUntilExam !== null && (
          <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[var(--radius)] animate-fade-in">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">
              {daysUntilExam === 0 ? (
                <span className="text-red-500 font-bold">Изпитът е днес!</span>
              ) : daysUntilExam === 1 ? (
                <span className="text-orange-500 font-bold">1 ден до изпита</span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  {daysUntilExam} дни до изпита
                </span>
              )}
            </span>
          </div>
        )}

        {/* Mode selection screen */}
        {subMode === 'select' && (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Избери начин на учене
            </p>

            {/* FSRS Mode Card */}
            <Card
              className={cn(
                'cursor-pointer transition-all animate-slide-up',
                'hover:border-purple-500/50 hover:shadow-md hover:-translate-y-0.5',
                'active:scale-[0.99]',
                'stagger-1'
              )}
              onClick={() => setSubMode('fsrs')}
              data-testid="fsrs-mode-card"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Brain className="w-7 h-7 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold font-display">Интелигентен преговор</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Адаптивно учене с FSRS алгоритъм. Системата избира кои въпроси да преговориш.
                    </p>
                    {fsrsStats && (
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-3 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {fsrsStats.dueNow} карти за преговор
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections Mode Card */}
            <Card
              className={cn(
                'cursor-pointer transition-all animate-slide-up',
                'hover:border-amber-500/50 hover:shadow-md hover:-translate-y-0.5',
                'active:scale-[0.99]',
                'stagger-2'
              )}
              onClick={() => setSubMode('sections')}
              data-testid="sections-mode-card"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <BookOpen className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold font-display">По раздели</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Преглеждай въпросите последователно по раздели от изпита.
                    </p>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {sections.map(s => s.questions.length).join(' + ')} въпроса
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* FSRS Mode Content */}
        {subMode === 'fsrs' && (
          <>
            {/* FSRS Statistics */}
            {fsrsStats && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-500/20">
                      <Clock className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display text-red-600 dark:text-red-400">
                        {fsrsStats.dueNow}
                      </p>
                      <p className="text-xs text-muted-foreground">За преговор</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500/20">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400">
                        {fsrsStats.newCards}
                      </p>
                      <p className="text-xs text-muted-foreground">Нови</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <Flame className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
                        {fsrsStats.learningCards}
                      </p>
                      <p className="text-xs text-muted-foreground">Учене</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/20">
                      <RefreshCw className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display text-green-600 dark:text-green-400">
                        {fsrsStats.reviewCards}
                      </p>
                      <p className="text-xs text-muted-foreground">Преговор</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Start FSRS Study Button (if due cards exist) */}
            {fsrsStats && fsrsStats.dueNow > 0 && onStartFSRSStudy && (
              <Button
                onClick={onStartFSRSStudy}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg animate-slide-up"
              >
                <Clock className="w-5 h-5 mr-2" />
                Преговори {fsrsStats.dueNow} карти
              </Button>
            )}

            {/* No due cards message */}
            {fsrsStats && fsrsStats.dueNow === 0 && (
              <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-[var(--radius)] animate-fade-in">
                <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Няма карти за преговор!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Върни се по-късно за нови карти.
                </p>
              </div>
            )}
          </>
        )}

        {/* Sections Mode Content */}
        {subMode === 'sections' && (
          <>
            {/* Overall progress summary */}
            <div className="text-center p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-[var(--radius)] animate-fade-in">
              <p className="text-sm text-muted-foreground mb-1">Общ прогрес</p>
              <p className="text-3xl font-bold font-display text-amber-600 dark:text-amber-400">{overallPercentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">{totalViewedAll} от {totalQuestionsAll} въпроса</p>
            </div>

            <p className="text-sm text-muted-foreground text-center mb-2">
              Избери раздел за учене
            </p>

            {sections.map((section, index) => {
              const progress = studyProgress.find(
                (p) => p.sectionNumber === section.metadata.sectionNumber
              );
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
                  onClick={() => onStartStudy(section.metadata.sectionNumber)}
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

            {hasProgress && (
              <Button
                variant="outline"
                onClick={onResetProgress}
                className="w-full"
              >
                Изтрий прогреса
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
