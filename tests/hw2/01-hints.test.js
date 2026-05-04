import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hints on Sudoku', () => {
  it('computes cell candidates from the current board', async () => {
    const { createSudoku, cellCandidatesForGrid } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const grid = sudoku.getGrid()
    const c = cellCandidatesForGrid(grid, 0, 2)
    expect(c).toContain(4)
    expect(c.length).toBeGreaterThan(1)
    expect(sudoku.getCellCandidates(0, 2)).toEqual(c)
  })

  it('returns the first singles-only forced move in row-major order', async () => {
    const { createSudoku, nextSinglesHintForGrid } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const hint = nextSinglesHintForGrid(sudoku.getGrid())
    expect(hint).not.toBeNull()
    expect(hint).toEqual(
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
        value: expect.any(Number),
      }),
    )
    const cands = sudoku.getCellCandidates(hint.row, hint.col)
    expect(cands).toEqual([hint.value])
  })
})
