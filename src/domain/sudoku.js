const SIZE = 9;
const BOX = 3;

function cloneGrid(g) {
	return g.map((row) => row.slice());
}

function assertGuess(move) {
	if (move == null || typeof move !== 'object') {
		throw new TypeError('guess: need an object with row, col, value');
	}
	const { row, col, value } = move;
	const okIndex = (n) => Number.isInteger(n) && n >= 0 && n < SIZE;
	if (!okIndex(row) || !okIndex(col) || !Number.isInteger(value) || value < 0 || value > 9) {
		throw new TypeError('guess: row/col 要在 0～8，value 要是 0～9 的整数（0 表示空格）');
	}
}

/**
 * 扫一遍盘面，找出违反数独规则的格子。
 * 返回的字符串还是老样子：`"列,行"`，和 `board[row][col]` 对上就行；0 当空，跳过。
 */
export function conflictKeysForGrid(board) {
	const seen = new Set();
	const keys = [];

	const mark = (col, row) => {
		const key = `${col},${row}`;
		if (seen.has(key)) return;
		seen.add(key);
		keys.push(key);
	};

	for (let row = 0; row < SIZE; row++) {
		for (let col = 0; col < SIZE; col++) {
			const value = board[row][col];
			if (!value) continue;

			for (let i = 0; i < SIZE; i++) {
				if (i !== col && board[row][i] === value) mark(col, row);
				if (i !== row && board[i][col] === value) mark(col, row);
			}

			const boxRow = Math.floor(row / BOX) * BOX;
			const boxCol = Math.floor(col / BOX) * BOX;
			for (let r = boxRow; r < boxRow + BOX; r++) {
				for (let c = boxCol; c < boxCol + BOX; c++) {
					if (r !== row && c !== col && board[r][c] === value) {
						mark(col, row);
					}
				}
			}
		}
	}

	return keys;
}

function isValidGrid(grid) {
	if (!Array.isArray(grid) || grid.length !== SIZE) return false;
	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== SIZE) return false;
		for (const cell of row) {
			if (typeof cell !== 'number') return false;
		}
	}
	return true;
}

/** 收集与 (row,col) 同宫、同行、同列已出现的非零数字 */
function usedDigitsForCell(grid, row, col) {
	const used = new Set();
	for (let c = 0; c < SIZE; c++) {
		const v = grid[row][c];
		if (v) used.add(v);
	}
	for (let r = 0; r < SIZE; r++) {
		const v = grid[r][col];
		if (v) used.add(v);
	}
	const boxRow = Math.floor(row / BOX) * BOX;
	const boxCol = Math.floor(col / BOX) * BOX;
	for (let r = boxRow; r < boxRow + BOX; r++) {
		for (let c = boxCol; c < boxCol + BOX; c++) {
			const v = grid[r][c];
			if (v) used.add(v);
		}
	}
	return used;
}

/**
 * 给定盘面快照，空格 (row,col) 上仍合法的候选数字（升序数组）。
 * 用于「候选提示」与「唯一候选（下一步）」推断。
 */
export function cellCandidatesForGrid(grid, row, col) {
	if (!isValidGrid(grid)) {
		throw new TypeError('cellCandidatesForGrid: 需要合法 9×9 盘面');
	}
	if (grid[row][col] !== 0) return [];
	const used = usedDigitsForCell(grid, row, col);
	const out = [];
	for (let d = 1; d <= 9; d++) {
		if (!used.has(d)) out.push(d);
	}
	return out;
}

/**
 * 按行优先找到第一个「仅有一个候选」的空格，返回该步；若无则 null。
 * 对应作业中的「推定数 / 下一步提示」（仅 singles，不用完整求解器）。
 */
export function nextSinglesHintForGrid(grid) {
	if (!isValidGrid(grid)) {
		throw new TypeError('nextSinglesHintForGrid: 需要合法 9×9 盘面');
	}
	for (let row = 0; row < SIZE; row++) {
		for (let col = 0; col < SIZE; col++) {
			if (grid[row][col] !== 0) continue;
			const cands = cellCandidatesForGrid(grid, row, col);
			if (cands.length === 1) {
				return { row, col, value: cands[0] };
			}
		}
	}
	return null;
}

export function hasEmptyCell(grid) {
	for (let row = 0; row < SIZE; row++) {
		for (let col = 0; col < SIZE; col++) {
			if (grid[row][col] === 0) return true;
		}
	}
	return false;
}

/**
 * 新建一局里的「棋盘对象」：内部数组不往外漏，想改只能通过 guess，
 * 这样 Undo用的克隆才不会和 UI 指到同一块内存。
 */
export function createSudoku(initialGrid) {
	if (!isValidGrid(initialGrid)) {
		throw new TypeError('createSudoku: 需要 9×9、全是数字的二维数组');
	}

	let grid = cloneGrid(initialGrid);

	return {
		getGrid() {
			return cloneGrid(grid);
		},

		guess(move) {
			assertGuess(move);
			grid[move.row][move.col] = move.value;
		},

		clone() {
			return createSudoku(grid);
		},

		toJSON() {
			return { grid: cloneGrid(grid) };
		},

		toString() {
			return grid
				.map((row) => row.map((n) => (n === 0 ? '.' : String(n))).join(' '))
				.join('\n');
		},

		getConflictKeys() {
			return conflictKeysForGrid(grid);
		},

		/** @returns {number[]} */
		getCellCandidates(row, col) {
			if (!okIndex(row) || !okIndex(col)) {
				throw new TypeError('getCellCandidates: row/col 要在 0～8');
			}
			return cellCandidatesForGrid(grid, row, col);
		},

		/** @returns {{ row: number, col: number, value: number } | null} */
		getNextSinglesHint() {
			return nextSinglesHintForGrid(grid);
		},
	};
}

function okIndex(n) {
	return Number.isInteger(n) && n >= 0 && n < SIZE;
}

export function createSudokuFromJSON(json) {
	if (!json || !isValidGrid(json.grid)) {
		throw new TypeError('createSudokuFromJSON: JSON 里缺合法的 grid');
	}
	return createSudoku(json.grid);
}
