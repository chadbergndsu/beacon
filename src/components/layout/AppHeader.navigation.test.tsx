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

const teacher = {
  id: 'teacher-1',
  school_id: 'school-1',
  role: 'teacher' as const,
  full_name: 'Terry Teacher',
  email: 'teacher@example.com',
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

  it('keeps teacher More menus outside horizontally scrollable primary rails', () => {
    render(<AppHeader profile={teacher} />)

    const primaryRails = screen.getAllByRole('navigation', { name: 'Main navigation' })
    const moreButtons = screen.getAllByRole('button', { name: 'More' })

    expect(primaryRails).toHaveLength(2)
    expect(primaryRails.every((rail) => rail.className.includes('overflow-x-auto'))).toBe(true)
    expect(primaryRails.every((rail) => rail.textContent?.includes('Classroom'))).toBe(true)
    expect(moreButtons).toHaveLength(2)
    moreButtons.forEach((button) => {
      expect(button.closest('.overflow-x-auto')).toBeNull()
    })
  })

  it('toggles the teacher More menu and closes it for navigation, Escape, and outside clicks', () => {
    render(<AppHeader profile={teacher} />)

    const [moreButton] = screen.getAllByRole('button', { name: 'More' })
    fireEvent.click(moreButton)

    expect(moreButton.getAttribute('aria-haspopup')).toBeNull()
    expect(moreButton.getAttribute('aria-expanded')).toBe('true')
    const disclosure = screen.getAllByRole('navigation', { name: 'More links' })[0]
    expect(disclosure.textContent).toContain('Lessons')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('menuitem')).toBeNull()

    fireEvent.click(screen.getAllByRole('link', { name: 'Lessons' })[0])
    expect(screen.queryByRole('navigation', { name: 'More links' })).toBeNull()

    fireEvent.click(moreButton)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'More links' })).toBeNull()
    expect(document.activeElement).toBe(moreButton)

    fireEvent.click(moreButton)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('navigation', { name: 'More links' })).toBeNull()
    expect(moreButton.getAttribute('aria-expanded')).toBe('false')
  })
})
