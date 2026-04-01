import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './PortfolioShell.css'
import logoBatchMaster from '../../assets/logo-batchmaster.svg'
import logoReplyQuick from '../../assets/logo-replyquick.png'
import portraitParleen from '../../assets/parleen-portrait.png'
import mockInterviewHero from '../../assets/project-mock-interview-ai.png'
import { contactGmailComposeUrl, contactInfo, resumePdfUrl } from '../../constants/contactInfo'
import { answerFromResume } from '../../constants/resumeKnowledge'
import { experienceEntries } from '../../constants/experience'
import { projectRepoUrls } from '../../constants/projectLinks'
import { techStack } from '../../constants/techStack'

const SECTION_SCROLL_GAP_PX = 16

function getHeaderScrollOffsetPx(): number {
  const el = document.querySelector<HTMLElement>('.portfolio-shell__header')
  return (el?.getBoundingClientRect().height ?? el?.offsetHeight ?? 72) + SECTION_SCROLL_GAP_PX
}

function scrollToSectionId(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - getHeaderScrollOffsetPx()
  window.scrollTo({ top: Math.max(0, top), behavior })
}

type ChatMessage = { id: string; role: 'user' | 'bot'; text: string }

/** Turn bare emails / http(s) URLs in a line into clickable links (mailto opens the user’s email app). */
function renderChatLineWithLinks(line: string, keyPrefix: string): ReactNode {
  const re = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"']|[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,})/gi
  const matches = [...line.matchAll(re)]
  if (matches.length === 0) return line

  const nodes: React.ReactNode[] = []
  let last = 0
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const start = m.index ?? 0
    const token = m[0]
    if (start > last) {
      nodes.push(line.slice(last, start))
    }
    const isMail = token.includes('@') && !/^https?:/i.test(token)
    nodes.push(
      <a
        key={`${keyPrefix}-a${i}`}
        href={isMail ? `mailto:${token}` : token}
        className="portfolio-shell__chat-inline-link"
        {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {token}
      </a>,
    )
    last = start + token.length
  }
  if (last < line.length) {
    nodes.push(line.slice(last))
  }
  return <>{nodes}</>
}

function ExperienceLogo({ variant }: { variant: 'replyquick' | 'batchmaster' }) {
  const src = variant === 'replyquick' ? logoReplyQuick : logoBatchMaster
  return (
    <span className="portfolio-shell__exp-logo-frame" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="portfolio-shell__exp-logo-img"
        width={72}
        height={72}
        decoding="async"
      />
    </span>
  )
}

export function PortfolioShell() {
  const suggestedPrompts = useMemo(
    () => [
      'Tell me about your ReplyQuick AI internship.',
      'What did you build at BatchMaster Software?',
      'Are you available to work remotely?',
      'What is your tech stack?',
      'Share your GitHub links.',
      'What is your graduation date and GPA?',
    ],
    [],
  )

  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm0',
      role: 'bot',
      text: `Hi! I’m Parleen’s resume assistant.\nAsk me anything about experience, projects, skills, or contact info.`,
    },
  ])

  const listRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<ChatMessage[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const scrollChatToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
    })
  }, [])

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleSectionNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault()
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'
      scrollToSectionId(sectionId, behavior)
      window.history.replaceState(null, '', `#${sectionId}`)
    },
    [prefersReducedMotion],
  )

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash || !document.getElementById(hash)) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const run = () => scrollToSectionId(hash, reduced ? 'auto' : 'auto')
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [])

  function appendMessage(role: 'user' | 'bot', text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }])
    scrollChatToBottom()
  }

  const sendToModel = useCallback(
    async (thread: ChatMessage[], q: string) => {
      setChatLoading(true)
      try {
        const apiMessages = thread.map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }))
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })
        const data = (await res.json()) as { reply?: string; error?: string }
        if (!res.ok || !data.reply?.trim()) {
          throw new Error(data.error ?? 'Chat request failed')
        }
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'bot', text: data.reply!.trim() }])
      } catch {
        const turns = thread.map((m) => ({ role: m.role, text: m.text }))
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'bot', text: answerFromResume(q, turns) },
        ])
      } finally {
        setChatLoading(false)
        scrollChatToBottom()
      }
    },
    [scrollChatToBottom],
  )

  function handleSend(text: string) {
    const q = text.trim()
    if (!q || chatLoading) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: q }
    const nextThread = [...messagesRef.current, userMsg]
    setMessages(nextThread)
    void sendToModel(nextThread, q)
    scrollChatToBottom()
  }
  return (
    <div className="portfolio-shell">
      <div className="portfolio-shell__bg" aria-hidden="true">
        <span className="portfolio-shell__glow portfolio-shell__glow--one" />
        <span className="portfolio-shell__glow portfolio-shell__glow--two" />
        <span className="portfolio-shell__glow portfolio-shell__glow--three" />
      </div>

      <header className="portfolio-shell__header">
        <div className="portfolio-shell__header-inner">
          <div className="portfolio-shell__brand">
            <span className="portfolio-shell__mark" aria-hidden="true">
              P
            </span>
            <div>
              <p className="portfolio-shell__brand-name">Parleen Bagga</p>
              <p className="portfolio-shell__brand-role">Software Developer</p>
            </div>
          </div>

          <nav className="portfolio-shell__nav-wrap" aria-label="Main navigation">
            <ul className="portfolio-shell__nav">
              <li>
                <a href="#about" onClick={(e) => handleSectionNavClick(e, 'about')}>
                  About
                </a>
              </li>
              <li>
                <a href="#projects" onClick={(e) => handleSectionNavClick(e, 'projects')}>
                  Projects
                </a>
              </li>
              <li>
                <a href="#experience" onClick={(e) => handleSectionNavClick(e, 'experience')}>
                  Experience
                </a>
              </li>
            </ul>
          </nav>

          <a
            className="portfolio-shell__header-cta"
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              handleSectionNavClick(e, 'contact')
            }}
          >
            Let&apos;s Connect
          </a>
        </div>
      </header>

      <main className="portfolio-shell__main" aria-label="Portfolio content">
        <section className="portfolio-shell__intro" id="about">
          <div className="portfolio-shell__intro-inner">
            <div className="portfolio-shell__intro-photo-wrap">
              <div className="portfolio-shell__intro-photo-clip">
                <img
                  src={portraitParleen}
                  alt="Parleen Bagga"
                  className="portfolio-shell__intro-photo"
                  width={440}
                  height={587}
                  decoding="async"
                />
              </div>
            </div>
            <div className="portfolio-shell__intro-copy">
              <h1 className="portfolio-shell__title">Hi, I am Parleen Bagga.</h1>
              <p className="portfolio-shell__degree">
                BS in Computer Science, San Diego State University
              </p>
              <a
                className="portfolio-shell__resume"
                href={resumePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Resume
              </a>
            </div>
          </div>
        </section>

        <section className="portfolio-shell__overview" id="overview">
          <p className="portfolio-shell__overview-label">Introduction</p>
          <h2 className="portfolio-shell__overview-title">Overview</h2>
          <p className="portfolio-shell__summary">
            Dedicated Computer Science student with hands-on experience in software projects and web
            development. Skilled in data structures, algorithms, and diverse technologies to build
            efficient solutions, with active involvement in leadership roles, club participation,
            and community initiatives.
          </p>
        </section>

        <section className="portfolio-shell__section" id="projects">
          <h2 className="portfolio-shell__projects-title">Featured Projects</h2>
          <div className="portfolio-shell__projects-underline" aria-hidden="true" />
          <div className="portfolio-shell__project-grid">
            <article className="portfolio-shell__project-card">
              <div className="portfolio-shell__project-image portfolio-shell__project-image--rides">
                <img
                  src="https://images.unsplash.com/photo-1773532946624-e82c5c74845c?auto=format&fit=crop&w=1200&q=80"
                  alt="Taxi driving through a city at night"
                />
              </div>
              <div className="portfolio-shell__project-body">
                <h3>Uber Clone Platform</h3>
                <p>
                  Built real-time booking flows for riders and captains with responsive UI and clear
                  trip states. Focused on smooth user navigation and dependable frontend behavior.
                </p>
                <ul className="portfolio-shell__project-tags">
                  <li>React</li>
                  <li>Node.js</li>
                  <li>MongoDB</li>
                </ul>
                <a
                  className="portfolio-shell__project-link"
                  href={projectRepoUrls.uberClone}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Code
                </a>
              </div>
            </article>

            <article className="portfolio-shell__project-card">
              <div className="portfolio-shell__project-image portfolio-shell__project-image--interview">
                <img
                  src={mockInterviewHero}
                  alt="Mock interview AI dashboard with laptop and career launchpad UI"
                />
              </div>
              <div className="portfolio-shell__project-body">
                <h3>Mock Interview Assistant</h3>
                <p>
                  Developed an interview practice experience with structured prompts and guided
                  response feedback. Designed screens for progress tracking and a clean candidate flow.
                </p>
                <ul className="portfolio-shell__project-tags">
                  <li>React (TypeScript)</li>
                  <li>Firebase</li>
                  <li>Tailwind CSS</li>
                </ul>
                <a
                  className="portfolio-shell__project-link"
                  href={projectRepoUrls.mockInterview}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Code
                </a>
              </div>
            </article>

            <article className="portfolio-shell__project-card">
              <div className="portfolio-shell__project-image portfolio-shell__project-image--emotion">
                <img
                  src="https://images.unsplash.com/photo-1521116103845-2170f3377fec?auto=format&fit=crop&w=1200&q=80"
                  alt="Studio microphone representing speech and voice audio for machine learning"
                />
              </div>
              <div className="portfolio-shell__project-body">
                <h3>Emotion Detection from Speech</h3>
                <p>
                  Built an Azure-based pipeline to detect emotion from speech using LSTM/CNN models.
                  Emphasized scalable preprocessing and MLflow-backed tuning for reliable results.
                </p>
                <ul className="portfolio-shell__project-tags">
                  <li>Python</li>
                  <li>PyTorch</li>
                  <li>Azure</li>
                </ul>
                <a
                  className="portfolio-shell__project-link"
                  href={projectRepoUrls.emotionDetectionSpeech}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Code
                </a>
              </div>
            </article>
          </div>
        </section>

        <section
          className="portfolio-shell__section portfolio-shell__section--experience"
          id="experience"
          aria-labelledby="experience-heading"
        >
          <p className="portfolio-shell__experience-eyebrow">What I have done so far</p>
          <h2 className="portfolio-shell__experience-heading" id="experience-heading">
            Experience
          </h2>

          <div className="portfolio-shell__experience-list">
            <div className="portfolio-shell__experience-line" aria-hidden="true" />
            {experienceEntries.map((job) => (
              <article key={job.id} className="portfolio-shell__exp-item">
                <div className="portfolio-shell__exp-date">{job.dateRange}</div>
                <div className="portfolio-shell__exp-rail">
                  <span className="portfolio-shell__exp-dot" aria-hidden="true" />
                </div>
                <div className="portfolio-shell__exp-body">
                  <div className="portfolio-shell__exp-header">
                    <ExperienceLogo variant={job.logo} />
                    <h3 className="portfolio-shell__exp-company">{job.company}</h3>
                  </div>
                  <p className="portfolio-shell__exp-role">{job.role}</p>
                  <ul className="portfolio-shell__exp-bullets">
                    {job.bullets.map((item, index) => (
                      <li key={`${job.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <p className="portfolio-shell__exp-tech">
                    <strong>Technology used:</strong> {job.technologies.join(', ')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="portfolio-shell__tech-marquee" aria-label="Tech stack">
          <div className="portfolio-shell__tech-marquee-inner">
            <div className="portfolio-shell__marquee" role="presentation">
              <div className="portfolio-shell__marquee-track">
                {techStack.map((item) => (
                  <div className="portfolio-shell__tech-pill" key={item.id}>
                    <img className="portfolio-shell__tech-icon" src={item.iconUrl} alt="" loading="lazy" />
                    <span className="portfolio-shell__tech-text">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="portfolio-shell__section portfolio-shell__section--contact" id="contact">
          <div className="portfolio-shell__contact-chat">
            <div className="portfolio-shell__contact-chat-left">
              <h2 className="portfolio-shell__contact-chat-title">Contact</h2>
              <nav className="portfolio-shell__contact-chat-meta" aria-label="Social profiles and email">
                <a href={contactInfo.linkedInUrl} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
                <a href={contactInfo.githubUrl} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <a
                  href={contactGmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Email ${contactInfo.email} in Gmail`}
                >
                  Email
                </a>
              </nav>
            </div>

            <div className="portfolio-shell__chat-card" aria-label="Resume chatbot">
              <div className="portfolio-shell__chat-topbar">
                <div className="portfolio-shell__chat-avatar" aria-hidden="true">
                  <span />
                </div>
                <div className="portfolio-shell__chat-topbar-pill">Hi there! Ask me anything.</div>
                <button
                  type="button"
                  className="portfolio-shell__chat-topbar-action"
                  onClick={() => appendMessage('bot', answerFromResume('Share your GitHub links.'))}
                  aria-label="Share links"
                >
                  ↗
                </button>
              </div>

              <div className="portfolio-shell__chat-messages" ref={listRef}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === 'user'
                        ? 'portfolio-shell__chat-row portfolio-shell__chat-row--user'
                        : 'portfolio-shell__chat-row portfolio-shell__chat-row--bot'
                    }
                  >
                    <div className="portfolio-shell__chat-bubble">
                      {m.text.split('\n').map((line, idx) => {
                        const emailOnlyLine = /^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(line.trim())
                        const linked = renderChatLineWithLinks(line, `${m.id}-${idx}`)
                        return (
                          <p
                            key={`${m.id}-${idx}`}
                            className={emailOnlyLine ? 'portfolio-shell__chat-line--email' : undefined}
                          >
                            {emailOnlyLine ? <strong>{linked}</strong> : linked}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {chatLoading ? (
                  <div className="portfolio-shell__chat-row portfolio-shell__chat-row--bot" aria-live="polite">
                    <div className="portfolio-shell__chat-bubble portfolio-shell__chat-bubble--typing">
                      <span className="portfolio-shell__chat-typing-dot" />
                      <span className="portfolio-shell__chat-typing-dot" />
                      <span className="portfolio-shell__chat-typing-dot" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="portfolio-shell__chat-suggestions" aria-label="Suggested questions">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="portfolio-shell__chat-chip"
                    disabled={chatLoading}
                    onClick={() => handleSend(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <form
                className="portfolio-shell__chat-inputbar"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (chatLoading) return
                  handleSend(chatInput)
                  setChatInput('')
                }}
              >
                <div className="portfolio-shell__chat-actions" aria-label="Quick links">
                  <a href={contactInfo.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                    <span aria-hidden="true">⌁</span>
                  </a>
                  <a href={contactGmailComposeUrl} target="_blank" rel="noopener noreferrer" aria-label="Email">
                    <span aria-hidden="true">✉</span>
                  </a>
                  <a href={contactInfo.linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <span aria-hidden="true">in</span>
                  </a>
                </div>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="portfolio-shell__chat-input"
                  placeholder="Message..."
                  aria-label="Message"
                />
                <button className="portfolio-shell__chat-send" type="submit" disabled={chatLoading}>
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
