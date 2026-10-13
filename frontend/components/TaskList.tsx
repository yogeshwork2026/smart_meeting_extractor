'use client';

import type { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import styles from './TaskList.module.css';

interface Props {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  hasSubmitted: boolean;
}

export function TaskList({ tasks, isLoading, error, notice, hasSubmitted }: Props) {
  if (isLoading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((key) => (
          <div key={key} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <strong>Something went wrong</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!hasSubmitted) {
    return <p className={styles.empty}>Paste some notes and hit Submit to see task cards here.</p>;
  }

  if (tasks.length === 0) {
    return <p className={styles.empty}>{notice ?? 'No actionable tasks found in these notes.'}</p>;
  }

  return (
    <>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      <div className={styles.grid}>
        {tasks.map((task, index) => (
          <TaskCard key={task.id ?? index} task={task} />
        ))}
      </div>
    </>
  );
}
