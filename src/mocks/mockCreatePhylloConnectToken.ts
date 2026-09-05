import type { ConnectTokenResult } from '@/sections/catalog/actions/createPhylloConnectToken'
import { mockMarkInstagramConnected } from './mockInstagramStore'
import { randomId } from './random'

/**
 * Dev stage never loads Phyllo's script, so minting the token is where the
 * connect is faked: `/phyllo/account` reports CONNECTED from here on.
 */
export function mockCreatePhylloConnectToken(): Promise<ConnectTokenResult> {
  mockMarkInstagramConnected()
  return Promise.resolve({
    ok: true,
    token: {
      sdkToken: `mock_sdk_token_${randomId()}`,
      phylloUserId: '9546b4fe-cef7-48c4-ab9f-960dd0080728',
      workPlatformId: '9bb8913b-ddd9-430b-a66a-d74d846e6c66',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
}
