import { getProviderDefinition } from '../../../shared/providers'
import type {
  ModelProvider,
  ProviderBaseInfo,
  ProviderModelInfo,
  ProviderSettings,
  SessionType,
} from '../../../shared/types'
import {
  enrichModelsFromRegistry,
  getDiscoveredModels,
  getProviderModelsFromRegistry,
  getRegistry,
} from '../../packages/model-registry'
import * as remote from '../../packages/remote'
import type { ModelSettingUtil } from './interface'

export default abstract class BaseConfig implements ModelSettingUtil {
  public abstract provider: ModelProvider
  public abstract getCurrentModelDisplayName(
    model: string,
    sessionType: SessionType,
    providerSettings?: ProviderSettings,
    providerBaseInfo?: ProviderBaseInfo
  ): Promise<string>

  protected abstract listProviderModels(settings: ProviderSettings): Promise<ProviderModelInfo[]>

  private async listRemoteProviderModels(): Promise<ProviderModelInfo[]> {
    return await remote
      .getModelManifest({
        aiProvider: this.provider,
      })
      .then((res) => {
        return Array.isArray(res.models) ? res.models : []
      })
      .catch(() => {
        return []
      })
  }

  public async getMergeOptionGroups(providerSettings: ProviderSettings): Promise<ProviderModelInfo[]> {
    const definition = getProviderDefinition(this.provider)
    if (definition?.modelsDevProviderId) {
      await getRegistry()
    }

    const localOptionGroups = providerSettings.models || []
    const [remoteModels, providerApiModels] = await Promise.all([
      this.listRemoteProviderModels().catch(() => {
        return []
      }),
      this.listProviderModels(providerSettings).catch(() => {
        return []
      }),
    ])

    const safeRemoteModels = Array.isArray(remoteModels) ? remoteModels : []
    let safeProviderModels = Array.isArray(providerApiModels) ? providerApiModels : []

    let usedRegistryFallback = false
    if (safeProviderModels.length === 0 && definition?.modelsDevProviderId && definition?.curatedModelIds) {
      const registryModels = getProviderModelsFromRegistry(this.provider)
      if (registryModels.length > 0) {
        const curatedSet = new Set(definition.curatedModelIds.map((id) => id.toLowerCase()))
        safeProviderModels = registryModels.filter((m) => curatedSet.has(m.modelId.toLowerCase()))
        usedRegistryFallback = true
      }
    }

    const remoteOptionGroups = [...safeRemoteModels, ...safeProviderModels]
    const mergedModels = this.mergeOptionGroups(localOptionGroups, remoteOptionGroups)

    const enrichedModels = enrichModelsFromRegistry(mergedModels, this.provider)

    if (!usedRegistryFallback && definition?.modelsDevProviderId && definition?.curatedModelIds) {
      const existingIds = enrichedModels.map((m) => m.modelId)
      const discovered = getDiscoveredModels(this.provider, definition.curatedModelIds, existingIds)
      if (discovered.length > 0) {
        enrichedModels.push(...discovered)
      }
    }

    return enrichedModels
  }

  protected mergeOptionGroups(localOptionGroups: ProviderModelInfo[], remoteOptionGroups: ProviderModelInfo[]) {
    const localModelMap = new Map<string, ProviderModelInfo>()
    for (const model of localOptionGroups) {
      localModelMap.set(model.modelId, model)
    }

    const mergedModels: ProviderModelInfo[] = []
    const processedModelIds = new Set<string>()

    for (const model of localOptionGroups) {
      mergedModels.push(model)
      processedModelIds.add(model.modelId)
    }

    for (const remoteModel of remoteOptionGroups) {
      if (!processedModelIds.has(remoteModel.modelId)) {
        mergedModels.push(remoteModel)
        processedModelIds.add(remoteModel.modelId)
      }
    }

    return mergedModels
  }
}
