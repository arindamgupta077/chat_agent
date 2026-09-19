export const InputBoxID = 'input-box-2024-02-22'

export function getInputBoxHeight(): number {
  const element = document.getElementById(InputBoxID)
  if (!element) {
    return 0
  }
  return element.clientHeight
}

export const messageInputID = 'message-input'

export const focusMessageInput = () => {
  document.getElementById(messageInputID)?.focus()
}

export const blurMessageInput = () => {
  document.getElementById(messageInputID)?.blur()
}

export function setMessageInputCursorToEnd() {
  const dom = document.getElementById(messageInputID) as HTMLTextAreaElement
  if (!dom) {
    return
  }
  dom.selectionStart = dom.selectionEnd = dom.value.length
  setTimeout(() => {
    dom.scrollTop = dom.scrollHeight
  }, 20)
}
