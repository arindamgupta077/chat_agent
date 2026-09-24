import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
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
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconKey,
  IconLock,
  IconMail,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconShield,
  IconShieldCheck,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { type FC, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { getAuthHeaders, useAppAuthStore } from '@/stores/appAuthStore'
import { settingsStore } from '@/stores/settingsStore'

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

  // Active Tab State
  const [activeTab, setActiveTab] = useState<string | null>('users')

  // Users List State
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State for UI user creation
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // Edit User State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user')
  const [editPassword, setEditPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Global System Instruction State
  const [globalInstruction, setGlobalInstruction] = useState('')
  const [instructionLoading, setInstructionLoading] = useState(false)
  const [instructionSaving, setInstructionSaving] = useState(false)

  const fetchGlobalInstruction = async () => {
    setInstructionLoading(true)
    try {
      const res = await fetch('/api/admin/global-system-instruction', {
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (res.ok) {
        const data = await res.json()
        setGlobalInstruction(data.global_system_instruction || '')
      }
    } catch (err) {
      console.warn('[AdminModal] Failed to fetch instruction:', err)
    } finally {
      setInstructionLoading(false)
    }
  }

  const handleSaveInstruction = async () => {
    setInstructionSaving(true)
    try {
      const res = await fetch('/api/admin/global-system-instruction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          global_system_instruction: globalInstruction,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save global instruction')
      }
      settingsStore.getState().setSettings({
        globalSystemInstruction: globalInstruction,
      })
      toast.success('Global system instruction successfully updated for all users!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save global instruction')
    } finally {
      setInstructionSaving(false)
    }
  }

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
      fetchGlobalInstruction()
      setCreateError(null)
      setCreateSuccess(null)
      setEditingUser(null)
      setEditError(null)
    }
  }, [opened])

  // Helper to generate a random strong password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Handle User Creation via API
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!username.trim() || !email.trim() || !password) {
      setCreateError('Username, Email, and Password are required.')
      return
    }

    if (username.trim().length < 3) {
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

  // Open Edit User Modal
  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditRole(user.role)
    setEditPassword('')
    setEditError(null)
  }

  const handleCloseEdit = () => {
    setEditingUser(null)
    setEditPassword('')
    setEditError(null)
  }

  // Save Edit User Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setEditError(null)

    if (!editUsername.trim() || !editEmail.trim()) {
      setEditError('Username and Email are required.')
      return
    }

    if (editUsername.trim().length < 3) {
      setEditError('Username must be at least 3 characters.')
      return
    }

    if (editPassword && editPassword.length < 6) {
      setEditError('New password must be at least 6 characters.')
      return
    }

    setSavingEdit(true)
    try {
      const bodyPayload: any = {
        username: editUsername.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
      }
      if (editPassword && editPassword.trim().length > 0) {
        bodyPayload.password = editPassword
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(bodyPayload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      toast.success(`User "${editUsername}" updated successfully!`)
      setEditingUser(null)
      fetchUsers()
    } catch (err: any) {
      setEditError(err.message)
    } finally {
      setSavingEdit(false)
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

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase().trim()
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Count metrics
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users])
  const standardCount = useMemo(() => users.filter((u) => u.role === 'user').length, [users])

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Flex align="center" gap="sm">
            <Box
              p={8}
              style={{
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--mantine-color-yellow-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScalableIcon icon={IconShieldCheck} size={22} />
            </Box>
            <Box>
              <Flex align="center" gap="xs">
                <Text fw={700} size="md">
                  AgentLab Admin Console
                </Text>
                <Badge size="xs" variant="light" color="yellow">
                  Admin
                </Badge>
              </Flex>
              <Text size="xs" c="dimmed">
                Application User Management & Global Policies
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
            paddingBottom: '14px',
          },
          body: {
            paddingTop: '16px',
          },
        }}
      >
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
          <Tabs.List mb="md">
            <Tabs.Tab
              value="users"
              leftSection={<ScalableIcon icon={IconUsers} size={16} />}
              rightSection={
                <Badge size="xs" variant="filled" color="dark" circle>
                  {users.length}
                </Badge>
              }
            >
              User Directory
            </Tabs.Tab>
            <Tabs.Tab value="create" leftSection={<ScalableIcon icon={IconUserPlus} size={16} />}>
              Add User
            </Tabs.Tab>
            <Tabs.Tab value="instruction" leftSection={<ScalableIcon icon={IconShield} size={16} />}>
              Global System Instruction
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: USER DIRECTORY */}
          <Tabs.Panel value="users">
            <Stack gap="md">
              {/* Summary Metrics & Search Toolbar */}
              <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
                <Group gap="xs">
                  <Badge variant="light" color="gray" size="sm">
                    Total: {users.length}
                  </Badge>
                  <Badge variant="light" color="yellow" size="sm">
                    Admins: {adminCount}
                  </Badge>
                  <Badge variant="light" color="blue" size="sm">
                    Users: {standardCount}
                  </Badge>
                </Group>

                <Group gap="xs">
                  <TextInput
                    size="xs"
                    placeholder="Search users..."
                    leftSection={<ScalableIcon icon={IconSearch} size={13} />}
                    rightSection={
                      searchQuery ? (
                        <ActionIcon size="xs" variant="subtle" onClick={() => setSearchQuery('')}>
                          <ScalableIcon icon={IconX} size={11} />
                        </ActionIcon>
                      ) : null
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    style={{ minWidth: '180px' }}
                  />
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<ScalableIcon icon={IconRefresh} size={13} />}
                    onClick={fetchUsers}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="light"
                    color="yellow"
                    size="xs"
                    leftSection={<ScalableIcon icon={IconUserPlus} size={13} />}
                    onClick={() => setActiveTab('create')}
                  >
                    New User
                  </Button>
                </Group>
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
                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                  <ScrollArea.Autosize mah={360}>
                    <Table striped highlightOnHover verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: '30%' }}>User</Table.Th>
                          <Table.Th style={{ width: '32%' }}>Email</Table.Th>
                          <Table.Th style={{ width: '15%' }}>Role</Table.Th>
                          <Table.Th style={{ width: '13%' }}>Created</Table.Th>
                          <Table.Th style={{ width: '10%', textAlign: 'right' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredUsers.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                              <Text size="sm" c="dimmed">
                                {searchQuery ? `No users match "${searchQuery}"` : 'No users found in database.'}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelf = u.id === currentUser?.id
                            const initial = (u.username[0] || 'U').toUpperCase()

                            return (
                              <Table.Tr key={u.id}>
                                <Table.Td>
                                  <Flex align="center" gap="xs">
                                    <Avatar size="sm" radius="xl" color={u.role === 'admin' ? 'yellow' : 'blue'}>
                                      {initial}
                                    </Avatar>
                                    <Box style={{ overflow: 'hidden' }}>
                                      <Flex align="center" gap={6}>
                                        <Text fw={600} size="sm" truncate>
                                          {u.username}
                                        </Text>
                                        {isSelf && (
                                          <Badge size="xs" variant="dot" color="green">
                                            You
                                          </Badge>
                                        )}
                                      </Flex>
                                    </Box>
                                  </Flex>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="xs" c="dimmed" truncate>
                                    {u.email}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge
                                    size="xs"
                                    color={u.role === 'admin' ? 'yellow' : 'blue'}
                                    variant="light"
                                    leftSection={
                                      u.role === 'admin' ? (
                                        <ScalableIcon icon={IconShield} size={10} />
                                      ) : undefined
                                    }
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
                                  <Group gap={4} justify="flex-end" wrap="nowrap">
                                    <Tooltip label="Edit user details" position="top">
                                      <ActionIcon
                                        color="blue"
                                        variant="subtle"
                                        size="sm"
                                        onClick={() => handleOpenEdit(u)}
                                      >
                                        <ScalableIcon icon={IconPencil} size={15} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip
                                      label={isSelf ? 'Cannot delete current account' : 'Delete user'}
                                      position="top"
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
                                  </Group>
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
            <Paper withBorder p="lg" radius="md">
              <form onSubmit={handleCreateUser}>
                <Stack gap="md">
                  <Box>
                    <Text fw={600} size="sm">
                      Create New Application User
                    </Text>
                    <Text size="xs" c="dimmed">
                      Configure a new user account with role-based access. Passwords are securely hashed using salted PBKDF2.
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
                      leftSection={<ScalableIcon icon={IconUser} size={15} />}
                      required
                      style={{ flex: '1 1 200px' }}
                      value={username}
                      onChange={(e) => setUsername(e.currentTarget.value)}
                    />
                    <TextInput
                      label="Email Address"
                      placeholder="e.g. alex@example.com"
                      leftSection={<ScalableIcon icon={IconMail} size={15} />}
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
                      leftSection={<ScalableIcon icon={IconLock} size={15} />}
                      required
                      style={{ flex: '1 1 240px' }}
                      value={password}
                      onChange={(e) => setPassword(e.currentTarget.value)}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      leftSection={<ScalableIcon icon={IconKey} size={14} />}
                      onClick={() => setPassword(generateStrongPassword())}
                      type="button"
                    >
                      Generate Strong
                    </Button>
                  </Flex>

                  <Select
                    label="Role"
                    description="Administrators have full access to manage users, platform settings, and global configurations."
                    data={[
                      { value: 'user', label: 'Standard User (user)' },
                      { value: 'admin', label: 'Administrator (admin)' },
                    ]}
                    value={role}
                    onChange={(val) => setRole((val as 'user' | 'admin') || 'user')}
                    maw={340}
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

          {/* TAB 3: GLOBAL SYSTEM INSTRUCTION */}
          <Tabs.Panel value="instruction">
            <Stack gap="md">
              <Box>
                <Flex align="center" gap="xs">
                  <ScalableIcon icon={IconShieldCheck} size={20} className="text-amber-400" />
                  <Text fw={700} size="md">
                    Mandatory Global System Instruction
                  </Text>
                </Flex>
                <Text size="xs" c="dimmed" mt={4}>
                  This system instruction is centrally enforced across all AI model calls for all users on the platform.
                  Regular users cannot alter or remove this instruction.
                </Text>
              </Box>

              <Textarea
                placeholder="e.g. You are AgentLab AI Assistant. Always respond with high accuracy and professional formatting. Never execute malicious commands."
                value={globalInstruction}
                onChange={(e) => setGlobalInstruction(e.target.value)}
                autosize
                minRows={6}
                maxRows={16}
                disabled={instructionLoading}
              />

              <Flex gap="sm" align="center" wrap="wrap">
                <Button
                  color="yellow"
                  loading={instructionSaving}
                  onClick={handleSaveInstruction}
                  leftSection={<ScalableIcon icon={IconCheck} size={16} />}
                >
                  Save Global Instruction
                </Button>
                <Button
                  variant="subtle"
                  color="chatbox-gray"
                  disabled={instructionSaving || !globalInstruction}
                  onClick={() => {
                    setGlobalInstruction('')
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={fetchGlobalInstruction}
                  loading={instructionLoading}
                  leftSection={<ScalableIcon icon={IconRefresh} size={14} />}
                >
                  Reload
                </Button>
              </Flex>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>

      {/* EDIT USER SUB-MODAL */}
      <Modal
        opened={!!editingUser}
        onClose={handleCloseEdit}
        title={
          <Flex align="center" gap="xs">
            <Box
              p={6}
              style={{
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--mantine-color-blue-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScalableIcon icon={IconPencil} size={18} />
            </Box>
            <Box>
              <Text fw={700} size="sm">
                Edit User Account
              </Text>
              <Text size="xs" c="dimmed">
                Update account details for &ldquo;{editingUser?.username}&rdquo;
              </Text>
            </Box>
          </Flex>
        }
        size="md"
        radius="md"
        centered
        overlayProps={{
          backgroundOpacity: 0.65,
          blur: 4,
        }}
      >
        <form onSubmit={handleSaveEdit}>
          <Stack gap="md">
            {editError && (
              <Alert icon={<ScalableIcon icon={IconAlertCircle} size={16} />} title="Error" color="red">
                {editError}
              </Alert>
            )}

            <TextInput
              label="Username"
              placeholder="Username"
              leftSection={<ScalableIcon icon={IconUser} size={15} />}
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.currentTarget.value)}
            />

            <TextInput
              label="Email Address"
              placeholder="Email address"
              type="email"
              leftSection={<ScalableIcon icon={IconMail} size={15} />}
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.currentTarget.value)}
            />

            <Select
              label="Role"
              description={
                editingUser?.id === currentUser?.id
                  ? 'You cannot remove admin privileges from your own active session.'
                  : 'Assign administrative or standard user permissions.'
              }
              data={[
                { value: 'user', label: 'Standard User (user)' },
                { value: 'admin', label: 'Administrator (admin)' },
              ]}
              disabled={editingUser?.id === currentUser?.id}
              value={editRole}
              onChange={(val) => setEditRole((val as 'user' | 'admin') || 'user')}
            />

            <Box>
              <Flex gap="sm" align="flex-end">
                <PasswordInput
                  label="Reset Password"
                  description="Leave empty to keep existing password"
                  placeholder="Enter new password (optional)"
                  leftSection={<ScalableIcon icon={IconLock} size={15} />}
                  style={{ flex: 1 }}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.currentTarget.value)}
                />
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<ScalableIcon icon={IconKey} size={14} />}
                  onClick={() => setEditPassword(generateStrongPassword())}
                  type="button"
                >
                  Generate
                </Button>
              </Flex>
            </Box>

            <Divider my="xs" />

            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={handleCloseEdit}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="yellow"
                loading={savingEdit}
                leftSection={<ScalableIcon icon={IconCheck} size={16} />}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
