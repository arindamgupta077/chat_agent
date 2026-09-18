export function reconcileLoginLicenseState(): boolean {
  return false
}

export function initLoginLicenseStateReconciliation(): () => void {
  return () => {}
}

/**
 * License validation - unconditionally returns true since licensing has been removed.
 */
export function useAutoValidate(): boolean {
  return true
}

export async function deactivate(_clearLoginState = true): Promise<void> {
  // No-op
}

export async function activate(
  _licenseKey: string,
  _method: 'login' | 'manual' = 'manual',
  _options?: { pageName?: string }
): Promise<{ valid: boolean; instanceId?: string; error?: string }> {
  return { valid: true }
}
