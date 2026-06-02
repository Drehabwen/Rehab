/**
 * asyncState — Zustand helper for loading/error state management.
 *
 * Multiple stores repeat:
 *   set({ isLoading: true, error: null });
 *   try { ... } catch (e) { set({ error: e.message }); }
 *   finally { set({ isLoading: false }); }
 *
 * Usage in a store:
 *   someAction: async () => {
 *     await withAsync(set, async () => {
 *       // do work, can read/write from get() as needed
 *     });
 *   }
 */

interface AsyncState {
  isLoading: boolean;
  error: string | null;
}

type SetFn<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

/**
 * Wraps an async operation with automatic isLoading/error tracking.
 * Calls set({ isLoading: true, error: null }) before, and
 * set({ isLoading: false }) after. On error, sets error message.
 */
export async function withAsync<T extends AsyncState>(
  set: SetFn<T>,
  fn: () => Promise<void>,
): Promise<void> {
  set({ isLoading: true, error: null } as Partial<T>);
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    set({ error: message } as Partial<T>);
  } finally {
    set({ isLoading: false } as Partial<T>);
  }
}
