import { Workflow } from '@/features/workflow/types';

export interface WorkflowSnapshot {
  id: string;
  timestamp: number;
  data: Workflow;
  description: string;
}

/**
 * Manages workflow version history for undo support.
 * Stores deep-cloned snapshots of the workflow data before each modification.
 */
export class WorkflowHistory {
  private snapshots: WorkflowSnapshot[] = [];
  private maxSnapshots: number;

  constructor(maxSnapshots: number = 50) {
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Save a snapshot of the current workflow state before a modification.
   */
  push(data: Workflow, description: string): WorkflowSnapshot {
    const snapshot: WorkflowSnapshot = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // deep clone
      description,
    };

    this.snapshots.push(snapshot);

    // Trim old snapshots if exceeding max
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  /**
   * Pop the most recent snapshot (undo).
   * Returns the snapshot to restore, or null if no history.
   */
  pop(): WorkflowSnapshot | null {
    return this.snapshots.pop() || null;
  }

  /**
   * Peek at the most recent snapshot without removing it.
   */
  peek(): WorkflowSnapshot | null {
    return this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1]
      : null;
  }

  /**
   * Get the number of snapshots available for undo.
   */
  get length(): number {
    return this.snapshots.length;
  }

  /**
   * Get a summary of all snapshots (for debugging or display).
   */
  getSummary(): string[] {
    return this.snapshots.map(
      (s) => `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.description}`,
    );
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.snapshots = [];
  }
}
