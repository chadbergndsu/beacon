'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const COLS = 10
const ROWS = 20
const CELL = 22

type Cell = number
type Piece = { shape: number[][]; x: number; y: number; color: number }

const COLORS = [
  'transparent',
  '#0ea5e9',
  '#0369a1',
  '#f59e0b',
  '#eab308',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
]

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
]

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function randomPiece(): Piece {
  const color = 1 + Math.floor(Math.random() * 7)
  const shape = SHAPES[color - 1].map((r) => [...r])
  return {
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
    color,
  }
}

function rotate(shape: number[][]): number[][] {
  const h = shape.length
  const w = shape[0].length
  const next = Array.from({ length: w }, () => Array(h).fill(0))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      next[x][h - 1 - y] = shape[y][x]
    }
  }
  return next
}

function collides(
  board: Cell[][],
  piece: Piece,
  dx = 0,
  dy = 0,
  shape = piece.shape
): boolean {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue
      const nx = piece.x + x + dx
      const ny = piece.y + y + dy
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  }
  return false
}

function merge(board: Cell[][], piece: Piece): Cell[][] {
  const next = board.map((r) => [...r])
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue
      const ny = piece.y + y
      const nx = piece.x + x
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        next[ny][nx] = piece.color
      }
    }
  }
  return next
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const kept = board.filter((row) => row.some((c) => !c))
  const cleared = ROWS - kept.length
  while (kept.length < ROWS) {
    kept.unshift(Array(COLS).fill(0))
  }
  return { board: kept, cleared }
}

export function PrincipalTetris() {
  const [board, setBoard] = useState(emptyBoard)
  const [piece, setPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<Piece>(() => randomPiece())
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [highScore, setHighScore] = useState(0)

  const pieceRef = useRef(piece)
  const boardRef = useRef(board)
  const nextRef = useRef(nextPiece)
  const playingRef = useRef(playing)
  const pausedRef = useRef(paused)
  const gameOverRef = useRef(gameOver)
  const levelRef = useRef(level)

  useEffect(() => {
    pieceRef.current = piece
    boardRef.current = board
    nextRef.current = nextPiece
    playingRef.current = playing
    pausedRef.current = paused
    gameOverRef.current = gameOver
    levelRef.current = level
  }, [piece, board, nextPiece, playing, paused, gameOver, level])

  useEffect(() => {
    try {
      const hs = Number(localStorage.getItem('beacon-principal-tetris-hi') || '0')
      if (hs) setHighScore(hs)
    } catch {
      /* ignore */
    }
  }, [])

  const spawn = useCallback((from: Piece, boardNow: Cell[][]) => {
    const p: Piece = {
      ...from,
      shape: from.shape.map((r) => [...r]),
      x: Math.floor((COLS - from.shape[0].length) / 2),
      y: 0,
    }
    if (collides(boardNow, p)) {
      setGameOver(true)
      setPlaying(false)
      setPiece(null)
      return null
    }
    setPiece(p)
    setNextPiece(randomPiece())
    return p
  }, [])

  const lockPiece = useCallback(
    (p: Piece, b: Cell[][]) => {
      const merged = merge(b, p)
      const { board: clearedBoard, cleared } = clearLines(merged)
      if (cleared) {
        setLines((n) => {
          const total = n + cleared
          setLevel(1 + Math.floor(total / 10))
          return total
        })
        setScore((s) => {
          const add = [0, 100, 300, 500, 800][cleared] * levelRef.current
          const next = s + add
          setHighScore((hi) => {
            if (next > hi) {
              try {
                localStorage.setItem('beacon-principal-tetris-hi', String(next))
              } catch {
                /* ignore */
              }
              return next
            }
            return hi
          })
          return next
        })
      } else {
        setScore((s) => s + 5)
      }
      setBoard(clearedBoard)
      spawn(nextRef.current, clearedBoard)
    },
    [spawn]
  )

  const softDrop = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !playingRef.current || pausedRef.current || gameOverRef.current) return
    if (!collides(b, p, 0, 1)) {
      setPiece({ ...p, y: p.y + 1 })
      setScore((s) => s + 1)
    } else {
      lockPiece(p, b)
    }
  }, [lockPiece])

  const hardDrop = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !playingRef.current || pausedRef.current || gameOverRef.current) return
    let dy = 0
    while (!collides(b, p, 0, dy + 1)) dy++
    const landed = { ...p, y: p.y + dy }
    setScore((s) => s + dy * 2)
    lockPiece(landed, b)
  }, [lockPiece])

  const move = useCallback((dx: number) => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !playingRef.current || pausedRef.current || gameOverRef.current) return
    if (!collides(b, p, dx, 0)) {
      setPiece({ ...p, x: p.x + dx })
    }
  }, [])

  const rotatePiece = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !playingRef.current || pausedRef.current || gameOverRef.current) return
    const shape = rotate(p.shape)
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(b, p, kick, 0, shape)) {
        setPiece({ ...p, shape, x: p.x + kick })
        return
      }
    }
  }, [])

  const startGame = useCallback(() => {
    const b = emptyBoard()
    setBoard(b)
    setScore(0)
    setLines(0)
    setLevel(1)
    setGameOver(false)
    setPaused(false)
    setPlaying(true)
    const first = randomPiece()
    setNextPiece(randomPiece())
    spawn(first, b)
  }, [spawn])

  useEffect(() => {
    if (!playing || paused || gameOver) return
    const ms = Math.max(120, 700 - (level - 1) * 55)
    const id = window.setInterval(() => softDrop(), ms)
    return () => clearInterval(id)
  }, [playing, paused, gameOver, level, softDrop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playingRef.current && e.key === ' ') {
        e.preventDefault()
        startGame()
        return
      }
      if (!playingRef.current) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P'].includes(e.key)) {
        e.preventDefault()
      }
      if (e.key === 'p' || e.key === 'P') {
        setPaused((p) => !p)
        return
      }
      if (pausedRef.current || gameOverRef.current) return
      if (e.key === 'ArrowLeft') move(-1)
      if (e.key === 'ArrowRight') move(1)
      if (e.key === 'ArrowDown') softDrop()
      if (e.key === 'ArrowUp') rotatePiece()
      if (e.key === ' ') hardDrop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, softDrop, rotatePiece, hardDrop, startGame])

  const display = board.map((r) => [...r])
  if (piece) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue
        const ny = piece.y + y
        const nx = piece.x + x
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          display[ny][nx] = piece.color
        }
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
      <Card className="overflow-hidden border-sky-100 dark:border-sky-900/40 w-fit mx-auto lg:mx-0">
        <div className="bg-navy px-4 py-3 text-white flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Principal only
            </p>
            <p className="font-bold">Beacon Blocks</p>
          </div>
          <div className="text-right text-xs text-slate-300">
            <div>
              Score <span className="font-bold text-white tabular-nums">{score}</span>
            </div>
            <div>
              Best <span className="font-bold text-sky-300 tabular-nums">{highScore}</span>
            </div>
          </div>
        </div>
        <CardContent className="p-3 bg-slate-950">
          <div
            className="relative rounded-lg border border-slate-700 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            style={{ width: COLS * CELL, height: ROWS * CELL }}
            tabIndex={0}
            role="application"
            aria-label="Tetris game board"
          >
            {display.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className="absolute box-border"
                  style={{
                    left: x * CELL,
                    top: y * CELL,
                    width: CELL,
                    height: CELL,
                    background: cell ? COLORS[cell] : '#0f172a',
                    border: cell
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid rgba(30,41,59,0.8)',
                    boxShadow: cell ? 'inset 0 0 8px rgba(255,255,255,0.15)' : undefined,
                  }}
                />
              ))
            )}
            {(paused || gameOver || !playing) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4 text-center">
                {gameOver && (
                  <>
                    <p className="text-lg font-bold">Game over</p>
                    <p className="text-sm text-slate-300 mt-1">Score {score}</p>
                  </>
                )}
                {paused && !gameOver && <p className="text-lg font-bold">Paused</p>}
                {!playing && !gameOver && (
                  <>
                    <p className="text-lg font-bold">Ready for a break?</p>
                    <p className="text-xs text-slate-400 mt-1">A tiny break between decisions</p>
                  </>
                )}
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => {
                    if (paused && playing) setPaused(false)
                    else startGame()
                  }}
                >
                  {gameOver || !playing ? 'Play' : 'Resume'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Lines</p>
                <p className="text-xl font-bold tabular-nums">{lines}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Level</p>
                <p className="text-xl font-bold tabular-nums">{level}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Next</p>
                <div
                  className="mt-1 grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 14px)`,
                  }}
                >
                  {nextPiece.shape.map((row, y) =>
                    row.map((c, x) => (
                      <div
                        key={`${y}-${x}`}
                        className={cn('h-3.5 w-3.5 rounded-sm')}
                        style={{
                          background: c ? COLORS[nextPiece.color] : 'transparent',
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={startGame}>
                New game
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!playing || gameOver}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? 'Resume' : 'Pause'}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">Controls</p>
              <p>← → move · ↑ rotate · ↓ soft drop · Space hard drop · P pause</p>
              <p className="pt-1">
                Principal office exclusive — not shown to teachers or parents.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
