/**
 * Delay the execution of a function by the amount specified in ms.
 *
 * @param ms - The amount of time to delay in milliseconds.
 *
 * @returns A promise that resolves after the specified delay.
 */
export async function delay(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}
