import { createSudoku, createSudokuFromJSON, conflictKeysForGrid, hasEmptyCell, nextSinglesHintForGrid } from './sudoku.js';

function boardSignatureFromSudoku(sudoku) {
	return sudoku
		.getGrid()
		.flat()
		.join(',');
}

/**
 * 一局棋：维护当前 Sudoku、线性 Undo/Redo，以及可选的「探索」子会话。
 * 探索中落子不写入主 history，提交时一次性压入锚点快照，保证撤销仍回到探索前。
 */
export function createGame({ sudoku }) {
	let current = sudoku.clone();
	const past = [];
	const future = [];

	let exploring = false;
	/** @type {ReturnType<typeof createSudoku> | null} */
	let exploreAnchor = null;
	const failedBoardSignatures = new Set();

	const snapshot = () => current.clone();

	function registerFailureIfConflict() {
		if (current.getConflictKeys().length > 0) {
			failedBoardSignatures.add(boardSignatureFromSudoku(current));
		}
	}

	return {
		getSudoku() {
			return current;
		},

		guess(move) {
			if (exploring) {
				current.guess(move);
				registerFailureIfConflict();
				return;
			}
			past.push(snapshot());
			future.length = 0;
			current.guess(move);
		},

		undo() {
			if (exploring) return;
			if (past.length === 0) return;
			future.push(snapshot());
			current = past.pop();
		},

		redo() {
			if (exploring) return;
			if (future.length === 0) return;
			past.push(snapshot());
			current = future.pop();
		},

		canUndo() {
			if (exploring) return false;
			return past.length > 0;
		},

		canRedo() {
			if (exploring) return false;
			return future.length > 0;
		},

		isExploring() {
			return exploring;
		},

		/**
		 * 当前盘面是否与某次探索中出现的「冲突终局」相同（记忆失败路径）。
		 */
		isKnownFailedBoard() {
			return failedBoardSignatures.has(boardSignatureFromSudoku(current));
		},

		/**
		 * 进入探索：要求无冲突、存在空格、且不存在唯一候选格（无法用推定数推进）。
		 * @returns {{ ok: true } | { ok: false, reason: string }}
		 */
		enterExplore() {
			if (exploring) return { ok: false, reason: 'already_exploring' };
			const grid = current.getGrid();
			if (conflictKeysForGrid(grid).length > 0) return { ok: false, reason: 'has_conflict' };
			if (!hasEmptyCell(grid)) return { ok: false, reason: 'no_empty' };
			if (nextSinglesHintForGrid(grid)) return { ok: false, reason: 'singles_still_exist' };
			exploring = true;
			exploreAnchor = current.clone();
			return { ok: true };
		},

		/** 放弃探索：盘面回到进入探索时的锚点，主 history 不变。 */
		abandonExplore() {
			if (!exploring) return { ok: false, reason: 'not_exploring' };
			current = exploreAnchor.clone();
			exploring = false;
			exploreAnchor = null;
			return { ok: true };
		},

		/**
		 * 提交探索：保留当前盘面，将锚点压入主 past，使一次撤销即可回到探索前。
		 */
		commitExplore() {
			if (!exploring) return { ok: false, reason: 'not_exploring' };
			past.push(exploreAnchor.clone());
			future.length = 0;
			exploring = false;
			exploreAnchor = null;
			return { ok: true };
		},

		/** 快速回到探索起点，便于换一支候选继续试。 */
		backtrackExploreToAnchor() {
			if (!exploring) return { ok: false, reason: 'not_exploring' };
			current = exploreAnchor.clone();
			return { ok: true };
		},

		toJSON() {
			return { sudoku: current.toJSON() };
		},
	};
}

export function createGameFromJSON(data) {
	if (!data?.sudoku) {
		throw new TypeError('createGameFromJSON: 数据里没有 sudoku');
	}
	return createGame({ sudoku: createSudokuFromJSON(data.sudoku) });
}
