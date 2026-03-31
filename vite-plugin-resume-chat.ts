import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import {
  FEW_SHOT_BATCHMASTER_USER,
  FEW_SHOT_REPLYQUICK_USER,
  FEW_SHOT_UBER_USER,
  narrativeBatchMaster,
  narrativeReplyQuick,
  narrativeUberClone,
} from './src/constants/canonicalExperienceNarratives.ts'
import { buildRelevantResumeContextForQuery } from './src/constants/buildLlmResumeContext.ts'
import { classifyChatIntent } from './src/constants/chatIntent.ts'
import { getEducationNarrativeAnswer } from './src/constants/resumeKnowledge.ts'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function userWantsDepth(text: string): boolean {
  const n = text.toLowerCase()
  return (
    /\b(explain|elaborat|expand|in detail|more detail|dig deeper|deeper dive|walk me through|break (it |this )?down|in depth|tell me more|longer (answer|response)|go deeper|flesh out|unpack)\b/.test(
      n,
    ) || /\bmore (about|on)\b/.test(n)
  )
}

/** System instructions + query-scoped source material (built per request). */
function buildPortfolioSystemPrompt(relevantSourceMaterial: string): string {
  return `You are Parleen Kaur Bagga’s conversational portfolio assistant. You speak for her in the first person ("I", "my"). Your tone is natural, thoughtful, and professional—closer to a capable ChatGPT-style helper than to a pasted resume PDF.

## How to use the source material
The section "RELEVANT SOURCE MATERIAL" is **raw reference only**. It is not your script.
- Do **not** copy bullet symbols, do **not** mirror list formatting, and do **not** lift sentences verbatim unless a precise metric or title must stay exact.
- **Synthesize:** weave facts into clear paragraphs, connect motivation → work → tools → outcomes where it helps the user understand the story.
- Treat lines as **constraints**: you may paraphrase, summarize, and structure, but you must not add employers, dates, degrees, GPA, claims, tools, or metrics that are not supported there (or in the profile lines of that block).

## Map questions to known facts (inference)
Users won’t always use exact wording. When the intent clearly points at something in the source material, **answer from that material** instead of saying you don’t know.
- **University / college / “where do you study” / which school** → San Diego State University (**SDSU**), degree line, **graduation May 2027**, GPA if relevant (all in PROFILE or EDUCATION sections).
- **“When do you graduate?”, graduation date, “what year do you finish?”** → Answer with the **graduation month and year** from the profile (e.g. **May 2027**); you can add one short line of context (school/degree) if helpful.
- Same idea for internships, projects, remote availability, and contact: pick the **closest matching section** and synthesize a direct answer.

## Understanding the user
- Infer intent from the latest user message and the conversation so far.
- Answer the question directly; brief clarifications only when the request is empty or impossible to interpret.

## Response shape
- Prefer several short, well-paced paragraphs over a single wall of text when the topic warrants it.
- Be warm and precise; vary sentence rhythm; avoid buzzword stacking and robotic phrasing.
- When describing internships or projects, give useful detail: what you built, who it helped, how you worked (tools, constraints), and outcomes—**always grounded in the source material**.

## Few-shot reference (internships & flagship projects — target tone and depth)
When the user asks about **BatchMaster Software**, **ReplyQuick AI**, or the **Uber clone / ride-booking project** (including “tell me more”, “explain in detail”, “walk me through”, or similar), answer in **several flowing paragraphs** like the examples below: human, specific, and technology-aware—**never** a bulleted resume dump, dates-only block, or “here’s my resume section:” formatting. Facts must stay consistent with **RELEVANT SOURCE MATERIAL** for the turn; if the source conflicts, follow the source.

User: ${FEW_SHOT_BATCHMASTER_USER}

Assistant: ${narrativeBatchMaster}

User: ${FEW_SHOT_REPLYQUICK_USER}

Assistant: ${narrativeReplyQuick}

User: ${FEW_SHOT_UBER_USER}

Assistant: ${narrativeUberClone}

User: Which university did you study in?

Assistant: ${getEducationNarrativeAnswer()}

User: When do you graduate?

Assistant: ${getEducationNarrativeAnswer()}

## Follow-ups
If the user says things like "explain more", "go deeper", or "tell me in detail", continue the **same topic** as your previous reply and draw supporting detail from the source material that matches that thread.

## Remote work
When asked about working remotely, hybrid work, WFH, or relocation for a job: say clearly **yes — she is available to work remotely**, and open to hybrid / relocation where it makes sense (see profile). Give a short, human answer. **Always include her email from the profile** so they can follow up (they can tap or copy it).

## Gaps
If there is **no reasonable match** in the source material, say so plainly and point them to the email or LinkedIn line in the profile—do not invent facts. Prefer **inference from the closest section** (see “Map questions to known facts”) before treating a question as unknown.

---

RELEVANT SOURCE MATERIAL:

${relevantSourceMaterial}`
}

function buildSmallTalkSystemPrompt(): string {
  return `You are the friendly chat widget on Parleen Kaur Bagga’s portfolio site. Replies should feel human: warm, brief (about one to three short sentences), and conversational—like a quick hallway hello, not a cover letter.

You are **not** in “resume mode” here: do not dive into internships, project lists, or metrics unless the user clearly steers there next.

If it fits naturally, you can mention that you’re happy to talk about her experience, projects, or how to reach her when they’re ready.`
}

function buildGeneralSystemPrompt(): string {
  return `You are a helpful assistant embedded on Parleen Kaur Bagga’s portfolio website.

**No resume context is attached for this turn.** Answer the user’s question normally—clearly, thoughtfully, and accurately.

**About Parleen:** Do not invent employers, dates, grades, or project details. If they ask for specifics about her background, say you don’t have her profile materials in this mode and invite them to ask about her internships, projects, tech stack, education, or contact info so the site can bring in the right context—or they can use the suggestion chips on the page.

Stay concise unless they ask for depth.`
}

function lastUserAndPriorAssistant(chat: Array<{ role: string; content: string }>): {
  lastUser: string
  priorAssistant: string | undefined
} {
  const lastUser = [...chat].reverse().find((m) => m.role === 'user')?.content?.trim() ?? ''
  let priorAssistant: string | undefined
  const lastUserIndex = chat.map((m) => m.role).lastIndexOf('user')
  for (let i = lastUserIndex - 1; i >= 0; i--) {
    if (chat[i].role === 'assistant') {
      priorAssistant = chat[i].content.trim()
      break
    }
  }
  return { lastUser, priorAssistant }
}

export function resumeChatApiPlugin(apiKey: string, model: string): Plugin {
  return {
    name: 'resume-chat-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (req.method !== 'POST' || pathname !== '/api/chat') {
          next()
          return
        }

        if (!apiKey.trim()) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }))
          return
        }

        let parsed: unknown
        try {
          const raw = await readBody(req)
          parsed = raw ? JSON.parse(raw) : {}
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }

        const messages = (parsed as { messages?: unknown }).messages
        if (!Array.isArray(messages)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Expected "messages" array' }))
          return
        }

        const chatPairs: Array<{ role: string; content: string }> = []
        for (const m of messages) {
          if (typeof m !== 'object' || m === null) continue
          const role = (m as { role?: unknown }).role
          const content = (m as { content?: unknown }).content
          if (role !== 'user' && role !== 'assistant') continue
          if (typeof content !== 'string' || !content.trim()) continue
          chatPairs.push({ role, content: content.trim() })
        }

        const { lastUser, priorAssistant } = lastUserAndPriorAssistant(chatPairs)
        const intent = classifyChatIntent(lastUser, priorAssistant)

        const systemPrompt =
          intent === 'portfolio'
            ? buildPortfolioSystemPrompt(buildRelevantResumeContextForQuery(lastUser, priorAssistant))
            : intent === 'small_talk'
              ? buildSmallTalkSystemPrompt()
              : buildGeneralSystemPrompt()

        const openaiMessages: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...chatPairs,
        ]

        const deep = intent === 'portfolio' && userWantsDepth(lastUser)
        const maxTokens =
          intent === 'small_talk' ? 220 : deep ? 1200 : intent === 'general' ? 720 : 600
        const temperature = intent === 'small_talk' ? 0.78 : deep ? 0.62 : 0.72

        try {
          const r = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: openaiMessages,
              temperature,
              max_tokens: maxTokens,
            }),
          })

          const data = (await r.json()) as {
            choices?: Array<{ message?: { content?: string } }>
            error?: { message?: string }
          }

          if (!r.ok) {
            res.statusCode = r.status >= 400 && r.status < 600 ? r.status : 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: data.error?.message ?? 'OpenAI request failed' }))
            return
          }

          const text = data.choices?.[0]?.message?.content?.trim()
          if (!text) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Empty model response' }))
            return
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ reply: text }))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to reach OpenAI' }))
        }
      })
    },
  }
}
