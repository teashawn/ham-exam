import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExamSection, StudyProgress } from '@/types';

interface StudyHomeViewProps {
  studyProgress: StudyProgress[];
  sections: ExamSection[];
  onStartStudy: (sectionNumber: number) => void;
  onResetProgress: () => void;
  onBack: () => void;
}

export function StudyHomeView({
  studyProgress,
  sections,
  onStartStudy,
  onResetProgress,
  onBack,
}: StudyHomeViewProps) {
  const totalViewedAll = studyProgress.reduce((sum, p) => sum + p.viewedQuestions, 0);
  const totalQuestionsAll = studyProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
  const overallPercentage = totalQuestionsAll > 0 ? Math.round((totalViewedAll / totalQuestionsAll) * 100) : 0;

  const hasProgress = studyProgress.some((p) => p.viewedQuestions > 0);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="p-4 bg-card border-b flex items-center gap-3 shadow-soft">
        <button
          onClick={onBack}
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
      </main>
    </div>
  );
}
