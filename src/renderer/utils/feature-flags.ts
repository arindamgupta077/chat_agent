import platform from '@/platform'

export const featureFlags = {
  mcp: platform.isDesktopLike || platform.type === 'web',
  knowledgeBase: platform.isDesktopLike,
  skills: platform.isDesktopLike,
  agentMode: platform.isDesktopLike,
}
