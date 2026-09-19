import { SafeArea } from 'capacitor-plugin-safe-area'
import { Keyboard } from '@capacitor/keyboard'

SafeArea.getSafeAreaInsets().then(({ insets }) => {
  for (const [key, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(`--mobile-safe-area-inset-${key}`, `${value}px`)
  }
})

SafeArea.getStatusBarHeight().then(({ statusBarHeight }) => {
  // console.log(statusBarHeight, 'statusbarHeight');
})
;(async () => {
  // when safe-area changed
  const eventListener = await SafeArea.addListener('safeAreaChanged', (data) => {
    const { insets } = data
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(`--mobile-safe-area-inset-${key}`, `${value}px`)
    }
  })
  // eventListener.remove();
})()

Keyboard.addListener('keyboardWillShow', async (info) => {
  document.documentElement.style.setProperty(`--mobile-safe-area-inset-bottom`, `0px`)
})

Keyboard.addListener('keyboardWillHide', () => {
  SafeArea.getSafeAreaInsets().then(({ insets }) => {
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(`--mobile-safe-area-inset-${key}`, `${value}px`)
    }
  })
})
