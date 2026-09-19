import type { ModelProvider, ProviderBaseInfo, ProviderModelInfo, ProviderSettings, SessionType } from '@shared/types'

export interface ModelSettingUtil {
  provider: ModelProvider
  getCurrentModelDisplayName(
    model: string,
    sessionType: SessionType,
    providerSettings?: ProviderSettings,
    providerBaseInfo?: ProviderBaseInfo
  ): Promise<string>
  getMergeOptionGroups(providerSettings: ProviderSettings): Promise<ProviderModelInfo[]>
}
