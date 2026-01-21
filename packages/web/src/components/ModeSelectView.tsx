import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GraduationCap, ClipboardList, LogOut, BookOpen, Timer } from 'lucide-react';
import type { UserProfile, StudyProgress, ExamHistoryEntry } from '@/types';

interface ModeSelectViewProps {
  user: UserProfile;
  studyProgress: StudyProgress[];
  history: ExamHistoryEntry[];
  onSelectStudy: () => void;
  onSelectExam: () => void;
  onLogout: () => void;
}

export function ModeSelectView({
  user,
  studyProgress,
  history,
  onSelectStudy,
  onSelectExam,
  onLogout,
}: ModeSelectViewProps) {
  // Calculate overall study progress
  const totalViewed = studyProgress.reduce((sum, p) => sum + p.viewedQuestions, 0);
  const totalQuestions = studyProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
  const studyPercentage = totalQuestions > 0 ? Math.round((totalViewed / totalQuestions) * 100) : 0;

  // Calculate exam stats
  const totalExams = history.length;
  const bestScore = totalExams > 0 ? Math.max(...history.map(h => h.score)) : 0;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      {/* Minimal header with just theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center p-6">
        {/* Greeting */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">
            Здравей, {user.name}!
          </h1>
          <p className="text-muted-foreground">
            Какво искаш да правиш днес?
          </p>
        </div>

        {/* Mode selection cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
          {/* Study Mode Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 hover:border-amber-500/50 active:scale-[0.99] group"
            onClick={onSelectStudy}
          >
            <CardContent className="p-6 flex flex-col h-full min-h-[280px]">
              {/* Icon and title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold">Учене</h2>
              </div>

              {/* Description */}
              <div className="flex-1 space-y-3">
                <p className="text-muted-foreground text-sm">
                  Преглед на въпросите по раздели с показани верни отговори.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>Всички въпроси</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-500" />
                    <span>Без таймер</span>
                  </li>
                </ul>
              </div>

              {/* Progress indicator */}
              <div className="mt-4 pt-4 border-t">
                {studyPercentage > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Прогрес</span>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {studyPercentage}% завършено
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Започни да учиш</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exam Mode Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 active:scale-[0.99] group"
            onClick={onSelectExam}
          >
            <CardContent className="p-6 flex flex-col h-full min-h-[280px]">
              {/* Icon and title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Изпит</h2>
              </div>

              {/* Description */}
              <div className="flex-1 space-y-3">
                <p className="text-muted-foreground text-sm">
                  Симулиран изпит с таймер и оценяване.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-primary" />
                    <span>45 минути</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <span>90 въпроса</span>
                  </li>
                </ul>
              </div>

              {/* Stats indicator */}
              <div className="mt-4 pt-4 border-t">
                {totalExams > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{totalExams} {totalExams === 1 ? 'изпит' : 'изпита'}</span>
                    <span className="text-sm font-semibold text-primary">
                      Най-добър: {bestScore}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Направи първия си изпит</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subtle logout link */}
        <div className="text-center mt-8 animate-fade-in">
          <button
            onClick={onLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Изход
          </button>
        </div>
      </main>
    </div>
  );
}
