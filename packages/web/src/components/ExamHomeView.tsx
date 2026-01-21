import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Trophy, BookOpen, Settings, History, ChevronLeft, BarChart3 } from 'lucide-react';
import type { ExamHistoryEntry, UserProfile } from '@/types';

interface ExamHomeViewProps {
  user: UserProfile;
  totalQuestions: number;
  stats: HistoryStats;
  history: ExamHistoryEntry[];
  onStartExam: () => void;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  onBack: () => void;
}

// History stats type
export interface HistoryStats {
  totalExams: number;
  passRate: number;
  averageScore: number;
  bestScore: number;
}

export function ExamHomeView({
  user,
  totalQuestions,
  stats,
  history,
  onStartExam,
  onOpenConfig,
  onOpenHistory,
  onBack,
}: ExamHomeViewProps) {
  // Get last 3 exams for quick preview
  const recentExams = [...history].reverse().slice(0, 3);

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
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Изпит</h1>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{user?.name}</span>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Start Exam Card */}
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
              <Button onClick={onStartExam} className="w-full">
                Започни изпит
              </Button>
              <Button variant="outline" onClick={onOpenConfig} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Настройки
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        {stats.totalExams > 0 && (
          <Card className="animate-fade-in stagger-1">
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
            </CardContent>
          </Card>
        )}

        {/* Recent History Preview */}
        {recentExams.length > 0 && (
          <Card className="animate-fade-in stagger-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Последни изпити
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentExams.map((entry, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-[var(--radius)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.passed ? 'bg-success/10' : 'bg-destructive/10'
                      }`}
                    >
                      <Trophy
                        className={`w-4 h-4 ${
                          entry.passed ? 'text-success' : 'text-destructive'
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-bold ${
                          entry.passed ? 'text-success' : 'text-destructive'
                        }`}
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
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={onOpenHistory} className="w-full">
                <History className="w-4 h-4 mr-2" />
                Пълна история
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
