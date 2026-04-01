const GAP_PX = 12

export function getPortfolioHeaderOffsetPx(): number {
  const el = document.querySelector<HTMLElement>('.portfolio-shell__header')
  return (el?.getBoundingClientRect().height ?? el?.offsetHeight ?? 72) + GAP_PX
}

export function scrollToSectionById(id: string, behavior: ScrollBehavior = 'smooth'): void {
  const target = document.getElementById(id)
  if (!target) return
  const y =
    target.getBoundingClientRect().top + window.scrollY - getPortfolioHeaderOffsetPx()
  window.scrollTo({ top: Math.max(0, y), behavior })
}
