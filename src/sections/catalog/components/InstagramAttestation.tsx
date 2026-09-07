import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InstagramProfileCandidate } from '../actions/searchInstagramProfiles'

type Props = {
  candidate: InstagramProfileCandidate
  /** The server's sentence with the handle already substituted in. */
  attestationText: string
  attested: boolean
  isEnrolling: boolean
  onAttestedChange: (value: boolean) => void
  onConfirm: () => void
  onBack: () => void
}

/**
 * Step 3 of enrollment: the ownership attestation, then the commit.
 *
 * Alkachof cannot prove a seller owns the account they picked — reading public
 * profiles involves no OAuth handshake — so this attestation *is* the control.
 * The seller states ownership, the server records the sentence and its version
 * against their row, and importing someone else's content becomes a terms
 * violation that can be acted on.
 *
 * That is only worth anything if the tick is a deliberate act: the checkbox is
 * never pre-ticked, and the commit stays disabled until it is ticked.
 *
 * The wording comes from the API, not from this file. What gets stored has to be
 * what was displayed, and the only way to guarantee that is for both to come
 * from the same server-owned constant.
 */
export function InstagramAttestation({
  candidate,
  attestationText,
  attested,
  isEnrolling,
  onAttestedChange,
  onConfirm,
  onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center">
        <img src={candidate.avatarUrl} alt="" className="size-16 rounded-full object-contain" />
        <p className="text-sm font-semibold">@{candidate.alias}</p>
        <p className="text-xs text-muted-foreground">{candidate.fullName}</p>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-muted/50 p-3 text-sm">
        <input
          type="checkbox"
          checked={attested}
          disabled={isEnrolling}
          onChange={(e) => onAttestedChange(e.target.checked)}
          className="mt-1 size-4 shrink-0"
        />
        <span>{attestationText}</span>
      </label>

      <div className="flex flex-col gap-2">
        <Button onClick={onConfirm} disabled={!attested || isEnrolling}>
          {isEnrolling && <LoaderCircle size={16} className="animate-spin" />}
          Vincular cuenta
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Solo puedes vincular una cuenta y no podrás cambiarla después.
        </p>
        {!isEnrolling && (
          <button type="button" onClick={onBack} className="text-xs underline">
            Cambiar
          </button>
        )}
      </div>
    </div>
  )
}
