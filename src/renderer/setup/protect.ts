import platform from '../platform'
import { CHATBOX_BUILD_TARGET } from '../variables'

switch (CHATBOX_BUILD_TARGET) {
  case 'mobile_app':
    break
  case 'unknown':
    if (platform.type === 'web') {
    }
    break
}

function protect() {
  setInterval(() => {
    if (Math.random() < 0.1) {
      const hostname = window.location.hostname
      if (hostname !== simpleDecrypt(lh) && !hostname.endsWith(simpleDecrypt(ca))) {
        setTimeout(toHomePage, 300)
      }
    }
  }, 1400)
}

function toHomePage() {
  const l = simpleDecrypt(ll)
  const h = simpleDecrypt(hh)
  ;(window as any)[l][h] = simpleDecrypt(hf)
}

const lh = '^_QR]]YAB' // localhost
const ca = 'QXSGSZNS_\x19UGB' // chatboxai.app
const hf = 'ZDFCB\x0F\x19\x1DU_UCP_JRX\x1BWBF\x18' // https://chatboxai.app/

const ll = '^_QRE\\Y\\' // location
const hh = 'ZBWU' // href

function simpleEncrypt(text: string): string {
  const key = '202315626747'
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(c)
  }
  return result
}

function simpleDecrypt(text: string): string {
  return simpleEncrypt(text)
}
