import { catalogShareUrl } from '@/lib/shareUrl'

/**
 * Dev-stage stand-in for the API's generated QR PNG — encodes the same
 * `/join?catalogId=<id>` link a real code would, via a public QR image
 * service, so the mock is scannable end to end like the real one.
 */
export function mockQrUrl(catalogId: string): string {
  const data = encodeURIComponent(catalogShareUrl(catalogId))
  return `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${data}`
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomId(): string {
  return Math.random().toString(36).substr(2, 9)
}
