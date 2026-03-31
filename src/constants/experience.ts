export type ExperienceEntry = {
  id: string
  dateRange: string
  company: string
  role: string
  bullets: string[]
  technologies: string[]
  logo: 'replyquick' | 'batchmaster'
}

export const experienceEntries: ExperienceEntry[] = [
  {
    id: 'replyquick',
    dateRange: 'May 2025 — August 2025',
    company: 'ReplyQuick AI',
    role: 'Software Engineering Intern',
    bullets: [
      'Optimized the company’s voice response system by fine-tuning RetellAI and BlandAI integrations, reducing average call latency by 35% and improving voice-to-text accuracy in noisy conditions.',
      'Built and deployed backend APIs using Supabase Edge Functions and Vercel, cutting server response times by 40% and ensuring seamless performance during traffic spikes.',
      'Refactored messaging workflows to reduce Twilio API calls, cutting costs by 20% and speeding up bulk SMS delivery.',
      'Designed and ran end-to-end QA tests with Postman and scripts, improving platform reliability by 30%.',
    ],
    technologies: [
      'TypeScript',
      'Supabase',
      'PostgreSQL',
      'Vercel',
      'RetellAI',
      'Twilio',
      'BlandAI',
      'GitHub',
    ],
    logo: 'replyquick',
  },
  {
    id: 'batchmaster',
    dateRange: 'May 2024 — August 2024',
    company: 'BatchMaster Software',
    role: 'Full-Stack Software Engineer Intern',
    bullets: [
      'Built an interactive “Production Insights” webpage inside the BatchMaster ERP suite with React + Figma, letting plant managers monitor batch yields, cost variance, and QA flags in real time across desktop and mobile.',
      'Engineered a high-throughput Node.js/Express service backed by MySQL for formulation CRUD, lot-level traceability, and regulatory audit logs—tuning indexes and pooling to cut API latency by 20%.',
      'Implemented OAuth 2.0/OpenID Connect SSO with QuickBooks, Sage, and SAP, reducing onboarding time by 30%.',
      'Optimized Redis and async queues for 10k+ daily transactions, enabling zero-downtime CI/CD deployments.',
    ],
    technologies: [
      'React.js',
      'JavaScript',
      'Node.js',
      'Express',
      'MySQL',
      'Figma',
      'RESTful APIs',
      'Redis',
    ],
    logo: 'batchmaster',
  },
]
