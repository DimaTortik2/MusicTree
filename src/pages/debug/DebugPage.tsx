import React, { useEffect, useRef, useState } from 'react';
import $ from 'jquery';
import './bootstrap-scoped.scss';
import { useProgressStore } from '@/app/store/useProgressStore';
import { Button } from '@/shared/Button';
import ThemeToggle from '@/shared/ThemeSwither';

export const DebugPage: React.FC = () => {
  const fullState = useProgressStore();
  const logWindowRef = useRef<HTMLDivElement>(null);
  const isDraggableInitialized = useRef(false);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  useEffect(() => {
    window.$ = window.jQuery = $;

    import('jquery-ui-dist/jquery-ui')
      .then(() => {
        if (logWindowRef.current && !isDraggableInitialized.current) {
          ($(logWindowRef.current) as any).draggable({
            handle: '.drag-handle',
            containment: 'window',
          });
          isDraggableInitialized.current = true;
        }
      })
      .catch((err) => console.error('Ошибка загрузки jQuery UI:', err));

    return () => {
      if (logWindowRef.current && isDraggableInitialized.current) {
        try {
          ($(logWindowRef.current) as any).draggable('destroy');
        } catch (e) {}
        isDraggableInitialized.current = false;
      }
    };
  }, []);

  const handlePassAllLessons = () => {
    useProgressStore.setState({
      passedLessons: ['lesson_1', 'lesson_2', 'lesson_3', 'lesson_4'],
      currentLesson: 'lesson_5',
      lastUncompletedLesson: 'lesson_5',
    });
  };

  const handleClearProgress = () => {
    useProgressStore.setState({
      passedLessons: [],
      passedHomeworks: [],
      passedTests: {},
      unlockedChains: [],
      currentLesson: 'lesson_1',
      lastUncompletedLesson: 'lesson_1',
    });
  };

  const handleHardReset = () => {
    if (confirm('Очистить LocalStorage и Zustand? Это убьет все данные.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div
      className="bootstrap-scope"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--text)',
        paddingTop: '2rem',
        paddingBottom: '12rem',
        transition: 'background-color 0.3s',
      }}
    >
      <div
        ref={logWindowRef}
        className="card position-fixed shadow-lg"
        style={{
          width: '450px',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          ...cardStyles,
        }}
      >
        <div
          className="card-header drag-handle d-flex justify-content-between align-items-center user-select-none"
          style={{
            cursor: 'move',
            backgroundColor: 'transparent',
            borderBottom: '1px solid var(--text)',
          }}
        >
          <span className="fw-bold text-uppercase" style={{ fontSize: '0.85rem' }}>
            Zustand Inspector
          </span>
          <span
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            {isInspectorOpen ? 'Свернуть' : 'Развернуть'}
          </span>
        </div>

        {isInspectorOpen && (
          <div className="card-body overflow-auto p-3" style={{ maxHeight: '60vh' }}>
            <pre className="m-0" style={{ fontSize: '11px', color: 'var(--text)' }}>
              {JSON.stringify(fullState, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="container">
        <div className="row mb-5">
          <div className="col">
            <h1 className="display-5 fw-bold m-0" style={{ color: 'var(--text)' }}>
              Для разработчиков
            </h1>
            <p className="lead mt-2" style={{ color: 'var(--text)', opacity: 0.8 }}>
              Написано с использованием Bootstrap и JQuerryUI
            </p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100 shadow-sm" style={cardStyles}>
              <div className="card-body">
                <h5
                  className="card-title fw-bold border-bottom mb-3 pb-2"
                  style={{ borderColor: 'var(--text)' }}
                >
                  Дерево уроков
                </h5>
                <div className="d-grid gap-3">
                  <Button onClick={handlePassAllLessons} color="access" variant="outline">
                    Разблокировать 4 урока
                  </Button>

                  <Button
                    onClick={() => fullState.passLesson('lesson_1')}
                    color="primary"
                    variant="outline"
                  >
                    Пройти только "Урок 1"
                  </Button>

                  <Button onClick={handleClearProgress} color="text" variant="solid">
                    Сбросить прогресс
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 shadow-sm" style={cardStyles}>
              <div className="card-body">
                <h5
                  className="card-title fw-bold border-bottom mb-3 pb-2"
                  style={{ borderColor: 'var(--text)' }}
                >
                  Контент и Тесты
                </h5>
                <div className="d-grid gap-3">
                  <Button
                    onClick={() => fullState.passHomework('hw_breath_1')}
                    color="homework"
                    variant="outline"
                  >
                    Сдать ДЗ (hw_breath_1)
                  </Button>

                  <Button
                    onClick={() =>
                      fullState.passTest('test_intro', {
                        score: 5,
                        maxScore: 5,
                        userAnswers: [[0]],
                      })
                    }
                    color="accent"
                    variant="outline"
                  >
                    Засчитать "test_intro" (100%)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm" style={cardStyles}>
              <div className="card-body">
                <h5
                  className="card-title fw-bold border-bottom mb-3 pb-2"
                  style={{ borderColor: 'var(--text)' }}
                >
                  Системные настройки
                </h5>
                <div className="d-flex flex-wrap gap-3">
                  <div className="flex-grow-1">
                    <ThemeToggle />
                  </div>
                  <div className="flex-grow-1">
                    <Button
                      onClick={handleHardReset}
                      color="text"
                      variant="solid"
                      style={{ width: '100%' }}
                    >
                      Hard Reset (Очистить всё)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
