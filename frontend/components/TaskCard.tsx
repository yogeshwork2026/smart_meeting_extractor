'use client';

import type { Task } from '@/types/task';
import styles from './TaskCard.module.css';

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <span className={`${styles.badge} ${styles[task.priority]}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        {task.due_date ? <span className={styles.due}>Due: {task.due_date}</span> : null}
      </header>

      <p className={styles.task}>{task.task}</p>

      <footer className={styles.footer}>
        <span className={styles.avatar} aria-hidden="true">
          {task.owner.charAt(0).toUpperCase()}
        </span>
        <span className={styles.owner}>{task.owner}</span>
      </footer>
    </article>
  );
}
