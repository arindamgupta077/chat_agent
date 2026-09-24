// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'
import { useAppAuthStore } from '@/stores/appAuthStore'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })),
})

describe('LoginPage', () => {
  beforeEach(() => {
    useAppAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders branding and minimal tagline for AI agents and natural language workflows', () => {
    render(
      <MantineProvider>
        <LoginPage />
      </MantineProvider>
    )

    expect(screen.getByText('AgentLab')).toBeTruthy()
    expect(screen.getByText(/Build your own AI agents & automate workflows using natural language/i)).toBeTruthy()
  })

  it('renders sign-in modal with email, password inputs, and sign in button', () => {
    render(
      <MantineProvider>
        <LoginPage />
      </MantineProvider>
    )

    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeTruthy()
    expect(screen.getByLabelText(/Email ID/i)).toBeTruthy()
    expect(screen.getByPlaceholderText('name@itc.in')).toBeTruthy()
    expect(screen.getByLabelText(/Password/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeTruthy()
  })

  it('displays error alerts when store error exists', () => {
    useAppAuthStore.setState({
      error: 'Invalid email or password',
    })

    render(
      <MantineProvider>
        <LoginPage />
      </MantineProvider>
    )

    expect(screen.getByText('Invalid email or password')).toBeTruthy()
  })
})
