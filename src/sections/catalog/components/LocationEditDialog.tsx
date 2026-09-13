import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { createLocation, type LocationInput } from '../actions/createLocation'
import { updateLocation } from '../actions/updateLocation'
import { LocationMapPicker, type Coords } from './LocationMapPicker'
import type { CatalogLocation } from '@/sections/publicCatalog/actions/fetchCatalogLocation'

type Props = {
  catalogId: string
  location: CatalogLocation | null
  onSaved: (location: CatalogLocation) => void
  onClose: () => void
}

/** Coordinates from an existing location, or null when they are unset/invalid. */
function coordsFrom(location: CatalogLocation | null): Coords | null {
  if (!location) return null
  const { lat, lng } = location
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function LocationEditDialog({ catalogId, location, onSaved, onClose }: Props) {
  const [coords, setCoords] = useState<Coords | null>(() => coordsFrom(location))
  const [streetName, setStreetName] = useState(location?.street_name ?? '')
  const [number, setNumber] = useState(location?.number ?? '')
  const [additionalNumber, setAdditionalNumber] = useState(location?.additional_number ?? '')
  const [neighborhood, setNeighborhood] = useState(location?.neighborhood ?? '')
  const [city, setCity] = useState(location?.city ?? '')
  const [stateName, setStateName] = useState(location?.state ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!coords) {
      setError('Selecciona la ubicación en el mapa antes de guardar.')
      return
    }

    const input: LocationInput = {
      lat: coords.lat,
      lng: coords.lng,
      street_name: streetName,
      number,
      additional_number: additionalNumber,
      neighborhood,
      city,
      state: stateName,
    }

    setSaving(true)
    setError(null)
    try {
      const saved = location
        ? await updateLocation(location._id, input)
        : await createLocation(catalogId, input)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ubicación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onClose={onClose} ariaLabel="Editar ubicación" title="Ubicación del catálogo">
      <div className="flex flex-col gap-4 p-5">
        <Field label="Ubicación en el mapa">
          <LocationMapPicker value={coords} onChange={setCoords} />
        </Field>

        <Field label="Calle">
          <input
            className="input"
            value={streetName}
            onChange={(e) => setStreetName(e.target.value)}
            placeholder="Ej. Av. Insurgentes Sur"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Número">
            <input
              className="input"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ej. 300"
            />
          </Field>
          <Field label="Número interior">
            <input
              className="input"
              value={additionalNumber}
              onChange={(e) => setAdditionalNumber(e.target.value)}
              placeholder="Ej. 4B"
            />
          </Field>
        </div>

        <Field label="Colonia">
          <input
            className="input"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Ej. Roma Norte"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Ciudad de México"
            />
          </Field>
          <Field label="Estado">
            <input
              className="input"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="Ej. CDMX"
            />
          </Field>
        </div>
      </div>

      {/* Pinned to the bottom of the scrolling dialog so the actions stay
          reachable no matter how tall the map + address fields grow. */}
      <div className="sticky bottom-0 border-t bg-background">
        {error && (
          <p role="alert" className="px-5 pt-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3 px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar ubicación'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
