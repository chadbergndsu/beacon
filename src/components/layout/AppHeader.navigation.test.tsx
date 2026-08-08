/** @vitest-environment jsdom */

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/dashboard', search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: ReactNode
  }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
      }}
    >
      {children}
    </a>
  ),
}))
vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }))

import { AppHeader } from './AppHeader'

const principal = {
  id: 'principal-1',
  school_id: 'school-1',
  role: 'principal' as const,
  full_name: 'Pat Principal',
  email: 'principal@example.com',
  phone: null,
}

describe('AppHeader navigation feedback', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard'
    mocks.search = ''
  })

  afterEach(() => {
    cleanup()
  })

  it('immediately announces an internal navigation and clears after the route changes', () => {
    const { rerender } = render(<AppHeader profile={principal} />)
    const officeLinks = screen.getAllByRole('link', { name: 'Office' })

    fireEvent.click(officeLinks[0])

    expect(screen.getByRole('status').textContent).toContain('Opening Office')

    mocks.pathname = '/principal'
    rerender(<AppHeader profile={principal} />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows feedback for a same-page query change and clears when it arrives', () => {
    const { rerender } = render(<AppHeader profile={principal} />)
    const queryLink = document.createElement('a')
    queryLink.href = '/dashboard?view=grades'
    queryLink.textContent = 'Grades view'
    queryLink.addEventListener('click', (event) => event.preventDefault())
    document.body.appendChild(queryLink)

    fireEvent.click(queryLink)

    expect(screen.getByRole('status').textContent).toContain('Opening Grades view')

    mocks.search = 'view=grades'
    rerender(<AppHeader profile={principal} />)

    expect(screen.queryByRole('status')).toBeNull()
    queryLink.remove()
  })
})
