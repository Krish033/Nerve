import { useCallback, useState } from "react";

/**
 * Surfaces async errors to the nearest React error boundary.
 *
 * React error boundaries only catch errors thrown during rendering.
 * This hook lets async callbacks throw errors into the boundary.
 *
 * Usage:
 *   const throwError = useAsyncError();
 *   somePromise.catch((err) => throwError(err));
 */
export function useAsyncError() {
  const [, setState] = useState<unknown>();

  return useCallback((error: unknown) => {
    setState(() => {
      throw error;
    });
  }, []);
}
