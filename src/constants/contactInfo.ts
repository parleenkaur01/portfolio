/** Served from `public/` — opens in the browser or the visitor’s default PDF app. */
export const resumePdfUrl = '/Parleen_Bagga_Resume.pdf' as const

/** Contact details from your resume / profile. */
export const contactInfo = {
  email: 'parleenkaurbagga@gmail.com',
  /** E.164 for tel: links */
  phoneE164: '+16199042511',
  phoneDisplay: '+1 (619) 904-2511',
  githubUrl: 'https://github.com/parleenkaur01',
  linkedInUrl: 'https://www.linkedin.com/in/parleen-kaur-bagga-9908a5229/',
} as const

/** Opens Gmail in the browser with To: prefilled (works when signed into Google). */
export const contactGmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactInfo.email)}`
