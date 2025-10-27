(() => {
	const STORAGE_KEY = 'sat-vocab-studio:v1';
	const DEFAULT_SETTINGS = {
		view: 'all',
		onlyEnabled: true,
		autoFlip: false,
		studyReviewOnly: false,
	};

	const elements = {};
	const state = {
		words: [],
		deck: [],
		pos: 0,
		flipped: false,
		settings: { ...DEFAULT_SETTINGS },
		searchTerm: '',
	};

	const saveScheduler = {
		timer: null,
	};

	const feedbackAnimation = {
		timer: null,
	};

	init();

	function init() {
		cacheElements();
		hydrateFromStorage();
		applySettingsToUI();
		bindEvents();
		rebuildDeck({ keepCurrent: false });
		renderList();
		renderCard();
		renderStats();
	}

	function cacheElements() {
		elements.card = document.getElementById('card');
		elements.cardFrontHeading = document.getElementById('flashcard-heading');
		elements.cardFrontPos = document.getElementById('card-pos');
		elements.cardPron = document.getElementById('card-pron');
		elements.cardWord = document.getElementById('card-word');
		elements.cardPart = document.getElementById('card-part');
		elements.cardPronBack = document.getElementById('card-pron-back');
		elements.cardDefinition = document.getElementById('card-definition');
		elements.cardLink = document.getElementById('card-link');
		elements.cardNotes = document.getElementById('card-notes');
		elements.cardCounter = document.getElementById('card-counter');

		elements.markReview = document.getElementById('mark-review');
		elements.noteInput = document.getElementById('note-input');

		elements.prevBtn = document.getElementById('prev-btn');
		elements.nextBtn = document.getElementById('next-btn');
		elements.flipBtn = document.getElementById('flip-btn');
		elements.shuffleBtn = document.getElementById('shuffle-btn');
		elements.markRight = document.getElementById('mark-right');
		elements.markWrong = document.getElementById('mark-wrong');

		elements.searchInput = document.getElementById('search-input');
		elements.viewSelect = document.getElementById('view-select');
		elements.onlyEnabled = document.getElementById('only-enabled');
		elements.autoFlip = document.getElementById('auto-flip');
		elements.studyReviewOnly = document.getElementById('study-review-only');

		elements.importArea = document.getElementById('import-area');
		elements.importBtn = document.getElementById('import-btn');
		elements.importFile = document.getElementById('import-file');
		elements.selectAll = document.getElementById('select-all');
		elements.deselectAll = document.getElementById('deselect-all');
		elements.exportBtn = document.getElementById('export-data');
		elements.resetBtn = document.getElementById('reset-data');

		elements.wordList = document.getElementById('word-list');

		elements.statTotal = document.getElementById('stat-total');
		elements.statPercent = document.getElementById('stat-percent');
		elements.statDeck = document.getElementById('stat-deck');
	}

	function hydrateFromStorage() {
		const stored = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
		state.settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
		if ('theme' in state.settings) {
			delete state.settings.theme;
		}

		const storedWords = Array.isArray(stored.words) ? stored.words : [];
		const baseWords = Array.isArray(window.SAT_VOCAB_WORDS) ? window.SAT_VOCAB_WORDS : [];
		state.words = mergeWordLists(baseWords, storedWords).map(normalizeWord);
		state.words.sort((a, b) => a.word.localeCompare(b.word));
	}

	function applySettingsToUI() {
		elements.viewSelect.value = state.settings.view;
		elements.onlyEnabled.checked = state.settings.onlyEnabled;
		elements.autoFlip.checked = state.settings.autoFlip;
		elements.studyReviewOnly.checked = state.settings.studyReviewOnly;
	}

	function bindEvents() {
		elements.flipBtn.addEventListener('click', () => flip());
		elements.prevBtn.addEventListener('click', () => move(-1));
		elements.nextBtn.addEventListener('click', () => move(1));
		elements.shuffleBtn.addEventListener('click', () => {
			shuffle(state.deck);
			state.pos = 0;
			state.flipped = false;
			renderCard();
			renderStats();
			scheduleSave();
		});
		elements.markRight.addEventListener('click', () => mark(true));
		elements.markWrong.addEventListener('click', () => mark(false));
		elements.markReview.addEventListener('change', handleReviewToggle);
		elements.noteInput.addEventListener('input', handleNoteChange);

		elements.card.addEventListener('click', () => flip());
		elements.card.addEventListener('keydown', handleCardKeydown);

		elements.wordList.addEventListener('click', handleListClick);
		elements.wordList.addEventListener('keydown', handleListKeydown);

		elements.searchInput.addEventListener('input', () => {
			state.searchTerm = elements.searchInput.value.trim();
			renderList();
		});

		elements.viewSelect.addEventListener('change', () => {
			state.settings.view = elements.viewSelect.value;
			state.pos = 0;
			state.flipped = false;
			rebuildDeck({ keepCurrent: false });
			renderCard();
			renderStats();
			scheduleSave();
		});

		elements.onlyEnabled.addEventListener('change', () => {
			state.settings.onlyEnabled = elements.onlyEnabled.checked;
			rebuildDeck({ keepCurrent: true });
			renderCard();
			renderStats();
			scheduleSave();
		});

		elements.autoFlip.addEventListener('change', () => {
			state.settings.autoFlip = elements.autoFlip.checked;
			scheduleSave();
		});

		elements.studyReviewOnly.addEventListener('change', () => {
			state.settings.studyReviewOnly = elements.studyReviewOnly.checked;
			rebuildDeck({ keepCurrent: true });
			renderCard();
			renderStats();
			scheduleSave();
		});

		elements.importBtn.addEventListener('click', handleImportText);
		elements.importFile.addEventListener('change', handleImportFile);

		elements.selectAll.addEventListener('click', () => {
			state.words.forEach((word) => {
				word.enabled = true;
			});
			rebuildDeck({ keepCurrent: true });
			renderList();
			renderCard();
			renderStats();
			scheduleSave();
		});

		elements.deselectAll.addEventListener('click', () => {
			state.words.forEach((word) => {
				word.enabled = false;
			});
			rebuildDeck({ keepCurrent: false });
			renderList();
			renderCard();
			renderStats();
			scheduleSave();
		});

		elements.exportBtn.addEventListener('click', exportProgress);
		elements.resetBtn.addEventListener('click', resetProgress);

		window.addEventListener('keydown', handleGlobalKeys, { passive: false });
	}

	function handleGlobalKeys(event) {
		const activeTag = document.activeElement?.tagName;
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag || '')) {
			return;
		}

		if (['Space', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
			event.preventDefault();
		}

		if (event.code === 'Space') {
			flip();
		} else if (event.code === 'ArrowRight') {
			move(1);
		} else if (event.code === 'ArrowLeft') {
			move(-1);
		} else if (event.key?.toLowerCase() === 'r') {
			elements.markReview.checked = !elements.markReview.checked;
			handleReviewToggle();
		} else if (event.key?.toLowerCase() === 'c') {
			mark(true);
		} else if (event.key?.toLowerCase() === 'x') {
			mark(false);
		}
	}

	function handleCardKeydown(event) {
		if (['Space', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
			event.preventDefault();
		}
		if (event.code === 'Space') {
			flip();
		} else if (event.code === 'ArrowRight') {
			move(1);
		} else if (event.code === 'ArrowLeft') {
			move(-1);
		} else if (event.key?.toLowerCase() === 'r') {
			elements.markReview.checked = !elements.markReview.checked;
			handleReviewToggle();
		} else if (event.key?.toLowerCase() === 'c') {
			mark(true);
		} else if (event.key?.toLowerCase() === 'x') {
			mark(false);
		}
	}

	function handleReviewToggle() {
		const word = getCurrentWord();
		if (!word) return;
		word.review = elements.markReview.checked;
		renderList();
		scheduleSave();
	}

	function handleNoteChange() {
		const word = getCurrentWord();
		if (!word) return;
		const raw = elements.noteInput.value.replace(/\r\n/g, '\n');
		word.notes = raw;
		renderCard();
		renderList();
		scheduleSave();
	}

	function handleListClick(event) {
		const toggleButton = event.target.closest('button[data-action="toggle-enable"]');
		if (toggleButton) {
			const index = Number(toggleButton.dataset.i);
			if (Number.isNaN(index)) return;
			const word = state.words[index];
			if (!word) return;
			word.enabled = !word.enabled;
			rebuildDeck({ keepCurrent: true });
			renderList();
			renderCard();
			renderStats();
			scheduleSave();
			return;
		}

		const item = event.target.closest('.word-item');
		if (!item) return;
		const index = Number(item.dataset.index);
		if (Number.isNaN(index)) return;
		gotoWord(index);
	}

	function handleListKeydown(event) {
		if (!['Enter', ' ', 'Spacebar'].includes(event.key)) return;
		const item = event.target.closest('.word-item');
		if (!item) return;
		event.preventDefault();
		const index = Number(item.dataset.index);
		if (Number.isNaN(index)) return;
		gotoWord(index);
	}

	function gotoWord(index) {
		const deckIndex = state.deck.findIndex((i) => i === index);
		if (deckIndex === -1) {
			// If word not in active deck, switch to all words view to show it.
			state.settings.view = 'all';
			elements.viewSelect.value = 'all';
			rebuildDeck({ keepCurrent: false });
			renderStats();
			scheduleSave();
			const newlyFoundIndex = state.deck.findIndex((i) => i === index);
			if (newlyFoundIndex !== -1) {
				state.pos = newlyFoundIndex;
			}
		} else {
			state.pos = deckIndex;
		}
		state.flipped = false;
		renderCard();
	}

	function handleImportText() {
		const text = elements.importArea.value.trim();
		if (!text) return;
		const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
		if (!lines.length) return;
		const added = importWordsFromLines(lines);
		elements.importArea.value = '';
		if (added) {
			notify(`${added} new word${added === 1 ? '' : 's'} imported.`);
		}
	}

	function handleImportFile(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const content = String(ev.target?.result || '');
			const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
			if (!lines.length) return;
			const added = importWordsFromLines(lines);
			if (added) {
				notify(`${added} new word${added === 1 ? '' : 's'} imported from file.`);
			}
		};
		reader.readAsText(file);
		elements.importFile.value = '';
	}

	function importWordsFromLines(lines) {
		const existing = new Map(state.words.map((w) => [w.word.toLowerCase(), w]));
		let added = 0;
		lines.forEach((line) => {
			const [wordRaw, posRaw, defRaw, pronRaw] = line.split('|').map((part) => part.trim());
			if (!wordRaw) return;
			const key = wordRaw.toLowerCase();
			if (existing.has(key)) return;
			const newWord = normalizeWord({
				word: wordRaw,
				partOfSpeech: posRaw || '',
				definition: defRaw || '',
				pronunciation: pronRaw || '',
			});
			newWord.enabled = true;
			newWord.custom = true;
			newWord.addedAt = Date.now();
			state.words.push(newWord);
			existing.set(key, newWord);
			added += 1;
		});

		if (added) {
			state.words.sort((a, b) => a.word.localeCompare(b.word));
			rebuildDeck({ keepCurrent: true });
			renderList();
			renderCard();
			renderStats();
			scheduleSave();
		}
		return added;
	}

	function rebuildDeck({ keepCurrent }) {
		const currentWord = keepCurrent ? getCurrentWord() : null;
		const indices = [];
		const view = state.settings.view;
		const onlyEnabled = state.settings.onlyEnabled;
		const requireReviewInStudy = state.settings.studyReviewOnly;

		state.words.forEach((word, index) => {
			if (onlyEnabled && !word.enabled) return;

			if (view === 'review') {
				if (!word.review) return;
			} else if (view === 'study') {
				const studiedCount = word.right + word.wrong;
				const accuracy = studiedCount ? word.right / studiedCount : 0;
				const needsMoreWork = studiedCount === 0 || accuracy < 0.7 || word.review;
				if (!needsMoreWork) return;
				if (requireReviewInStudy && !word.review) return;
			}

			indices.push(index);
		});

		if (!indices.length && view !== 'all') {
			// Fallback to all to avoid empty deck trap.
			state.settings.view = 'all';
			elements.viewSelect.value = 'all';
			return rebuildDeck({ keepCurrent: keepCurrent && !!currentWord });
		}

		state.deck = indices;

		if (!state.deck.length) {
			state.pos = 0;
			return;
		}

		if (currentWord) {
			const nextIndex = state.deck.findIndex((i) => state.words[i].word === currentWord.word);
			if (nextIndex !== -1) {
				state.pos = nextIndex;
			} else {
				state.pos = Math.min(state.pos, state.deck.length - 1);
			}
		} else {
			state.pos = Math.min(state.pos, state.deck.length - 1);
		}
	}

	function move(delta) {
		if (!state.deck.length) return;
		state.pos = (state.pos + delta + state.deck.length) % state.deck.length;
		state.flipped = false;
		renderCard();
	}

	function flip(forceValue) {
		if (!state.deck.length) return;
		if (typeof forceValue === 'boolean') {
			state.flipped = forceValue;
		} else {
			state.flipped = !state.flipped;
		}
		syncCardFaces();
	}

	function syncCardFaces() {
		if (state.flipped) {
			elements.card.classList.remove('show-front');
			elements.card.classList.add('show-back');
		} else {
			elements.card.classList.add('show-front');
			elements.card.classList.remove('show-back');
		}
	}

	function getCurrentWord() {
		if (!state.deck.length) return null;
		const index = state.deck[state.pos];
		return state.words[index] || null;
	}

	function mark(isCorrect) {
		const word = getCurrentWord();
		if (!word) return;
		triggerCardFlash(isCorrect ? 'correct' : 'incorrect');
		if (isCorrect) {
			word.right += 1;
		} else {
			word.wrong += 1;
		}
		word.lastStudied = Date.now();

		if (state.settings.autoFlip) {
			state.flipped = false;
		}
		move(1);
		renderStats();
		renderList();
		scheduleSave();
	}

	function renderCard() {
		const word = getCurrentWord();
		const hasWord = Boolean(word);

		const disable = !hasWord;
		[
			elements.markReview,
			elements.noteInput,
			elements.prevBtn,
			elements.nextBtn,
			elements.flipBtn,
			elements.markRight,
			elements.markWrong,
			elements.shuffleBtn,
		].forEach((el) => {
			if (!el) return;
			el.disabled = disable;
		});

		if (!hasWord) {
			elements.card.classList.add('show-front');
			elements.card.classList.remove('show-back');
			elements.cardFrontHeading.textContent = 'No words match';
			elements.cardFrontPos.textContent = 'Adjust filters or import more words to begin.';
			if (elements.cardPron) {
				elements.cardPron.textContent = '';
				elements.cardPron.setAttribute('hidden', '');
			}
			elements.cardWord.textContent = '';
			elements.cardPart.textContent = '';
			if (elements.cardPronBack) {
				elements.cardPronBack.textContent = '';
				elements.cardPronBack.setAttribute('hidden', '');
			}
			elements.cardDefinition.textContent = '';
			elements.cardLink.innerHTML = '';
			elements.cardNotes.textContent = '';
			elements.cardCounter.textContent = '0 / 0';
			elements.markReview.checked = false;
			elements.noteInput.value = '';
			return;
		}

		const link = word.mwLink || buildMwLink(word.word);
		elements.cardFrontHeading.textContent = word.word;
		elements.cardFrontPos.textContent = word.partOfSpeech || 'Flip for full details';
		if (elements.cardPron) {
			if (word.pronunciation) {
				elements.cardPron.textContent = word.pronunciation;
				elements.cardPron.removeAttribute('hidden');
			} else {
				elements.cardPron.textContent = '';
				elements.cardPron.setAttribute('hidden', '');
			}
		}

		elements.cardWord.textContent = word.word;
		elements.cardPart.textContent = word.partOfSpeech ? word.partOfSpeech : 'Check Merriam-Webster for part of speech';
		if (elements.cardPronBack) {
			if (word.pronunciation) {
				elements.cardPronBack.textContent = word.pronunciation;
				elements.cardPronBack.removeAttribute('hidden');
			} else {
				elements.cardPronBack.textContent = '';
				elements.cardPronBack.setAttribute('hidden', '');
			}
		}

		if (word.definition) {
			elements.cardDefinition.textContent = word.definition;
		} else {
			elements.cardDefinition.textContent = 'Open the Merriam-Webster link below to read the full definition.';
		}

		elements.cardLink.innerHTML = `<a href="${link}" target="_blank" rel="noopener">See Merriam-Webster entry ↗</a>`;

		if (word.notes) {
			const noteHtml = escapeHtml(word.notes).replace(/\n/g, '<br />');
			elements.cardNotes.innerHTML = noteHtml;
		} else {
			elements.cardNotes.textContent = 'No notes yet.';
		}

		elements.markReview.checked = Boolean(word.review);
		elements.noteInput.value = word.notes || '';

		const counter = `${state.pos + 1} / ${state.deck.length}`;
		elements.cardCounter.textContent = counter;
		state.flipped = false;
		syncCardFaces();
	}

	function triggerCardFlash(resultType) {
		if (!elements.card) return;
		const className = resultType === 'correct' ? 'flash-correct' : 'flash-incorrect';
		elements.card.classList.remove('flash-correct', 'flash-incorrect');
		if (feedbackAnimation.timer) {
			window.clearTimeout(feedbackAnimation.timer);
			feedbackAnimation.timer = null;
		}
		// restart the animation if it's already running
		void elements.card.offsetWidth;
		elements.card.classList.add(className);
		feedbackAnimation.timer = window.setTimeout(() => {
			elements.card.classList.remove('flash-correct', 'flash-incorrect');
			feedbackAnimation.timer = null;
		}, 400);
	}

	function renderList() {
		const term = state.searchTerm.toLowerCase();
		const fragments = [];

		state.words.forEach((word, index) => {
			if (term) {
				if (!word.word.toLowerCase().includes(term)) return;
			}

			const stats = getWordStats(word);
			const reviewLabel = word.review ? '<span class="tag">Review</span>' : '';
			const enableLabel = word.enabled ? 'Disable' : 'Enable';
			const accuracyMarkup = stats.studied
				? `<span class="accuracy-value" style="color: ${getPercentColor(stats.accuracy)};">${stats.accuracy}%</span> • ${escapeHtml(String(stats.studied))}×`
				: 'Not studied yet';

			fragments.push(`
				<article class="word-item" data-index="${index}" aria-disabled="${!word.enabled}" tabindex="0" role="button">
					<div class="word-row">
						<strong>${escapeHtml(word.word)}</strong>
						<div class="word-actions">
							<button type="button" data-action="toggle-enable" data-i="${index}">${enableLabel}</button>
						</div>
					</div>
					<div class="word-meta">
						<span>${escapeHtml(word.partOfSpeech || '—')}</span>
						<span>${accuracyMarkup}</span>
					</div>
					<div class="word-meta">
						<span>${reviewLabel}</span>
						<span>${word.notes ? 'Has notes' : ''}</span>
					</div>
				</article>
			`);
		});

		elements.wordList.innerHTML = fragments.length
			? fragments.join('')
			: `<p class="empty-state">No words match “${escapeHtml(state.searchTerm)}”.</p>`;
	}

	function renderStats() {
		const totals = state.words.reduce(
			(acc, word) => {
				const studied = word.right + word.wrong;
				acc.studied += studied;
				acc.correct += word.right;
				return acc;
			},
			{ studied: 0, correct: 0 },
		);

		elements.statTotal.textContent = totals.studied.toString();
		const percent = totals.studied ? Math.round((totals.correct / totals.studied) * 100) : 0;
		elements.statPercent.textContent = `${percent}%`;
		elements.statPercent.style.color = getPercentColor(percent);
		elements.statDeck.textContent = state.deck.length.toString();
	}

	function getWordStats(word) {
		const studied = word.right + word.wrong;
		const accuracy = studied ? Math.round((word.right / studied) * 100) : 0;
		return { studied, accuracy };
	}

	function getPercentColor(percent) {
		const clamped = Math.max(0, Math.min(100, percent));
		if (Number.isNaN(clamped)) {
			return '#475569';
		}
		if (clamped <= 50) {
			return interpolateColor('#ef4444', '#f97316', clamped / 50 || 0);
		}
		return interpolateColor('#f97316', '#10b981', (clamped - 50) / 50 || 0);
	}

	function interpolateColor(startHex, endHex, t) {
		const start = hexToRgb(startHex);
		const end = hexToRgb(endHex);
		const ratio = Math.max(0, Math.min(1, t));
		const r = Math.round(start.r + (end.r - start.r) * ratio);
		const g = Math.round(start.g + (end.g - start.g) * ratio);
		const b = Math.round(start.b + (end.b - start.b) * ratio);
		return `rgb(${r}, ${g}, ${b})`;
	}

	function hexToRgb(hex) {
		let value = hex.replace('#', '');
		if (value.length === 3) {
			value = value
				.split('')
				.map((char) => char + char)
				.join('');
		}
		const int = parseInt(value, 16);
		return {
			r: (int >> 16) & 255,
			g: (int >> 8) & 255,
			b: int & 255,
		};
	}

	function exportProgress() {
		const payload = JSON.stringify({ words: state.words, settings: state.settings }, null, 2);
		const blob = new Blob([payload], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'sat-vocab-progress.json';
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	}

	function resetProgress() {
		if (!confirm('Reset all saved progress, notes, and stats?')) return;
		localStorage.removeItem(STORAGE_KEY);
		hydrateFromStorage();
		applySettingsToUI();
		rebuildDeck({ keepCurrent: false });
		renderList();
		renderCard();
		renderStats();
	}

	function scheduleSave() {
		if (saveScheduler.timer) {
			window.clearTimeout(saveScheduler.timer);
		}
		saveScheduler.timer = window.setTimeout(saveState, 250);
	}

	function saveState() {
		saveScheduler.timer = null;
		const payload = {
			words: state.words,
			settings: state.settings,
			savedAt: Date.now(),
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch (error) {
			console.warn('Unable to save progress:', error);
		}
	}

	function mergeWordLists(baseWords, storedWords) {
		const map = new Map();

		storedWords.forEach((word) => {
			if (!word || !word.word) return;
			map.set(word.word.toLowerCase(), word);
		});

		baseWords.forEach((word) => {
			if (!word || !word.word) return;
			const key = word.word.toLowerCase();
			if (map.has(key)) {
				const existing = map.get(key);
				map.set(key, { ...word, ...existing });
			} else {
				map.set(key, { ...word });
			}
		});

		return Array.from(map.values());
	}

	function normalizeWord(word) {
		const mwLink = word.mwLink || buildMwLink(word.word);
		return {
			word: word.word,
			partOfSpeech: word.partOfSpeech || '',
			definition: word.definition || '',
			pronunciation: word.pronunciation || '',
			mwLink,
			enabled: typeof word.enabled === 'boolean' ? word.enabled : true,
			review: Boolean(word.review),
			notes: word.notes || '',
			right: Number.isFinite(word.right) ? word.right : 0,
			wrong: Number.isFinite(word.wrong) ? word.wrong : 0,
			custom: Boolean(word.custom),
			addedAt: word.addedAt || Date.now(),
			lastStudied: word.lastStudied || null,
		};
	}

	function shuffle(array) {
		for (let i = array.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function buildMwLink(word) {
		return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(String(word || '').toLowerCase())}`;
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function safeParse(value) {
		if (!value) return null;
		try {
			return JSON.parse(value);
		} catch (error) {
			console.warn('Failed to parse saved progress:', error);
			return null;
		}
	}

	function notify(message) {
		if (!message) return;
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification(message);
			return;
		}
		// fallback
		console.info(message);
	}
})();