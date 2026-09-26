import { Alert, Box, Button, Card, Image, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconArrowRight, IconCheck, IconLock, IconMail } from '@tabler/icons-react'
import React, { useState } from 'react'
import { useAppAuthStore } from '@/stores/appAuthStore'
import icon from '@/static/icon.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const { login, isLoading, error: storeError } = useAppAuthStore()

  const trimmedEmail = email.trim()
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!trimmedEmail || !password) {
      setLocalError('Please enter both your email ID and password.')
      return
    }

    if (!isEmailValid) {
      setLocalError('Please enter a valid email address.')
      return
    }

    const ok = await login(trimmedEmail, password)
    if (ok) {
      // Reload page to rehydrate platform with postgres storage
      window.location.reload()
    }
  }

  const activeError = localError || storeError

  return (
    <Box
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative select-none overflow-hidden"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 50% 100%, rgba(124, 58, 237, 0.06) 0%, transparent 50%),
          radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 28px 28px',
      }}
    >
      {/* Symmetrical ambient background glow */}
      <Box
        className="absolute pointer-events-none rounded-full blur-[140px] opacity-40"
        style={{
          width: '500px',
          height: '500px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        }}
      />

      {/* Centered Symmetrical Container */}
      <div className="w-full max-w-[420px] z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center gap-3.5 mb-2">
            <Image
              src={icon}
              w={52}
              h={52}
              style={{ flexShrink: 0 }}
              alt="AgentLab Logo"
            />
            <Title
              order={2}
              style={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                fontSize: '2.1rem',
                color: '#0f172a',
                lineHeight: 1.2,
              }}
            >
              AgentLab
            </Title>
          </div>

          <Text
            size="sm"
            ta="center"
            mt={4}
            style={{
              color: '#475569',
              lineHeight: 1.45,
              maxWidth: '340px',
            }}
          >
            Build your own AI agents & automate workflows using natural language
          </Text>
        </div>

        {/* Centered Sign In Card */}
        <Card
          withBorder
          shadow="xl"
          radius="20px"
          p="xl"
          className="w-full"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Stack gap={2} mb="lg" align="center">
            <Title order={3} fw={700} style={{ color: '#0f172a', letterSpacing: '-0.3px', fontSize: '1.35rem' }}>
              Sign In
            </Title>
            <Text size="xs" style={{ color: '#64748b' }}>
              Enter your credentials to continue
            </Text>
          </Stack>

          {/* Error Notification */}
          {activeError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              radius="md"
              mb="md"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
              }}
            >
              {activeError}
            </Alert>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSignIn}>
            <Stack gap="md">
              <TextInput
                label="Email ID"
                placeholder="name@itc.in"
                type="email"
                leftSection={<IconMail size={17} style={{ color: '#2563eb' }} />}
                rightSection={isEmailValid ? <IconCheck size={16} style={{ color: '#059669' }} /> : null}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoFocus
                autoComplete="email"
                styles={{
                  label: { color: '#1e293b', fontWeight: 600, fontSize: '13px', marginBottom: '6px' },
                  input: {
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    height: '42px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                leftSection={<IconLock size={17} style={{ color: '#4f46e5' }} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                styles={{
                  label: { color: '#1e293b', fontWeight: 600, fontSize: '13px', marginBottom: '6px' },
                  input: {
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    height: '42px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={isLoading}
                rightSection={<IconArrowRight size={17} />}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
                  marginTop: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  height: '42px',
                  color: '#ffffff',
                  transition: 'all 0.2s ease',
                  border: 'none',
                }}
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Card>
      </div>
    </Box>
  )
}
