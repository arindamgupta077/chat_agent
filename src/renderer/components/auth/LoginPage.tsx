import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowRight,
  IconBrain,
  IconCheck,
  IconCpu,
  IconDatabase,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconShieldLock,
} from '@tabler/icons-react'
import React, { useState } from 'react'
import { useAppAuthStore } from '@/stores/appAuthStore'

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
      setLocalError('Please enter a valid email address (e.g. user@company.com).')
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
      className="min-h-screen w-full flex items-center justify-center relative p-4 select-none overflow-hidden"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 85% 90%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 15% 85%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
          radial-gradient(rgba(148, 163, 184, 0.18) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 28px 28px',
      }}
    >
      {/* Decorative ambient glowing orbs */}
      <Box
        className="absolute pointer-events-none rounded-full blur-[120px] opacity-40"
        style={{
          width: '420px',
          height: '420px',
          top: '-8%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.12) 100%)',
        }}
      />
      <Box
        className="absolute pointer-events-none rounded-full blur-[120px] opacity-25"
        style={{
          width: '320px',
          height: '320px',
          bottom: '-5%',
          right: '10%',
          background: 'rgba(99, 102, 241, 0.12)',
        }}
      />

      <Container size="xs" className="w-full max-w-[460px] z-10 py-6">
        {/* Header Branding */}
        <Stack align="center" gap="sm" mb="xl">
          <Box className="relative">
            {/* Ambient Logo Glow */}
            <Box
              className="absolute -inset-1 rounded-2xl opacity-40 blur-md transition duration-300"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed, #06b6d4)',
              }}
            />
            {/* 3D-styled Logo Emblem */}
            <Box
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition duration-200 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6d28d9 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 12px 24px -6px rgba(37, 99, 235, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
              }}
            >
              <IconBrain size={30} stroke={2.2} />
            </Box>
          </Box>

          <Group gap="xs" align="center" mt={4}>
            <Title
              order={2}
              style={{
                fontWeight: 800,
                letterSpacing: '-0.6px',
                fontSize: '1.75rem',
                background: 'linear-gradient(135deg, #0f172a 40%, #1e40af 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AgentLab
            </Title>
            <Badge
              variant="filled"
              size="sm"
              radius="sm"
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontWeight: 700,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              Enterprise
            </Badge>
          </Group>

          <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: '360px', lineHeight: 1.45, color: '#64748b' }}>
            Unified Multi-Model Intelligence & AI Workspace
          </Text>

          {/* Quick Feature Badges */}
          <Group gap={6} justify="center" mt={2}>
            <Badge
              leftSection={<IconShieldCheck size={12} style={{ color: '#2563eb' }} />}
              variant="outline"
              size="xs"
              radius="xl"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                color: '#475569',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              RBAC Protected
            </Badge>
            <Badge
              leftSection={<IconCpu size={12} style={{ color: '#7c3aed' }} />}
              variant="outline"
              size="xs"
              radius="xl"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                color: '#475569',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              Multi-Model AI
            </Badge>
            <Badge
              leftSection={<IconDatabase size={12} style={{ color: '#0284c7' }} />}
              variant="outline"
              size="xs"
              radius="xl"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                color: '#475569',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              PostgreSQL Sync
            </Badge>
          </Group>
        </Stack>

        {/* Card Container */}
        <Card
          withBorder
          shadow="xl"
          radius="xl"
          p="xl"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05), 0 2px 4px rgba(15, 23, 42, 0.02)',
          }}
        >
          <Stack gap={4} mb="lg">
            <Title order={3} fw={700} style={{ color: '#0f172a', letterSpacing: '-0.3px' }}>
              Sign In
            </Title>
            <Text size="sm" style={{ color: '#64748b' }}>
              Enter your email credentials to access your workspace
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

          {/* SIGN IN FORM */}
          <form onSubmit={handleSignIn}>
            <Stack gap="md">
              <TextInput
                label="Email ID"
                placeholder="name@company.com"
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
                    transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
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
                    transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
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
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  marginTop: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#ffffff',
                  transition: 'all 0.2s ease',
                  border: 'none',
                }}
              >
                Sign In to AgentLab
              </Button>
            </Stack>
          </form>

          {/* Admin Managed Access Notice */}
          <Box
            mt="xl"
            p="sm"
            className="rounded-xl border"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <Group gap="xs" align="center" wrap="nowrap">
              <IconShieldLock size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
              <Box>
                <Text size="xs" fw={600} style={{ color: '#1e40af' }}>
                  Admin-Managed Access
                </Text>
                <Text size="xs" style={{ color: '#64748b', lineHeight: 1.35 }}>
                  User accounts are provisioned exclusively by system administrators. Contact your administrator if you need access.
                </Text>
              </Box>
            </Group>
          </Box>
        </Card>

        {/* Database & Security Notice */}
        <Group justify="center" gap="xs" mt="lg">
          <Box className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          <Text size="xs" ta="center" style={{ color: '#64748b' }}>
            Connected to PostgreSQL (<span className="font-mono text-slate-800 font-medium">app_db</span>) &bull; PBKDF2 Encrypted
          </Text>
        </Group>
      </Container>
    </Box>
  )
}
