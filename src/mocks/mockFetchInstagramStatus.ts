import type { InstagramStatus } from '@/sections/catalog/actions/fetchInstagramStatus'
import {
  MOCK_COOLDOWN_DAYS,
  mockInstagramAvailable,
  mockInstagramAvailableAt,
  mockInstagramEnrolled,
} from './mockInstagramStore'

export function mockFetchInstagramStatus(): Promise<InstagramStatus> {
  return Promise.resolve({
    enrolled: mockInstagramEnrolled(),
    available: mockInstagramAvailable(),
    nextAvailable: mockInstagramAvailableAt(),
    cooldownDays: MOCK_COOLDOWN_DAYS,
  })
}
