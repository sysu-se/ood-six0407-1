import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

function emptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

describe('HW2 explore mode on Game', () => {
  it('refuses explore when a singles hint still exists', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const r = game.enterExplore()
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('singles_still_exist')
  })

  it('allows explore on an all-empty board, records conflict, and remembers failed layout', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyBoard()) })
    expect(game.enterExplore().ok).toBe(true)

    game.guess({ row: 0, col: 0, value: 1 })
    game.guess({ row: 0, col: 1, value: 1 })
    expect(game.getSudoku().getConflictKeys().length).toBeGreaterThan(0)
    expect(game.isKnownFailedBoard()).toBe(true)

    expect(game.backtrackExploreToAnchor().ok).toBe(true)
    expect(game.getSudoku().getGrid()[0][0]).toBe(0)
    expect(game.isKnownFailedBoard()).toBe(false)

    game.guess({ row: 0, col: 0, value: 1 })
    game.guess({ row: 0, col: 1, value: 1 })
    expect(game.isKnownFailedBoard()).toBe(true)
  })

  it('does not push main undo stack during explore; commit merges one undo step', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyBoard()) })
    game.enterExplore()
    game.guess({ row: 0, col: 0, value: 5 })
    game.guess({ row: 0, col: 1, value: 6 })
    expect(game.canUndo()).toBe(false)

    expect(game.commitExplore().ok).toBe(true)
    expect(game.canUndo()).toBe(true)
    game.undo()
    expect(game.getSudoku().getGrid()[0][0]).toBe(0)
    expect(game.getSudoku().getGrid()[0][1]).toBe(0)
  })

  it('disables undo/redo while exploring', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(emptyBoard()) })
    game.guess({ row: 8, col: 8, value: 9 })
    expect(game.canUndo()).toBe(true)
    game.undo()

    game.enterExplore()
    expect(game.canUndo()).toBe(false)
    expect(game.canRedo()).toBe(false)
  })
})
