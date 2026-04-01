import { contactInfo } from './contactInfo'
import { experienceEntries, type ExperienceEntry } from './experience'
import { resumeFacts, resumeTechnicalStrengths } from './resumeKnowledge'

/**
 * Builds a compact, query-scoped context bundle for the LLM.
 * The model should treat this as source material, not as copy-paste output.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'you',
  'your',
  'can',
  'how',
  'what',
  'why',
  'when',
  'tell',
  'about',
  'more',
  'some',
  'are',
  'was',
  'with',
  'that',
  'this',
  'from',
  'have',
  'does',
  'did',
  'would',
  'could',
  'please',
  'just',
  'like',
])

function scoreQueryAgainstCorpus(query: string, corpus: string): number {
  const q = normalize(query)
  if (!q) return 0
  const tokens = q.split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w))
  if (tokens.length === 0) return 0
  const qt = new Set(tokens)
  const ct = normalize(corpus)
  let score = 0
  for (const w of ct.split(' ')) {
    if (qt.has(w)) score += 1
  }
  if (ct.includes(q)) score += 8
  return score
}

function formatProfileAnchor(): string {
  return [
    'PROFILE (verified facts)',
    `${resumeFacts.name} — ${resumeFacts.location}`,
    `Education: ${resumeFacts.degree}, ${resumeFacts.school}; GPA ${resumeFacts.gpa}; graduation ${resumeFacts.graduation}`,
    'Work arrangement: open to relocation; available to work remotely.',
    `Contact: ${contactInfo.email} · LinkedIn ${contactInfo.linkedInUrl} · GitHub ${contactInfo.githubUrl} · ${contactInfo.phoneDisplay}`,
  ].join('\n')
}

function formatTechLandscape(): string {
  const t = resumeTechnicalStrengths
  return [
    'TECHNICAL LANDSCAPE (synthesize when discussing stack, tools, or skills)',
    `Languages & data stores: ${t.languagesAndDatabases}`,
    `Web & APIs: ${t.web}`,
    `Frameworks & libraries: ${t.frameworks}`,
    `Engineering tooling: ${t.tools}`,
    `Also used on projects / coursework: ${t.workAndProjectsExtra}`,
  ].join('\n')
}

function formatEducationBlock(): string {
  return [
    'EDUCATION (verified facts)',
    `${resumeFacts.school} (SDSU) — ${resumeFacts.degree}`,
    `Graduation: ${resumeFacts.graduation} · GPA: ${resumeFacts.gpa}`,
  ].join('\n')
}

function formatExperienceForLlmContext(e: ExperienceEntry): string {
  return [
    `EXPERIENCE — ${e.role} @ ${e.company} (${e.dateRange})`,
    'What happened (raw facts — do not quote as a bullet list in your reply):',
    ...e.bullets.map((b) => `  · ${b}`),
    `Technologies tagged on resume: ${e.technologies.join(', ')}`,
  ].join('\n')
}

function formatProjectForLlmContext(p: (typeof resumeFacts.projects)[number]): string {
  return [
    `PROJECT — ${p.name} (${p.dates})`,
    'What shipped (raw facts — synthesize into narrative):',
    ...p.bullets.map((b) => `  · ${b}`),
    `Stack: ${p.technologies.join(', ')}`,
    `Link: ${p.repoUrl}`,
  ].join('\n')
}

type ScoredBlock = { score: number; body: string }

/**
 * Selects the resume sections most likely relevant to the latest user turn.
 * `priorAssistantMessage` helps vague follow-ups (“say more”) inherit topic.
 */
export function buildRelevantResumeContextForQuery(
  lastUserMessage: string,
  priorAssistantMessage?: string,
): string {
  const trimmedUser = lastUserMessage.trim()
  const isShortFollowUp =
    trimmedUser.length < 72 &&
    /\b(explain|detail|elaborat|expand|more|deeper|tell|continue|what else|go on)\b/i.test(trimmedUser)

  const routing = (
    isShortFollowUp && priorAssistantMessage?.trim()
      ? `${priorAssistantMessage}\n${trimmedUser}`
      : trimmedUser
  ).trim()

  const blocks: ScoredBlock[] = []

  const techMatch = formatTechLandscape()
  blocks.push({
    score: scoreQueryAgainstCorpus(routing, `skills tech stack languages framework tools ${techMatch}`),
    body: techMatch,
  })

  blocks.push({
    score: scoreQueryAgainstCorpus(
      routing,
      `education university college school study campus sdsu degree gpa graduation graduate graduating when ${resumeFacts.school}`,
    ),
    body: formatEducationBlock(),
  })

  for (const e of experienceEntries) {
    const body = formatExperienceForLlmContext(e)
    const corpus = `${e.company} ${e.role} ${e.bullets.join(' ')} ${e.technologies.join(' ')}`
    blocks.push({ score: scoreQueryAgainstCorpus(routing, corpus), body })
  }

  for (const p of resumeFacts.projects) {
    const body = formatProjectForLlmContext(p)
    const corpus = `${p.name} ${p.bullets.join(' ')} ${p.technologies.join(' ')}`
    blocks.push({ score: scoreQueryAgainstCorpus(routing, corpus), body })
  }

  blocks.sort((a, b) => b.score - a.score)
  const best = blocks[0]?.score ?? 0

  // Keep top matches; widen slightly when the best score is weak so the model still has hooks.
  const cutoff = best >= 4 ? Math.max(2, best - 2) : best >= 2 ? Math.max(1, best - 1) : 0
  let selected = blocks.filter((b) => b.score >= cutoff && b.score > 0).slice(0, 4)

  if (selected.length === 0) {
    selected = blocks.slice(0, 2)
  }

  // De-dupe bodies while preserving order
  const seen = new Set<string>()
  const bodies: string[] = []
  for (const s of selected) {
    if (seen.has(s.body)) continue
    seen.add(s.body)
    bodies.push(s.body)
  }

  const parts = [
    formatProfileAnchor(),
    '',
    '---',
    'SECTIONS MOST RELEVANT TO THIS QUESTION (use only what applies; still do not invent beyond this):',
    '',
    ...bodies.map((b) => `${b}\n`),
  ]

  return parts.join('\n').trim()
}
