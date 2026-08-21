/**
 * The house rule for non-idempotent actions — anything that creates, charges,
 * or moves state and must not be tapped twice.
 *
 * Such an action is held on screen for at least `MIN_PENDING_MS` while its
 * button renders as a filling progress bar (`ProgressButton`). This is
 * deliberate, not a loading spinner in disguise: on a fast connection the round
 * trip can finish in 40ms, and a button that flickers reads as "nothing
 * happened", inviting the second tap the operation cannot take. The floor makes
 * every such action register as work, at the same pace, whatever the network is
 * doing.
 *
 * It came from checkout (`CartDrawer`) and is applied per explicit product
 * decision — checkout, quoting a service, and moving a request or order's
 * status. **Do not extend it to other actions without asking:** where it
 * belongs is a judgement call about consequence, not a pattern to spread.
 */
export const MIN_PENDING_MS = 1000

/**
 * Runs `work`, resolving no sooner than `ms`.
 *
 * A rejection is *not* floored — it propagates as soon as it happens, so an
 * error message never waits behind an animation. The floor exists to make
 * success feel deliberate; a failure is already interesting enough.
 */
export async function withMinDuration<T>(
  work: Promise<T>,
  ms: number = MIN_PENDING_MS,
): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
  return result
}
