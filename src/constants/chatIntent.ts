/**
 * Lightweight keyword-based intent for the portfolio chat API.
 * Keeps small talk and general Q&A from pulling resume context into the system prompt.
 */

export type ChatIntent = 'small_talk' | 'portfolio' | 'general'

/** Signals the user is asking about Parleen’s background, work, or this site. */
const PORTFOLIO =
  /resume|intern(ship)?|batchmaster|reply\s*quick|replyquick|retell|blandai|\bsdsu\b|san diego state|graduat|graduate|graduating|gpa|\bdegree\b|university|college|\bmajor\b|school|tech\s*stack|\bskills?\b|github|linkedin|\bparleen\b|portfolio|mock interview|uber\s*clone|\bgemini\b|built\s+(at|for)|work(ed)?\s+at|where\s+(are\s+you|based|did\s+you\s+study|do\s+you\s+study)|what\s+(school|university|college)|which\s+(school|university|college)|\bcontact\b|your\s+e-?mail|e-?mail\s+(you|your|address)|how\s+(can|do)\s+i\s+reach|remote|remotely|wfh|work\s+from\s+home|\bhybrid\b|\brelo(cat|cate)|availab(le|ility)|hire|full[\s-]?stack|software\s+engineer|my\s+project|your\s+project|your\s+work|your\s+background|your\s+experience|tell\s+me\s+about\s+(yourself|your|you(\s|$))|who\s+are\s+you|what\s+do\s+you\s+do/i

function looksLikePortfolioReply(text: string | undefined): boolean {
  if (!text?.trim()) return false
  return PORTFOLIO.test(text) || /^I('m| was|’m|\s+spent|\s+built|\s+worked)/i.test(text.trim())
}

function isShortTopicFollowUp(text: string): boolean {
  const t = text.trim()
  if (t.length > 140) return false
  return /\b(explain|more|detail|elaborat|expand|continue|go deeper|why|how come|what about)\b/i.test(t)
}

function isLikelyGeneralKnowledgeQuestion(text: string): boolean {
  return /\bwhat is\b|\bwhat are\b|^define\b|\bhow does\b.+\bwork\b.*\?$/i.test(text.trim())
}

function isPureSmallTalk(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 100) return false
  if (PORTFOLIO.test(t)) return false

  const lower = t.toLowerCase()
  return (
    /^(hi|hello|hey|howdy|yo)(\s+(there|parleen|everyone))?\s*[!?.]*\s*$/i.test(t) ||
    /^(hi|hello|hey)\b[,.\s]+how\s+are\s+you\b/i.test(t) ||
    /^how\s+are\s+you(\s+doing)?\s*[!?.]*$/i.test(lower) ||
    /^what'?s\s+up\s*[!?.]*$/i.test(lower) ||
    /^good\s+(morning|afternoon|evening)\b/i.test(lower) ||
    /^(thanks?|thank\s+you|thx)\s*[!?.]*\s*$/i.test(lower) ||
    /^(ok|okay|cool|nice|great|awesome)\s*[!?.]*\s*$/i.test(lower)
  )
}

/** Human-friendly reply when the LLM is unavailable (matches small_talk intent). */
export function smallTalkFallbackResponse(): string {
  return `Hi there — how are you doing today?
I’m Parleen’s portfolio assistant, so if you’d like to dig into internships, projects, tech stack, or how to reach her, just ask.`
}

export function classifyChatIntent(
  lastUserMessage: string,
  priorAssistantMessage: string | undefined,
): ChatIntent {
  const t = lastUserMessage.trim()
  if (!t) return 'general'

  if (looksLikePortfolioReply(priorAssistantMessage) && isShortTopicFollowUp(t) && !isLikelyGeneralKnowledgeQuestion(t)) {
    return 'portfolio'
  }

  if (PORTFOLIO.test(t)) return 'portfolio'

  if (isPureSmallTalk(t)) return 'small_talk'

  return 'general'
}
