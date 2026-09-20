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
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconBrain,
  IconCheck,
  IconInfoCircle,
  IconLock,
  IconMail,
  IconSparkles,
  IconUser,
} from '@tabler/icons-react'
import React, { useState } from 'react'
import { useAppAuthStore } from '@/stores/appAuthStore'

export default function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const { login, register, isLoading, error: storeError } = useAppAuthStore()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!identifier.trim() || !password) {
      setLocalError('Please enter your username/email and password')
      return
    }

    const ok = await login(identifier.trim(), password)
    if (ok) {
      // Reload page to rehydrate platform with postgres storage
      window.location.reload()
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!username.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all required fields')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long')
      return
    }

    const ok = await register(username.trim(), email.trim(), password)
    if (ok) {
      window.location.reload()
    }
  }

  const activeError = localError || storeError

  return (
    <Box
      className="min-h-screen w-full flex items-center justify-center relative p-4"
      style={{
        backgroundColor: 'var(--chatbox-background-primary, #0f141c)',
        backgroundImage: `
          radial-gradient(at 20% 20%, rgba(59, 130, 246, 0.12) 0px, transparent 50%),
          radial-gradient(at 80% 80%, rgba(147, 51, 234, 0.12) 0px, transparent 50%)
        `,
      }}
    >
      <Container size="xs" className="w-full max-w-[440px] z-10">
        {/* Header Branding */}
        <Stack align="center" gap="xs" mb="xl">
          <Group gap="xs" align="center">
            <Box
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: '#ffffff',
              }}
            >
              <IconBrain size={26} stroke={2} />
            </Box>
            <Title
              order={2}
              style={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: 'var(--chatbox-tint-primary, #ffffff)',
              }}
            >
              AgentLab
            </Title>
            <Badge variant="light" color="blue" size="sm" radius="sm">
              v2.0
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" ta="center">
            Next-Gen AI Workspace & Unified Multi-Model Intelligence
          </Text>
        </Stack>

        {/* Card Container */}
        <Card
          withBorder
          shadow="xl"
          radius="lg"
          p="xl"
          style={{
            backgroundColor: 'var(--chatbox-background-secondary, #161d27)',
            borderColor: 'var(--chatbox-border-primary, rgba(255, 255, 255, 0.1))',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Tabs
            value={tab}
            onChange={(val) => {
              setTab(val as 'signin' | 'signup')
              setLocalError(null)
            }}
            variant="pills"
            radius="md"
            mb="lg"
          >
            <Tabs.List grow>
              <Tabs.Tab value="signin" style={{ fontWeight: 600 }}>
                Sign In
              </Tabs.Tab>
              <Tabs.Tab value="signup" style={{ fontWeight: 600 }}>
                Create Account
              </Tabs.Tab>
            </Tabs.List>

            {/* Error Notification */}
            {activeError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                radius="md"
                mt="md"
                mb="sm"
              >
                {activeError}
              </Alert>
            )}

            {/* SIGN IN TAB */}
            <Tabs.Panel value="signin" pt="xs">
              <form onSubmit={handleSignIn}>
                <Stack gap="md">
                  <TextInput
                    label="Username or Email"
                    placeholder="admin or user@example.com"
                    leftSection={<IconUser size={16} />}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.currentTarget.value)}
                    required
                    autoFocus
                  />

                  <PasswordInput
                    label="Password"
                    placeholder="Enter your password"
                    leftSection={<IconLock size={16} />}
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      marginTop: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Sign In to AgentLab
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            {/* SIGN UP TAB */}
            <Tabs.Panel value="signup" pt="xs">
              <form onSubmit={handleSignUp}>
                <Stack gap="sm">
                  <TextInput
                    label="Username"
                    placeholder="Choose a username"
                    leftSection={<IconUser size={16} />}
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />

                  <TextInput
                    label="Email Address"
                    type="email"
                    placeholder="name@company.com"
                    leftSection={<IconMail size={16} />}
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    required
                  />

                  <PasswordInput
                    label="Password"
                    placeholder="Minimum 6 characters"
                    leftSection={<IconLock size={16} />}
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                  />

                  <PasswordInput
                    label="Confirm Password"
                    placeholder="Repeat password"
                    leftSection={<IconCheck size={16} />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    required
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      marginTop: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Create AgentLab Account
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>
          </Tabs>

          {/* Admin Account Helper Tip */}
          <Box
            p="xs"
            className="rounded-lg border border-solid"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
            }}
          >
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <IconSparkles size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <Box>
                <Text size="xs" fw={600} style={{ color: '#60a5fa' }}>
                  Default Administrator Account
                </Text>
                <Text size="xs" c="dimmed">
                  Username: <span className="font-mono text-gray-200">admin</span> &nbsp;|&nbsp; Password:{' '}
                  <span className="font-mono text-gray-200">Admin@123</span>
                </Text>
              </Box>
            </Group>
          </Box>
        </Card>

        {/* Database Notice */}
        <Group justify="center" gap="xs" mt="md">
          <IconInfoCircle size={14} className="text-gray-500" />
          <Text size="xs" c="dimmed" ta="center">
            Connected to local PostgreSQL database (<span className="font-mono">app_db</span>)
          </Text>
        </Group>
      </Container>
    </Box>
  )
}
