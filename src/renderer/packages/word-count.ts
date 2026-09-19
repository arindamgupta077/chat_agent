import { reportError } from '@/utils/sentry'
import { countWord as sharedCountWord } from '../../shared/utils/word_count'

export function countWord(data: string): number {
  try {
    return sharedCountWord(data)
  } catch (e) {
    reportError(e, {
      domain: 'token-estimation',
      operation: 'count_words',
    })
    return -1
  }
}
