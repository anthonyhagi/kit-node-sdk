/**
 * Delay the execution of a function by the amount specified in ms.
 *
 * @param ms - The amount of time to delay in milliseconds.
 * @param signal - Optional cancellation signal.
 *
 * @returns A promise that resolves after the specified delay.
 */
export async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return await new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
