import fs from 'node:fs'

export const glossary = {
  keepVerbatim: [
    'Chatbox',
    'AI',
    'MCP',
    'Deep Link',
    'ID',
    'API',
    'URL',
    'OCR',
    'LaTeX',
    'Token',
    'Embedding',
    'Rerank',
    'Copilot',
  ],

  translateAs: {
    ar: { Agent: 'الوكيل' },
    es: { Agent: 'Agente' },
    'it-IT': { Agent: 'Agente' },
    ja: { Agent: 'エージェント' },
    ko: { Agent: '에이전트' },
    'pt-PT': { Agent: 'Agente' },
    ru: { Agent: 'агент' },
    'zh-Hans': { Quota: '点数', Agent: '智能体', 'License Key': '许可证', License: '许可证' },
    'zh-Hant': { Quota: '點數', Agent: '智能體', 'License Key': '許可證', License: '許可證' },
  },
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const stemRe = (t) => new RegExp(`\\b${escapeRe(t)}`)

const verbatimGuardTerms = glossary.keepVerbatim.filter((t) => /^[A-Za-z][A-Za-z0-9]{4,}$/.test(t))

export function doNotTranslateLine() {
  return `Do not translate these words: ${glossary.keepVerbatim.map((t) => `"${t}"`).join(', ')}.`
}

export function translateAsRules(locale) {
  const map = glossary.translateAs[locale] || {}
  return Object.entries(map).map(([term, forced]) => `Translate "${term}" as "${forced}"`)
}

export function glossaryIssues(source, translation, locale) {
  const issues = []
  for (const [term, forced] of Object.entries(glossary.translateAs[locale] || {})) {
    const inSource = new RegExp(`\\b${escapeRe(term)}\\b`, 'i').test(source)
    if (inSource && !translation.toLowerCase().includes(forced.toLowerCase()))
      issues.push(`missing forced term ${term}=>${forced}`)
  }
  for (const t of verbatimGuardTerms) {
    if (stemRe(t).test(source) && !stemRe(t).test(translation)) issues.push(`dropped verbatim term ${t}`)
  }
  return issues
}

function protectedTokens(s) {
  return ((s || '').match(/{{[^}]+}}|<\/?[A-Za-z0-9]+>/g) || []).sort()
}

function entryIssues(source, translation, locale) {
  const issues = glossaryIssues(source, translation, locale)
  const a = protectedTokens(source)
  const b = protectedTokens(translation)
  if (a.length !== b.length || !a.every((t, i) => t === b[i])) issues.unshift('placeholder/tag mismatch')
  return issues
}

const DIR = 'src/renderer/i18n/locales'
const readLocale = (locale) => JSON.parse(fs.readFileSync(`${DIR}/${locale}/translation.json`, 'utf8'))
function localeArgs(flag) {
  const named = process.argv.slice(process.argv.indexOf(flag) + 1).filter((a) => !a.startsWith('-'))
  if (named.length) return named
  return fs.readdirSync(DIR).filter((d) => d !== 'en' && fs.existsSync(`${DIR}/${d}/translation.json`))
}

if (process.argv.includes('--fill-en')) {
  const file = `${DIR}/en/translation.json`
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  let filled = 0
  for (const k of Object.keys(json))
    if (!json[k]) {
      json[k] = k
      filled++
    }
  if (filled) fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
  console.log(`en: filled ${filled} key(s)`)
  process.exit(0)
}

if (process.argv.includes('--list-empty')) {
  for (const locale of localeArgs('--list-empty')) {
    const json = readLocale(locale)
    for (const k of Object.keys(json)) if (!json[k]) console.log(`${locale}\t${k}`)
  }
  process.exit(0)
}

if (process.argv.includes('--check')) {
  const en = readLocale('en')
  const source = (k) => en[k] || k
  let total = 0
  for (const locale of localeArgs('--check')) {
    const json = readLocale(locale)
    let empty = 0
    const problems = []
    for (const k of Object.keys(json)) {
      if (!json[k]) {
        empty++
        continue
      }
      const issues = entryIssues(source(k), json[k], locale)
      if (issues.length) problems.push({ k, issues })
    }
    total += problems.length
    const emptyNote = empty ? `, ${empty} empty` : ''
    if (problems.length) {
      console.log(`✗ ${locale}: ${problems.length} violation(s)${emptyNote}`)
      for (const { k, issues } of problems) console.log(`    ${JSON.stringify(k.slice(0, 60))}: ${issues.join('; ')}`)
    } else {
      console.log(`✓ ${locale}: clean${emptyNote}`)
    }
  }
  process.exit(total ? 1 : 0)
}

if (process.argv.includes('--selftest')) {
  const assert = await import('node:assert/strict').then((m) => m.default)

  assert.ok(doNotTranslateLine().includes('"Chatbox"'), 'verbatim line lists Chatbox')
  assert.ok(translateAsRules('zh-Hans').includes('Translate "Quota" as "点数"'), 'zh-Hans Quota rule')
  assert.deepEqual(translateAsRules('en'), [], 'no rules for en')

  assert.ok(glossaryIssues('You have Quota left', '你还有额度', 'zh-Hans').some((s) => s.includes('Quota')), 'forced miss')
  assert.equal(glossaryIssues('You have Quota left', '你还有点数', 'zh-Hans').length, 0, 'forced ok')

  assert.ok(glossaryIssues('Open Chatbox now', '立即打开聊天框', 'ja').some((s) => s.includes('Chatbox')), 'verbatim drop')
  assert.equal(glossaryIssues('Open Chatbox now', '立即打开 Chatbox', 'ja').length, 0, 'verbatim ok')
  assert.equal(glossaryIssues('Use AI here', '在这里使用人工智能', 'ja').length, 0, 'short term not guarded')

  assert.equal(glossaryIssues('Max Output Tokens', '最大出力Token数', 'ja').length, 0, 'plural->singular ok')
  assert.equal(glossaryIssues('Estimated Token Usage', 'Estimation des Tokens', 'fr').length, 0, 'singular->plural ok')
  assert.ok(glossaryIssues('Default Rerank Model', '默认重排模型', 'zh-Hans').some((s) => s.includes('Rerank')), 'rerank dropped')

  assert.equal(glossaryIssues('Agent Mode', 'usa modo agente', 'es').length, 0, 'forced term case-insensitive')

  assert.ok(
    glossaryIssues('check your license key', '检查您的 license key', 'zh-Hans').some((s) => s.includes('License Key')),
    'license key forced (lowercase source)'
  )
  assert.equal(glossaryIssues('check your license key', '检查您的许可证', 'zh-Hans').length, 0, 'license key ok')
  assert.ok(glossaryIssues('Agent Mode', '使用代理模式', 'zh-Hant').some((s) => s.includes('Agent')), 'zh-Hant Agent forced')
  assert.equal(glossaryIssues('Agent Mode', 'Agenten-Modus', 'de').length, 0, 'de Agent not forced')

  assert.equal(entryIssues('Hi {{name}}', '你好 {{name}}', 'zh-Hans').length, 0, 'entry ok')
  assert.ok(entryIssues('Hi {{name}}', '你好', 'zh-Hans').some((s) => s.includes('placeholder')), 'entry dropped placeholder')
  assert.ok(entryIssues('Use <0>License</0>', '使用 <0>授权</0>', 'zh-Hans').some((s) => s.includes('License')), 'entry glossary')

  console.log('i18n-glossary selftest OK')
  process.exit(0)
}
