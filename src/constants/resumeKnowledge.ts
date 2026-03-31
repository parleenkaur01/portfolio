import { narrativeBatchMaster, narrativeReplyQuick, narrativeUberClone } from './canonicalExperienceNarratives'
import { classifyChatIntent, smallTalkFallbackResponse } from './chatIntent'
import { contactInfo } from './contactInfo'
import { experienceEntries } from './experience'
import { projectRepoUrls } from './projectLinks'

/** Mirrors resume “Technical Strengths” + tools called out in work & projects. */
export const resumeTechnicalStrengths = {
  languagesAndDatabases:
    'Python, Java, JavaScript, TypeScript, MongoDB, MySQL, PostgreSQL, Firebase',
  web: 'HTML5, CSS3, RESTful APIs, FastAPI, WebSocket',
  frameworks: 'React.js, Node.js, Next.js, Express.js, Matplotlib, NumPy, Pandas',
  tools: 'Docker, Git, Postman, Vercel, Cursor, AWS',
  workAndProjectsExtra:
    'Supabase, RetellAI, Twilio, BlandAI, Redis, Figma, Socket.IO, JWT, Google Gemini, Shadcn UI, TailwindCSS, PyTorch, Scikit-learn, Azure, MLflow, TensorFlow, SQL',
} as const

export const resumeFacts = {
  name: 'Parleen Kaur Bagga',
  location: 'San Diego, CA',
  school: 'San Diego State University',
  degree: 'Bachelor of Science in Computer Science',
  graduation: 'May 2027',
  gpa: '3.8/4.0',
  contact: contactInfo,
  experience: experienceEntries,
  projects: [
    {
      name: 'AI-Powered Mock Interview Platform',
      dates: 'Jan 2026 — Feb 2026',
      bullets: [
        'Developed a full-stack AI Mock Interview Web App with AI-generated feedback using Google Gemini.',
        'Architected Gemini API workflows (~500ms avg response) and built a React (TypeScript) frontend with Firebase integration, cutting page load time by 30% and enabling secure progress tracking.',
      ],
      technologies: ['React (TypeScript)', 'Firebase', 'REST APIs', 'Shadcn UI', 'TailwindCSS', 'Google Gemini'],
      repoUrl: projectRepoUrls.mockInterview,
    },
    {
      name: 'Uber Clone Project',
      dates: 'Nov 2025 — Dec 2025',
      bullets: [
        'Built a full-stack Uber-style ride-booking app with real-time matching, OTP verification, and fare estimates.',
        'Designed REST APIs using Node.js, Express, MongoDB, and JWT (with token blacklisting) and integrated Socket.IO for live ride requests, driver tracking, and real-time status updates.',
      ],
      technologies: ['React', 'Node.js', 'Express.js', 'MongoDB', 'Socket.IO', 'JWT', 'REST APIs'],
      repoUrl: projectRepoUrls.uberClone,
    },
  ],
} as const

/** Shared copy for school / university questions (offline answers + LLM few-shot via vite). */
export function getEducationNarrativeAnswer(): string {
  return `I study at San Diego State University—SDSU—for my ${resumeFacts.degree}. I’m on track to graduate in ${resumeFacts.graduation}, and my GPA is ${resumeFacts.gpa}.`
}

const chunks: Array<{ id: string; title: string; text: string }> = [
  {
    id: 'contact',
    title: 'Contact',
    text: `Email: ${contactInfo.email}\nPhone: ${contactInfo.phoneDisplay}\nGitHub: ${contactInfo.githubUrl}\nLinkedIn: ${contactInfo.linkedInUrl}`,
  },
  {
    id: 'education',
    title: 'Education',
    text: `${resumeFacts.school}\n${resumeFacts.degree}\nAnticipated Graduation: ${resumeFacts.graduation}\nGPA: ${resumeFacts.gpa}`,
  },
  ...experienceEntries.map((e) => ({
    id: `exp-${e.id}`,
    title: `${e.company} — ${e.role}`,
    text: `${e.dateRange}\n${e.bullets.join('\n')}\nTechnology used: ${e.technologies.join(', ')}`,
  })),
  ...resumeFacts.projects.map((p) => ({
    id: `proj-${p.name}`,
    title: `${p.name}`,
    text: `${p.dates}\n${p.bullets.join('\n')}\nTechnology used: ${p.technologies.join(', ')}\nRepo: ${p.repoUrl}`,
  })),
]

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreChunk(query: string, chunkText: string) {
  const q = normalize(query)
  if (!q) return 0
  const qt = new Set(q.split(' ').filter(Boolean))
  const ct = normalize(chunkText).split(' ')
  let score = 0
  for (const w of ct) {
    if (qt.has(w)) score += 1
  }
  // small boost if chunk contains the full query phrase
  if (normalize(chunkText).includes(q)) score += 8
  return score
}

/** Chat turns for follow-up detection (matches PortfolioShell roles). */
export type ResumeChatTurn = { role: 'user' | 'bot'; text: string }

function isElaborationQuery(qn: string): boolean {
  return (
    /\b(explain|elaborat|expand|in detail|more detail|dig deeper|walk me through|in depth|tell me more|go deeper|unpack|flesh out|deeper dive)\b/.test(
      qn,
    ) || /\bmore (about|on)\b/.test(qn)
  )
}

type InferredTopic = 'batchmaster' | 'replyquick' | 'uber' | 'mock' | 'education' | 'tech' | null

function inferTopicFromAssistantText(text: string): InferredTopic {
  const t = normalize(text)
  if (t.includes('batchmaster') || t.includes('production insights') || t.includes('plant manager')) {
    return 'batchmaster'
  }
  if (t.includes('formulation') || (t.includes('traceability') && t.includes('erp'))) {
    return 'batchmaster'
  }
  if (t.includes('replyquick') || t.includes('reply quick') || t.includes('retell') || t.includes('bland') || t.includes('twilio')) {
    return 'replyquick'
  }
  if (/\buber\b/i.test(text) && /clone|ride|booking|socket|driver|passenger|project/i.test(text)) {
    return 'uber'
  }
  if (t.includes('mock interview') || t.includes('gemini') || t.includes('firebase')) {
    return 'mock'
  }
  if (
    t.includes('gpa') ||
    t.includes('graduation') ||
    /\bgraduate\b/.test(text.toLowerCase()) ||
    t.includes('sdsu') ||
    t.includes('degree') ||
    t.includes('university') ||
    t.includes('college') ||
    (t.includes('school') && (t.includes('san diego') || t.includes('state')))
  ) {
    return 'education'
  }
  if (t.includes('tech stack') || /\bskills\b/.test(t) || t.includes('languages and database')) {
    return 'tech'
  }
  return null
}

function formatDetailedProject(p: (typeof resumeFacts.projects)[number]): string {
  return `Here’s more detail on ${p.name} (${p.dates}):\n\n${p.bullets.map((b) => `• ${b}`).join('\n')}\n\nStack: ${p.technologies.join(', ')}.\nRepo: ${p.repoUrl}`
}

function humanTechStackAnswer(): string {
  const { languagesAndDatabases, web, frameworks, tools, workAndProjectsExtra } = resumeTechnicalStrengths
  return `I’d describe my stack as full-stack web first: ${frameworks}, with ${web} for how I build and connect services.\n\nLanguages and databases on my resume are ${languagesAndDatabases}. In internships I’ve also worked heavily with TypeScript, Supabase, PostgreSQL, and Vercel at ReplyQuick AI, and with React, Node, Express, MySQL, Redis, and Figma at BatchMaster — plus OAuth integrations with accounting platforms.\n\nDay-to-day shipping is usually ${tools}. On projects I’ve pulled in Socket.IO, JWT, Google Gemini, Firebase, Shadcn UI, and TailwindCSS, and I’ve also used tools like ${workAndProjectsExtra} for data / ML work that shows up on my resume.`
}

/** Plaintext digest for LLM system prompts (Vite dev server / future API). */
export function getResumeContextForLLM(): string {
  const tech = resumeTechnicalStrengths
  const techLine = `Languages/DB: ${tech.languagesAndDatabases}. Web: ${tech.web}. Frameworks: ${tech.frameworks}. Tools: ${tech.tools}. Also: ${tech.workAndProjectsExtra}.`
  const expText = experienceEntries
    .map(
      (e) =>
        `${e.company} (${e.role}) ${e.dateRange}:\n${e.bullets.map((b) => `  - ${b}`).join('\n')}\n  Tech: ${e.technologies.join(', ')}`,
    )
    .join('\n\n')
  const projText = resumeFacts.projects
    .map(
      (p) =>
        `${p.name} (${p.dates}):\n${p.bullets.map((b) => `  - ${b}`).join('\n')}\n  Tech: ${p.technologies.join(', ')}`,
    )
    .join('\n\n')
  return [
    `Name: ${resumeFacts.name}`,
    `Location: ${resumeFacts.location} — open to relocation; available to work remotely.`,
    `Education: ${resumeFacts.degree}, ${resumeFacts.school}, graduation ${resumeFacts.graduation}, GPA ${resumeFacts.gpa}`,
    `Contact: email ${contactInfo.email}, phone ${contactInfo.phoneDisplay}, GitHub ${contactInfo.githubUrl}, LinkedIn ${contactInfo.linkedInUrl}`,
    `Technical: ${techLine}`,
    `Experience:\n${expText}`,
    `Projects:\n${projText}`,
  ].join('\n\n')
}

export function answerFromResume(query: string, conversation: readonly ResumeChatTurn[] = []): string {
  const q = query.trim()
  if (!q) return 'Ask me anything about my resume (experience, projects, skills, or contact).'

  const qn = normalize(q)

  const lastBot = [...conversation].reverse().find((m) => m.role === 'bot')
  const priorAssistantText = lastBot?.text
  const intent = classifyChatIntent(q, priorAssistantText)
  if (intent === 'small_talk') {
    if (/^(thanks?|thank\s+you|thx)\b/i.test(q.trim())) {
      return `You’re welcome! Happy to chat more about Parleen’s experience or projects whenever you like.`
    }
    return smallTalkFallbackResponse()
  }

  // Remote / hybrid / relocation for work — before ``general`` so offline mode never misroutes.
  if (
    /(work remotely|remote work|remotely|available.*remote|remote.*available|open to remote|fully remote|100% remote|remote role|remote position|remote ok|hybrid ok|hybrid role)/.test(qn) ||
    (/(remote|remotely|wfh|work from home|hybrid)/.test(qn) &&
      /(available|open|hire|opportunity|consider|willing)/.test(qn))
  ) {
    return `Yes — I’m available to work remotely. I’m also open to hybrid setups and relocation for the right role.\n\n${contactInfo.email}`
  }

  if (intent === 'general') {
    return `Happy to help with general questions.\n\nI don’t have the full AI reply loaded in this offline mode, but if you ask about Parleen’s internships, projects, tech stack, school, or contact info, I can pull answers straight from her resume for you.`
  }

  if (lastBot && isElaborationQuery(qn)) {
    if (/\buber\b/i.test(q) && /clone|ride|booking|project|socket|more|detail|about/i.test(q)) {
      return narrativeUberClone
    }
    const topic = inferTopicFromAssistantText(lastBot.text)
    if (topic === 'batchmaster') {
      return narrativeBatchMaster
    }
    if (topic === 'replyquick') {
      return narrativeReplyQuick
    }
    if (topic === 'uber') {
      return narrativeUberClone
    }
    if (topic === 'mock') {
      const p = resumeFacts.projects.find((x) => /mock|interview/i.test(x.name))
      if (p) return formatDetailedProject(p)
    }
    if (topic === 'education') {
      return getEducationNarrativeAnswer()
    }
    if (topic === 'tech') {
      return humanTechStackAnswer()
    }

    const augmented = `${lastBot.text} ${q}`
    const rankedAug = chunks
      .map((c) => ({ c, s: scoreChunk(augmented, `${c.title}\n${c.text}`) }))
      .sort((a, b) => b.s - a.s)
    if (rankedAug.length && rankedAug[0].s >= 3) {
      const c = rankedAug[0].c
      if (c.id.startsWith('proj-') && /\buber\b/i.test(c.title)) {
        return narrativeUberClone
      }
      if (c.id === 'education') {
        return getEducationNarrativeAnswer()
      }
      return `Here’s a more detailed look from my resume on ${c.title}:\n\n${c.text}`
    }
  }

  if (/(tech stack|technology stack|technologies|what tech|your stack|skills|languages and|programming languages|what languages|tools do you|devtools)/.test(qn)) {
    return humanTechStackAnswer()
  }
  if (/(where are you based|where are you located|location|based)/.test(qn)) {
    return `I’m currently based in ${resumeFacts.location}, and I’m open to relocation for the right opportunity. I’m also available for remote collaboration, and the fastest way to reach me is ${contactInfo.email}.`
  }
  if (/(availability|available|how can i reach|best way to reach|contact)/.test(qn)) {
    return `The best way to reach me is email (${contactInfo.email}). I also check LinkedIn regularly (${contactInfo.linkedInUrl}) and I’m open to remote collaboration.`
  }
  if (/(email|gmail)/.test(qn)) {
    return `You can reach me at ${contactInfo.email}.`
  }
  if (/(phone|call|number)/.test(qn)) {
    return `You can call me at ${contactInfo.phoneDisplay}.`
  }
  if (/(linkedin)/.test(qn)) {
    return `You can find me on LinkedIn here: ${contactInfo.linkedInUrl}`
  }
  if (/(github|repo)/.test(qn)) {
    return `You can check my GitHub at ${contactInfo.githubUrl}. If you want specific repos, I can also share links for Uber Clone, AI Code Reviewer, and Fraud Detection.`
  }
  if (/(replyquick|reply\s+quick)/.test(qn)) {
    return narrativeReplyQuick
  }
  if (/(batchmaster)/.test(qn)) {
    return narrativeBatchMaster
  }
  if (/\buber\b/.test(qn)) {
    return narrativeUberClone
  }
  if (/(mock interview|ai code reviewer|gemini)/.test(qn)) {
    return `I built an AI-powered interview practice platform with React (TypeScript) and Firebase, using Gemini-based feedback flows to deliver fast responses and a cleaner candidate learning loop.`
  }
  if (
    /(education|gpa|university|college|graduation|\bgraduate\b|\bgraduating\b|\bgraduates\b|stud(y|ying|ied)|\bmajor\b|coursework|campus|\bsdsu\b)/.test(
      qn,
    ) ||
    /where.*(study|studied|school)|which.*(university|college|school)|what.*(university|college)/.test(qn) ||
    /\bwhen\b.*(\bgraduat|finish(ing)?\s+school|done\s+with\s+school|\bdegree\b)/.test(qn)
  ) {
    return getEducationNarrativeAnswer()
  }

  const ranked = chunks
    .map((c) => ({ c, s: scoreChunk(q, `${c.title}\n${c.text}`) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  if (!ranked.length || ranked[0].s < 3) {
    return `Great question. I don’t have a direct answer for that from my resume data yet, but I can help with my experience at ReplyQuick AI / BatchMaster, my projects, tech stack, education, or contact details.`
  }

  const top = ranked.filter((r) => r.s >= Math.max(3, ranked[0].s - 3))
  const summary = top
    .map((r) => `${r.c.title}: ${r.c.text.split('\n').slice(0, 2).join(' ')}`)
    .join(' ')

  return `From my resume, here’s the most relevant context: ${summary}`
}

