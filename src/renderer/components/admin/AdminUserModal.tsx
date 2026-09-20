import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconDatabase,
  IconKey,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react'
import { type FC, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { getAuthHeaders, useAppAuthStore } from '@/stores/appAuthStore'

export interface AdminUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

interface AdminUserModalProps {
  opened: boolean
  onClose: () => void
}

export const AdminUserModal: FC<AdminUserModalProps> = ({ opened, onClose }) => {
  const currentUser = useAppAuthStore((s) => s.user)

  // Users List State
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  // Form State for UI user creation
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // SQL Generator Form State
  const [sqlUsername, setSqlUsername] = useState('new_user')
  const [sqlEmail, setSqlEmail] = useState('user@example.com')
  const [sqlPassword, setSqlPassword] = useState('Welcome@123')
  const [sqlRole, setSqlRole] = useState<'user' | 'admin'>('user')
  const [copied, setCopied] = useState(false)

  // Fetch users when modal opens
  const fetchUsers = async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch user list')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err: any) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (opened) {
      fetchUsers()
      setCreateError(null)
      setCreateSuccess(null)
    }
  }, [opened])

  // Handle User Creation via API
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!username.trim() || !email.trim() || !password) {
      setCreateError('Username, Email, and Password are required.')
      return
    }

    if (username.length < 3) {
      setCreateError('Username must be at least 3 characters.')
      return
    }

    if (password.length < 6) {
      setCreateError('Password must be at least 6 characters.')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success(`User "${username}" created successfully!`)
      setCreateSuccess(`User "${username}" created successfully with role "${role}".`)
      setUsername('')
      setEmail('')
      setPassword('')
      setRole('user')
      fetchUsers()
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Handle User Deletion
  const handleDeleteUser = async (userToDelete: AdminUser) => {
    if (userToDelete.id === currentUser?.id) {
      toast.error('You cannot delete your own logged-in administrator account.')
      return
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${userToDelete.username}"? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete user')
      }
      toast.success(`User "${userToDelete.username}" deleted.`)
      fetchUsers()
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`)
    }
  }

  // Helper to generate a random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pass)
  }

  // Generate copyable SQL snippet
  const generatedSql = `-- ==============================================================================
-- AgentLab Manual User Creation Query
-- Run this in psql, pgAdmin, or your PostgreSQL client:
-- ==============================================================================
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    '${sqlUsername.replace(/'/g, "''").trim()}',
    '${sqlEmail.replace(/'/g, "''").trim().toLowerCase()}',
    encode(sha256('${sqlPassword.replace(/'/g, "''")}'::bytea), 'hex'),
    '${sqlRole}'
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Verification:
SELECT id, username, email, role, created_at FROM users WHERE username = '${sqlUsername.replace(/'/g, "''").trim()}';`

  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedSql)
    setCopied(true)
    toast.success('SQL query copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Flex align="center" gap="xs">
          <ScalableIcon icon={IconShieldCheck} size={22} className="text-amber-400" />
          <Box>
            <Text fw={700} size="md">
              AgentLab Admin Console
            </Text>
            <Text size="xs" c="dimmed">
              Application User Management & PostgreSQL SQL Tools
            </Text>
          </Box>
        </Flex>
      }
      size="xl"
      radius="md"
      centered
      overlayProps={{
        backgroundOpacity: 0.65,
        blur: 4,
      }}
      styles={{
        header: {
          borderBottom: '1px solid var(--chatbox-border-primary, rgba(255, 255, 255, 0.08))',
          paddingBottom: '12px',
        },
        body: {
          paddingTop: '16px',
        },
      }}
    >
      <Tabs defaultValue="users" variant="outline">
        <Tabs.List mb="md">
          <Tabs.Tab value="users" leftSection={<ScalableIcon icon={IconUsers} size={16} />}>
            Application Users ({users.length})
          </Tabs.Tab>
          <Tabs.Tab value="create" leftSection={<ScalableIcon icon={IconUserPlus} size={16} />}>
            Create User (UI)
          </Tabs.Tab>
          <Tabs.Tab value="sql" leftSection={<ScalableIcon icon={IconDatabase} size={16} />}>
            Direct SQL Generator
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1: USER LIST */}
        <Tabs.Panel value="users">
          <Stack gap="md">
            <Flex justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Registered database accounts in <Code>app_db</Code>
              </Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<ScalableIcon icon={IconRefresh} size={14} />}
                onClick={fetchUsers}
                loading={loading}
              >
                Refresh
              </Button>
            </Flex>

            {listError && (
              <Alert icon={<ScalableIcon icon={IconAlertCircle} size={16} />} title="Error" color="red">
                {listError}
              </Alert>
            )}

            {loading && users.length === 0 ? (
              <Flex justify="center" align="center" p="xl">
                <Loader size="md" />
              </Flex>
            ) : (
              <Paper withBorder radius="sm">
                <ScrollArea.Autosize mah={320}>
                  <Table striped highlightOnHover verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Username</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>Created Date</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {users.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'gray' }}>
                            No users found in database.
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        users.map((u) => {
                          const isSelf = u.id === currentUser?.id
                          return (
                            <Table.Tr key={u.id}>
                              <Table.Td>
                                <Flex align="center" gap="xs">
                                  <Text fw={600} size="sm">
                                    {u.username}
                                  </Text>
                                  {isSelf && (
                                    <Badge size="xs" variant="dot" color="green">
                                      You
                                    </Badge>
                                  )}
                                </Flex>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">
                                  {u.email}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  size="xs"
                                  color={u.role === 'admin' ? 'yellow' : 'blue'}
                                  variant="light"
                                >
                                  {u.role.toUpperCase()}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                                </Text>
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right' }}>
                                <Tooltip
                                  label={isSelf ? 'Cannot delete current account' : 'Delete user'}
                                  position="left"
                                >
                                  <ActionIcon
                                    color="red"
                                    variant="subtle"
                                    size="sm"
                                    disabled={isSelf}
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    <ScalableIcon icon={IconTrash} size={15} />
                                  </ActionIcon>
                                </Tooltip>
                              </Table.Td>
                            </Table.Tr>
                          )
                        })
                      )}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        {/* TAB 2: CREATE USER FORM (UI) */}
        <Tabs.Panel value="create">
          <Paper withBorder p="md" radius="sm">
            <form onSubmit={handleCreateUser}>
              <Stack gap="md">
                <Box>
                  <Text fw={600} size="sm">
                    Create New Application User
                  </Text>
                  <Text size="xs" c="dimmed">
                    The backend will securely hash the password (salted PBKDF2) and store it in PostgreSQL.
                  </Text>
                </Box>

                {createError && (
                  <Alert icon={<ScalableIcon icon={IconAlertCircle} size={16} />} title="Error" color="red">
                    {createError}
                  </Alert>
                )}

                {createSuccess && (
                  <Alert icon={<ScalableIcon icon={IconCheck} size={16} />} title="Success" color="green">
                    {createSuccess}
                  </Alert>
                )}

                <Flex gap="md" wrap="wrap">
                  <TextInput
                    label="Username"
                    placeholder="e.g. alex_smith"
                    required
                    style={{ flex: '1 1 200px' }}
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Email Address"
                    placeholder="e.g. alex@example.com"
                    type="email"
                    required
                    style={{ flex: '1 1 200px' }}
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                  />
                </Flex>

                <Flex gap="md" wrap="wrap" align="flex-end">
                  <PasswordInput
                    label="Password"
                    placeholder="At least 6 characters"
                    required
                    style={{ flex: '1 1 240px' }}
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<ScalableIcon icon={IconKey} size={14} />}
                    onClick={generateRandomPassword}
                    type="button"
                  >
                    Generate Strong
                  </Button>
                </Flex>

                <Select
                  label="Role"
                  description="Admin users can manage system settings, MCP configs, and other users."
                  data={[
                    { value: 'user', label: 'Standard User (user)' },
                    { value: 'admin', label: 'Administrator (admin)' },
                  ]}
                  value={role}
                  onChange={(val) => setRole((val as 'user' | 'admin') || 'user')}
                  maw={320}
                />

                <Divider my="xs" />

                <Group justify="flex-end">
                  <Button type="button" variant="default" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    type="submit"
                    color="yellow"
                    loading={creating}
                    leftSection={<ScalableIcon icon={IconUserPlus} size={16} />}
                  >
                    Create User
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Tabs.Panel>

        {/* TAB 3: DIRECT SQL GENERATOR */}
        <Tabs.Panel value="sql">
          <Stack gap="md">
            <Alert
              icon={<ScalableIcon icon={IconDatabase} size={16} />}
              title="Manual SQL Execution"
              color="blue"
            >
              If you prefer executing SQL directly in PostgreSQL (via <Code>psql</Code>, pgAdmin, or DBeaver),
              use the generator below. The AgentLab backend natively verifies PostgreSQL SHA-256 hashes and
              automatically upgrades them to PBKDF2 on first user login!
            </Alert>

            <Paper withBorder p="md" radius="sm">
              <Stack gap="sm">
                <Text fw={600} size="xs" tt="uppercase" c="dimmed">
                  Query Parameters
                </Text>
                <Flex gap="sm" wrap="wrap">
                  <TextInput
                    size="xs"
                    label="Username"
                    style={{ flex: '1 1 140px' }}
                    value={sqlUsername}
                    onChange={(e) => setSqlUsername(e.currentTarget.value)}
                  />
                  <TextInput
                    size="xs"
                    label="Email"
                    style={{ flex: '1 1 180px' }}
                    value={sqlEmail}
                    onChange={(e) => setSqlEmail(e.currentTarget.value)}
                  />
                  <TextInput
                    size="xs"
                    label="Password"
                    style={{ flex: '1 1 140px' }}
                    value={sqlPassword}
                    onChange={(e) => setSqlPassword(e.currentTarget.value)}
                  />
                  <Select
                    size="xs"
                    label="Role"
                    data={[
                      { value: 'user', label: 'user' },
                      { value: 'admin', label: 'admin' },
                    ]}
                    style={{ flex: '0 0 100px' }}
                    value={sqlRole}
                    onChange={(val) => setSqlRole((val as any) || 'user')}
                  />
                </Flex>
              </Stack>
            </Paper>

            <Box>
              <Flex justify="space-between" align="center" mb="xs">
                <Text fw={600} size="sm">
                  Ready-to-Execute PostgreSQL Query:
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  color={copied ? 'green' : 'blue'}
                  leftSection={<ScalableIcon icon={copied ? IconCheck : IconCopy} size={14} />}
                  onClick={handleCopySql}
                >
                  {copied ? 'Copied!' : 'Copy SQL'}
                </Button>
              </Flex>
              <ScrollArea.Autosize mah={220}>
                <Code block style={{ fontSize: '12px', lineHeight: 1.5 }}>
                  {generatedSql}
                </Code>
              </ScrollArea.Autosize>
            </Box>

            <Paper withBorder p="xs" radius="sm" bg="var(--chatbox-background-gray-secondary)">
              <Text size="xs" c="dimmed">
                💡 <b>Pre-configured SQL File:</b> You can also open{' '}
                <Code>scripts/create_user.sql</Code> in your SQL editor, or run CLI generator:{' '}
                <Code>node scripts/generate-user-sql.mjs &lt;username&gt; &lt;email&gt; &lt;password&gt; [role]</Code>
              </Text>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  )
}
