import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  platform: { type: 'web', getVersion: vi.fn(async () => '1.0.0') },
  mobileRequest: vi.fn(),
}))

vi.mock('@/platform', () => ({ default: mocks.platform }))
vi.mock('./mobile-request', () => ({ handleMobileRequest: mocks.mobileRequest }))

import { apiRequest } from './request'

describe('provider API request routing', () => {
  afterEach(() => {
    mocks.platform.type = 'web'
    mocks.platform.getVersion.mockClear()
    mocks.mobileRequest.mockReset()
    vi.unstubAllGlobals()
  })

  it('keeps local targets in the renderer', async () => {
    const response = new Response('ok')
    const rendererFetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', rendererFetch)

    await expect(apiRequest.get('http://127.0.0.1:11434/api/tags', {}, { useProxy: true, retry: 0 })).resolves.toBe(
      response
    )

    expect(rendererFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/tags',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('uses the proxy relay for remote web targets when proxy is enabled', async () => {
    mocks.platform.type = 'web'
    const response = new Response('ok')
    const rendererFetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', rendererFetch)

    await apiRequest.get('https://provider.example/v1/models', {}, { useProxy: true, retry: 0 })

    expect(rendererFetch).toHaveBeenCalledWith(
      'https://cors-proxy.chatboxai.app/proxy-api/completions',
      expect.objectContaining({ method: 'GET' })
    )
    const headers = rendererFetch.mock.calls[0][1].headers as Headers
    expect(headers.get('CHATBOX-TARGET-URI')).toBe('https://provider.example/v1/models')
    expect(headers.get('CHATBOX-PLATFORM')).toBe('web')
  })

  it('preserves the ApiError contract for failed responses', async () => {
    const rendererFetch = vi.fn().mockResolvedValue(new Response('upstream unavailable', { status: 503 }))
    vi.stubGlobal('fetch', rendererFetch)

    const request = apiRequest.get('https://provider.example/v1/models', {}, { useProxy: false, retry: 0 })

    await expect(request).rejects.toMatchObject({
      message: 'API Error: Status Code 503',
      responseBody: 'upstream unavailable',
    })
  })

  it('routes through handleMobileRequest when platform is mobile and useProxy is true', async () => {
    mocks.platform.type = 'mobile'
    const response = new Response('ok')
    mocks.mobileRequest.mockResolvedValue(response)

    await apiRequest.post('https://provider.example/v1/chat', {}, '{"stream":true}', { useProxy: true, retry: 0 })

    expect(mocks.mobileRequest).toHaveBeenCalledWith(
      'https://provider.example/v1/chat',
      'POST',
      expect.any(Headers),
      '{"stream":true}',
      undefined
    )
  })
})
