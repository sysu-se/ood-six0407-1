<script>
	import { candidates } from '@sudoku/stores/candidates';
	import {
		userGrid,
		canUndo,
		canRedo,
		exploring,
		exploreNotice,
		singlesHintAvailable,
		canEnterExplore,
	} from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	$: hintsAvailable = $hints > 0;
	$: singlesHintDisabled =
		$gamePaused || !hintsAvailable || !$singlesHintAvailable || $exploring;
	$: candidateHintDisabled =
		$keyboardDisabled || !hintsAvailable || $exploring || $userGrid[$cursor.y][$cursor.x] !== 0;

	function handleSinglesHint() {
		if (singlesHintDisabled) return;
		if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
			candidates.clear($cursor);
		}
		userGrid.applySinglesHint();
	}

	function handleCandidateHint() {
		if (candidateHintDisabled) return;
		if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
			candidates.clear($cursor);
		}
		userGrid.applyCandidateHint($cursor);
	}

	function handleEnterExplore() {
		if ($gamePaused || $exploring || !$canEnterExplore) return;
		userGrid.enterExplore();
	}
</script>

<div class="action-buttons space-x-3 flex-wrap">
	<button class="btn btn-round" disabled={$gamePaused || !$canUndo} on:click={() => userGrid.undo()} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !$canRedo} on:click={() => userGrid.redo()} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button
		class="btn btn-round btn-badge"
		disabled={singlesHintDisabled}
		on:click={handleSinglesHint}
		title="下一步提示（唯一候选格）"
	>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>
		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button
		class="btn btn-round btn-badge"
		disabled={candidateHintDisabled}
		on:click={handleCandidateHint}
		title="候选提示（当前格）"
	>
		<span class="text-sm font-semibold leading-none">?</span>
		{#if $settings.hintsLimited}
			<span class="badge badge-offset" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>
		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>
</div>

{#if $exploring}
	<div class="explore-bar mt-2 flex flex-wrap gap-2 items-center text-sm">
		<span class="text-primary font-medium">探索模式</span>
		<button type="button" class="btn btn-sm" disabled={$gamePaused} on:click={() => userGrid.backtrackExploreToAnchor()} title="回到探索起点">
			回到起点
		</button>
		<button type="button" class="btn btn-sm" disabled={$gamePaused} on:click={() => userGrid.commitExplore()}>提交</button>
		<button type="button" class="btn btn-sm" disabled={$gamePaused} on:click={() => userGrid.abandonExplore()}>放弃</button>
	</div>
{:else}
	<div class="explore-bar mt-2">
		<button
			type="button"
			class="btn btn-sm"
			disabled={$gamePaused || !$canEnterExplore}
			on:click={handleEnterExplore}
			title="在无唯一候选时进入尝试模式"
		>
			进入探索
		</button>
	</div>
{/if}

{#if $exploreNotice}
	<p class="explore-notice mt-1 text-xs text-amber-700">{$exploreNotice}</p>
{/if}

<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width: 20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-offset {
		@apply left-auto right-0;
	}

	.badge-primary {
		@apply bg-primary;
	}

	.btn-sm {
		@apply px-2 py-1 rounded border border-gray-300 text-gray-800 bg-white;
	}

	.btn-sm:disabled {
		@apply opacity-50 cursor-not-allowed;
	}
</style>
