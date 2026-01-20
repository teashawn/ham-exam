import { useState, useEffect, useCallback } from 'react';
import type {
  AppView,
  ExamConfig,
  ExamData,
  ExamResult,
  ExamSession,
  UserProfile,
  AnswerLetter,
} from './types';
import { DEFAULT_EXAM_CONFIG } from './types';
import { createExamSession, recordAnswer, completeExam, getExamProgress } from './lib/exam-engine';
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

  // Load user profile on mount
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
    const newSession = createExamSession(examData, config);
    setSession(newSession);
    setCurrentQuestionIndex(0);
    setResult(null);
    setView('exam');
  }, [config]);

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
      <div className="app">
        <div className="login-container">
          <h1 className="login-title">HAM Exam</h1>
          <p className="login-subtitle">Радиолюбителски изпит - Клас 1</p>
          <form className="login-form" onSubmit={handleLogin}>
            <div>
              <label className="label" htmlFor="name">Вашето име</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Въведете името си"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!loginName.trim()}>
              Започни
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Home Screen
  if (view === 'home') {
    return (
      <div className="app">
        <header className="header">
          <h1>HAM Exam</h1>
          <span className="header-user">{user?.name}</span>
        </header>
        <main className="main">
          <div className="card">
            <h2 className="card-title">Нов изпит</h2>
            <div className="config-total">
              <div className="config-total-label">Общо въпроси</div>
              <div className="config-total-value">{totalQuestions}</div>
            </div>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleStartExam}>
                Започни изпит
              </button>
              <button className="btn btn-outline" onClick={() => setView('config')}>
                Настройки
              </button>
            </div>
          </div>

          {stats.totalExams > 0 && (
            <div className="card">
              <h2 className="card-title">Статистика</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-value">{stats.totalExams}</div>
                  <div className="stat-label">Изпити</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value stat-correct">{stats.passRate}%</div>
                  <div className="stat-label">Успеваемост</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{stats.averageScore}%</div>
                  <div className="stat-label">Среден резултат</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value stat-correct">{stats.bestScore}%</div>
                  <div className="stat-label">Най-добър</div>
                </div>
              </div>
              <button className="btn btn-outline mt-4" onClick={() => setView('history')}>
                История
              </button>
            </div>
          )}

          <div className="card">
            <button className="btn btn-outline" onClick={handleLogout}>
              Изход
            </button>
          </div>
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
      <div className="app">
        <header className="header">
          <h1>Настройки</h1>
        </header>
        <main className="main">
          <div className="card">
            {examData.sections.map((section) => (
              <div key={section.metadata.sectionNumber} className="config-section">
                <div className="config-label">
                  <span>Раздел {section.metadata.sectionNumber}</span>
                  <span className="config-value">
                    {config.questionsPerSection[section.metadata.sectionNumber]} / {maxQuestions[section.metadata.sectionNumber]}
                  </span>
                </div>
                <input
                  type="range"
                  className="config-slider"
                  min={0}
                  max={maxQuestions[section.metadata.sectionNumber]}
                  value={config.questionsPerSection[section.metadata.sectionNumber]}
                  onChange={(e) => handleConfigChange(section.metadata.sectionNumber, parseInt(e.target.value))}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {section.metadata.title}
                </div>
              </div>
            ))}
            <div className="config-total">
              <div className="config-total-label">Общо въпроси</div>
              <div className="config-total-value">{totalQuestions}</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setView('home')}>
            Запази
          </button>
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
      <div className="app" style={{ padding: 0 }}>
        <div className="exam-header">
          <span className="exam-progress">
            {currentQuestionIndex + 1} / {session.questions.length}
          </span>
          <span className="exam-progress">
            Отговорени: {progress.answered}
          </span>
        </div>
        <div className="exam-progress-bar">
          <div
            className="exam-progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%` }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="question-card">
            <div className="question-number">Въпрос {currentQuestionIndex + 1}</div>
            <div className="question-text">{question.question}</div>
            <div className="options-list">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  className={`option-btn ${answer?.selectedAnswer === option.letter ? 'selected' : ''}`}
                  onClick={() => handleSelectAnswer(option.letter)}
                >
                  <span className="option-letter">{option.letter}</span>
                  <span className="option-text">{option.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="nav-buttons">
          <button
            className="btn btn-outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Назад
          </button>
          {currentQuestionIndex < session.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleNextQuestion}>
              Напред
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleFinishExam}>
              Завърши
            </button>
          )}
        </div>
      </div>
    );
  }

  // Results Screen
  if (view === 'results' && result) {
    return (
      <div className="app">
        <header className="header">
          <h1>Резултати</h1>
        </header>
        <main className="main">
          <div className="card">
            <div className="results-score">
              <div className={`results-percentage ${result.passed ? 'results-passed' : 'results-failed'}`}>
                {result.score}%
              </div>
              <div className={`results-label ${result.passed ? 'results-passed-label' : 'results-failed-label'}`}>
                {result.passed ? 'Успешно издържан!' : 'Неуспешен'}
              </div>
            </div>

            <div className="results-stats">
              <div className="stat-box">
                <div className="stat-value stat-correct">{result.correctAnswers}</div>
                <div className="stat-label">Верни</div>
              </div>
              <div className="stat-box">
                <div className="stat-value stat-wrong">{result.wrongAnswers}</div>
                <div className="stat-label">Грешни</div>
              </div>
              <div className="stat-box">
                <div className="stat-value stat-unanswered">{result.unanswered}</div>
                <div className="stat-label">Без отговор</div>
              </div>
            </div>

            <div className="section-results">
              <h3 className="card-title">По раздели</h3>
              {result.sectionResults.map((sr) => (
                <div key={sr.sectionNumber} className="section-result">
                  <span className="section-title">Раздел {sr.sectionNumber}</span>
                  <span className="section-score">
                    {sr.correctAnswers}/{sr.totalQuestions} ({sr.score}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handleStartExam}>
              Нов изпит
            </button>
            <button className="btn btn-outline" onClick={handleGoHome}>
              Начало
            </button>
          </div>
        </main>
      </div>
    );
  }

  // History Screen
  if (view === 'history') {
    return (
      <div className="app">
        <header className="header">
          <h1>История</h1>
        </header>
        <main className="main">
          {history.length === 0 ? (
            <div className="history-empty">
              <p>Няма записани изпити</p>
            </div>
          ) : (
            <div className="history-list">
              {[...history].reverse().map((entry, index) => (
                <div key={index} className="history-item">
                  <div>
                    <div className={`history-score ${entry.passed ? 'stat-correct' : 'stat-wrong'}`}>
                      {entry.score}%
                    </div>
                    <div className="history-date">
                      {new Date(entry.completedAt).toLocaleDateString('bg-BG')}
                    </div>
                  </div>
                  <div className="history-details">
                    <div className="history-questions">
                      {entry.correctAnswers}/{entry.totalQuestions}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <button
              className="btn btn-outline mt-4"
              onClick={() => {
                if (confirm('Изтриване на историята?')) {
                  clearExamHistory();
                  setView('home');
                }
              }}
            >
              Изтрий историята
            </button>
          )}

          <button className="btn btn-primary mt-4" onClick={handleGoHome}>
            Назад
          </button>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
