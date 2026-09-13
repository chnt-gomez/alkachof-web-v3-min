import { BadgeCheck, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InstagramProfileCandidate } from '../actions/searchInstagramProfiles'

type Props = {
  query: string
  candidates: InstagramProfileCandidate[]
  onSelect: (candidate: InstagramProfileCandidate) => void
  onSearchAgain: () => void
}

/**
 * Step 2 of enrollment: confirm the account that was found.
 *
 * The lookup resolves an exact handle, so this is normally **one row, not a
 * list** — a confirmation step rather than a choice. It still earns its place:
 * enrollment is permanent, and seeing the avatar, handle and post count of the
 * account you are about to be locked to is the only chance to catch a wrong
 * handle before it becomes a support ticket. The list shape is kept so a future
 * by-name lookup would not need a new component.
 *
 * **A private account renders but is not selectable.** Hiding it would make the
 * seller think their account was not found and retype the same handle forever;
 * showing it dimmed, with the reason, is what actually explains the dead end.
 */
export function InstagramProfilePicker({ query, candidates, onSelect, onSearchAgain }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {candidates.length === 1
          ? '¿Es esta tu cuenta? Solo podrás vincular una, y no podrás cambiarla después.'
          : 'Elige tu cuenta. Solo podrás vincular una, y no podrás cambiarla después.'}
      </p>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No encontramos la cuenta @{query}. Revisa que esté bien escrito y que sea pública.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li key={candidate.profileId}>
              <button
                type="button"
                onClick={() => onSelect(candidate)}
                aria-label={`@${candidate.alias}`}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                  candidate.isPrivate ? 'opacity-50' : 'hover:bg-muted'
                }`}
              >
                <img
                  src={candidate.avatarUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-full object-contain"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <span className="truncate">@{candidate.alias}</span>
                    {candidate.isVerified && (
                      <BadgeCheck size={14} className="shrink-0 text-primary" />
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {candidate.fullName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {candidate.isPrivate ? (
                      <span className="flex items-center gap-1">
                        <Lock size={11} /> Cuenta privada
                      </span>
                    ) : (
                      `${candidate.postCount} publicaciones`
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" className="self-start" onClick={onSearchAgain}>
        Buscar otra cuenta
      </Button>
    </div>
  )
}
