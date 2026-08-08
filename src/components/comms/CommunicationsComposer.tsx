'use client'

import { useRef, useState } from 'react'
import { ComposeMessageForm } from '@/components/comms/ComposeMessageForm'
import { PeopleMessageForm } from '@/components/comms/PeopleMessageForm'

type ComposerMode = 'people' | 'groups'

export function CommunicationsComposer({
  classes,
  canSchoolWide,
}: {
  classes: { id: string; name: string }[]
  canSchoolWide: boolean
}) {
  const peopleTabRef = useRef<HTMLButtonElement>(null)
  const groupsTabRef = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<ComposerMode>('people')
  const [peopleDirty, setPeopleDirty] = useState(false)
  const [groupsDirty, setGroupsDirty] = useState(false)

  function chooseMode(next: ComposerMode) {
    if (next === mode) return true
    const currentDirty = mode === 'people' ? peopleDirty : groupsDirty
    if (currentDirty && !window.confirm('Switch modes? Your current draft will be cleared.')) {
      return false
    }
    if (mode === 'people') setPeopleDirty(false)
    else setGroupsDirty(false)
    setMode(next)
    return true
  }

  function moveWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, next: ComposerMode) {
    event.preventDefault()
    if (!chooseMode(next)) return
    if (next === 'people') peopleTabRef.current?.focus()
    else groupsTabRef.current?.focus()
  }

  function handleTabKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      moveWithKeyboard(event, mode === 'people' ? 'groups' : 'people')
    } else if (event.key === 'Home') {
      moveWithKeyboard(event, 'people')
    } else if (event.key === 'End') {
      moveWithKeyboard(event, 'groups')
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Message recipients" className="mb-5 grid grid-cols-2 gap-2">
        <button
          ref={peopleTabRef}
          id="people-tab"
          type="button"
          role="tab"
          aria-selected={mode === 'people'}
          aria-controls="people-panel"
          tabIndex={mode === 'people' ? 0 : -1}
          className={`min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            mode === 'people'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-muted'
          }`}
          onClick={() => chooseMode('people')}
          onKeyDown={handleTabKey}
        >
          People
        </button>
        <button
          ref={groupsTabRef}
          id="groups-tab"
          type="button"
          role="tab"
          aria-selected={mode === 'groups'}
          aria-controls="groups-panel"
          tabIndex={mode === 'groups' ? 0 : -1}
          className={`min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            mode === 'groups'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-muted'
          }`}
          onClick={() => chooseMode('groups')}
          onKeyDown={handleTabKey}
        >
          Groups
        </button>
      </div>

      {mode === 'people' ? (
        <div id="people-panel" role="tabpanel" aria-labelledby="people-tab" tabIndex={0}>
          <PeopleMessageForm onDirtyChange={setPeopleDirty} />
        </div>
      ) : (
        <div id="groups-panel" role="tabpanel" aria-labelledby="groups-tab" tabIndex={0}>
          <ComposeMessageForm
            classes={classes}
            canSchoolWide={canSchoolWide}
            onDirtyChange={setGroupsDirty}
          />
        </div>
      )}
    </div>
  )
}
