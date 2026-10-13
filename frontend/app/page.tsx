'use client';

import { useState } from 'react';
import { NotesForm } from '@/components/NotesForm';
import { TaskList } from '@/components/TaskList';
import { extractTasks } from '@/lib/api';
import type { Task } from '@/types/task';
import styles from './page.module.css';

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function handleClear() {
    setTasks([]);
    setError(null);
    setNotice(null);
    setHasSubmitted(false);
  }

  async function handleSubmit(notes: string) {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    setHasSubmitted(true);

    try {
      const result = await extractTasks(notes);
      setTasks(result.tasks);
      setNotice(result.warning ?? result.message ?? null);
    } catch (err) {
      setTasks([]);
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Smart Meeting Extractor</h1>
        <p className={styles.subtitle}>
          Turn messy meeting notes into structured, actionable task cards.
        </p>
      </header>

      <section className={styles.panel}>
        <NotesForm isLoading={isLoading} onSubmit={handleSubmit} onClear={handleClear} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Task Cards</h2>
          {tasks.length > 0 ? <span className={styles.count}>{tasks.length}</span> : null}
        </div>

        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          error={error}
          notice={notice}
          hasSubmitted={hasSubmitted}
        />
      </section>
    </main>
  );
}
