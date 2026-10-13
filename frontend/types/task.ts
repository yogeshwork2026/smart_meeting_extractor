export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id?: number;
  task: string;
  owner: string;
  priority: Priority;
  due_date: string | null;
  created_at?: string;
}

export interface ExtractResponse {
  tasks: Task[];
  /** false when extraction succeeded but the database write failed */
  persisted?: boolean;
  warning?: string;
  message?: string;
}
