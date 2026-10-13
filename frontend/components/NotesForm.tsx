'use client';

import { useState } from 'react';
import styles from './NotesForm.module.css';

const SAMPLE = `Standup notes - 13 Oct
Priya will fix the login redirect bug, it is urgent and blocks release.
@rahul to prepare the Q4 budget deck by Friday.
Discussed moving analytics to BigQuery, nice to have for next quarter.
Sara needs to review the API contract by tomorrow.`;

interface Props {
  isLoading: boolean;
  onSubmit: (notes: string) => void;
  onClear: () => void;
}

export function NotesForm({ isLoading, onSubmit, onClear }: Props) {
  const [notes, setNotes] = useState('');
  const trimmed = notes.trim();
  const isTooShort = trimmed.length > 0 && trimmed.length < 10;
  const canSubmit = !isLoading && trimmed.length >= 10;

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(trimmed);
      }}
    >
      <label className={styles.label} htmlFor="notes">
        Raw meeting notes
      </label>

      <textarea
        id="notes"
        className={styles.textarea}
        value={notes}
        rows={12}
        placeholder="Paste your messy meeting notes here..."
        onChange={(event) => setNotes(event.target.value)}
        aria-describedby="notes-hint"
        disabled={isLoading}
      />

      <p id="notes-hint" className={styles.hint}>
        {isTooShort ? 'Add at least 10 characters.' : `${trimmed.length} characters`}
      </p>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={!canSubmit}>
          {isLoading ? 'Processing…' : 'Submit'}
        </button>

        <button
          type="button"
          className={styles.secondary}
          onClick={() => setNotes(SAMPLE)}
          disabled={isLoading}
        >
          Load sample
        </button>

        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            setNotes('');
            onClear();
          }}
          disabled={isLoading}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
