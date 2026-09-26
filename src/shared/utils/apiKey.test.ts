import { describe, expect, it } from 'vitest'
import { isDummyApiKey, isValidApiKey } from './apiKey'

describe('apiKey utils', () => {
  it('correctly identifies dummy or autofilled API keys', () => {
    expect(isDummyApiKey('Admin@123')).toBe(true)
    expect(isDummyApiKey('admin@123')).toBe(true)
    expect(isDummyApiKey('ADMIN@123')).toBe(true)
    expect(isDummyApiKey('admin')).toBe(true)
    expect(isDummyApiKey('password')).toBe(true)
    expect(isDummyApiKey('welcome@123')).toBe(true)
    expect(isDummyApiKey('')).toBe(false)
    expect(isDummyApiKey(undefined)).toBe(false)
    expect(isDummyApiKey('sk-ant-api03-valid-claude-key-long-enough')).toBe(false)
    expect(isDummyApiKey('sk-proj-valid-openai-key-long-enough')).toBe(false)
  })

  it('correctly validates genuine API keys', () => {
    expect(isValidApiKey('Admin@123')).toBe(false)
    expect(isValidApiKey('admin')).toBe(false)
    expect(isValidApiKey('')).toBe(false)
    expect(isValidApiKey(undefined)).toBe(false)
    expect(isValidApiKey('short')).toBe(false)
    expect(isValidApiKey('short', true)).toBe(true)
    expect(isValidApiKey('ollama')).toBe(true)
    expect(isValidApiKey('OLLAMA')).toBe(true)
    expect(isValidApiKey('sk-ant-api03-valid-claude-key-long-enough')).toBe(true)
    expect(isValidApiKey('sk-proj-valid-openai-key-long-enough')).toBe(true)
    expect(isValidApiKey('AIzaSyD-valid-gemini-key-long-enough')).toBe(true)
  })
})
