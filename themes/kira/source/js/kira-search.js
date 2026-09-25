/**
 * Kira 站内搜索（右上角搜索框）
 *
 * 数据源：/search.json，由站点根目录 scripts/search-generator.js 生成。
 * 匹配策略：查询按空白拆分，中文长词额外拆出 2-gram 兜底，
 *         标题 / 分类标签 / 正文加权打分后排序，浏览器本地完成，无需服务端。
 */
(function () {
	'use strict';

	var MAX_RESULTS = 10;
	var PRIMARY_WEIGHT = 1;
	var PARTIAL_WEIGHT = 0.35;
	var CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

	var root;
	var toggle;
	var panel;
	var input;
	var closeButton;
	var statusEl;
	var resultsEl;
	var indexUrl;

	var posts = null;
	var indexPromise = null;
	var debounceTimer = null;
	var activeIndex = -1;
	var currentItems = [];

	function escapeHtml(value) {
		return String(value === null || value === undefined ? '' : value).replace(
			/[&<>"']/g,
			function (char) {
				return {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;'
				}[char];
			}
		);
	}

	function escapeRegExp(value) {
		return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/** 先转义再插入 <mark>，避免文章内容被当作 HTML 执行 */
	function highlight(raw, terms) {
		var text = String(raw === null || raw === undefined ? '' : raw);
		var list = (terms || []).filter(function (term) {
			return term;
		});
		if (!list.length) return escapeHtml(text);

		var pattern = new RegExp('(' + list.map(escapeRegExp).join('|') + ')', 'gi');
		return text
			.split(pattern)
			.map(function (part, index) {
				if (index % 2 === 1) return '<mark>' + escapeHtml(part) + '</mark>';
				return escapeHtml(part);
			})
			.join('');
	}

	/** 拆分查询词：原词为高权重词，中文长词额外补充 2-gram 低权重词 */
	function tokenize(query) {
		var normalized = String(query || '')
			.trim()
			.toLowerCase();
		if (!normalized) return { primary: [], all: [] };

		var primary = [];
		normalized.split(/[\s,，、;；]+/).forEach(function (token) {
			if (token && primary.indexOf(token) === -1) primary.push(token);
		});

		var all = primary.slice();
		primary.forEach(function (token) {
			if (token.length >= 4 && CJK_RE.test(token)) {
				for (var i = 0; i + 2 <= token.length; i++) {
					var gram = token.slice(i, i + 2);
					if (all.indexOf(gram) === -1) all.push(gram);
				}
			}
		});

		return { primary: primary, all: all };
	}

	function scorePost(post, tokens) {
		var title = String(post.title || '').toLowerCase();
		var meta = (
			(post.categories || []).join(' ') +
			' ' +
			(post.tags || []).join(' ')
		).toLowerCase();
		var text = String(post.text || '').toLowerCase();

		var score = 0;
		var matched = false;
		var hitTerm = null;

		tokens.all.forEach(function (term) {
			var weight = tokens.primary.indexOf(term) > -1 ? PRIMARY_WEIGHT : PARTIAL_WEIGHT;
			var termScore = 0;

			var titleIndex = title.indexOf(term);
			if (titleIndex === 0) termScore += 40;
			else if (titleIndex > -1) termScore += 28;

			if (meta.indexOf(term) > -1) termScore += 16;

			var occurrences = 0;
			var from = 0;
			var at = text.indexOf(term, from);
			while (at > -1 && occurrences < 8) {
				occurrences++;
				from = at + term.length;
				at = text.indexOf(term, from);
			}
			if (occurrences > 0) termScore += 5 + Math.min(occurrences, 5) * 2;

			if (termScore > 0) {
				matched = true;
				if (!hitTerm) hitTerm = term;
				score += termScore * weight;
			}
		});

		return matched ? { score: score, term: hitTerm } : null;
	}

	function buildExcerpt(post, term) {
		var text = String(post.text || '');
		if (!text) return '';

		var index = term ? text.toLowerCase().indexOf(term) : -1;
		if (index < 0) return text.slice(0, 90) + (text.length > 90 ? '…' : '');

		var start = Math.max(0, index - 30);
		var end = Math.min(text.length, index + 80);
		return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
	}

	function syncActive() {
		var items = resultsEl.querySelectorAll('.kira-search-item');
		Array.prototype.forEach.call(items, function (element, index) {
			if (index === activeIndex) {
				element.classList.add('active');
				if (element.scrollIntoView) element.scrollIntoView({ block: 'nearest' });
			} else {
				element.classList.remove('active');
			}
		});
	}

	function render() {
		var query = input.value;
		var tokens = tokenize(query);

		if (!tokens.primary.length) {
			currentItems = [];
			activeIndex = -1;
			statusEl.textContent = posts
				? '共 ' + posts.length + ' 篇文章，输入关键词开始搜索'
				: '正在加载索引…';
			resultsEl.innerHTML = '';
			return;
		}

		var matched = [];
		(posts || []).forEach(function (post) {
			var result = scorePost(post, tokens);
			if (result) matched.push({ post: post, score: result.score, term: result.term });
		});

		matched.sort(function (a, b) {
			if (b.score !== a.score) return b.score - a.score;
			return String(b.post.date).localeCompare(String(a.post.date));
		});

		currentItems = matched.slice(0, MAX_RESULTS);
		activeIndex = currentItems.length ? 0 : -1;

		if (!currentItems.length) {
			statusEl.textContent = '没有找到与「' + query.trim() + '」相关的文章';
			resultsEl.innerHTML = '';
			return;
		}

		statusEl.textContent =
			matched.length > MAX_RESULTS
				? '找到 ' + matched.length + ' 篇，显示前 ' + MAX_RESULTS + ' 篇'
				: '找到 ' + matched.length + ' 篇文章';

		resultsEl.innerHTML = currentItems
			.map(function (item, index) {
				var post = item.post;
				var metaParts = [];
				if (post.date) metaParts.push(post.date);
				if (post.categories && post.categories.length) metaParts.push(post.categories.join(' / '));

				return (
					'<a class="kira-search-item' +
					(index === activeIndex ? ' active' : '') +
					'" href="' +
					escapeHtml(post.url) +
					'" data-index="' +
					index +
					'">' +
					'<div class="kira-search-item-title">' +
					highlight(post.title, tokens.all) +
					'</div>' +
					'<div class="kira-search-item-excerpt">' +
					highlight(buildExcerpt(post, item.term), tokens.all) +
					'</div>' +
					(metaParts.length
						? '<div class="kira-search-item-meta">' +
						  escapeHtml(metaParts.join(' · ')) +
						  '</div>'
						: '') +
					'</a>'
				);
			})
			.join('');
	}

	function ensureIndex() {
		if (indexPromise) return indexPromise;

		statusEl.textContent = '正在加载索引…';
		indexPromise = fetch(indexUrl, { credentials: 'same-origin' })
			.then(function (response) {
				if (!response.ok) throw new Error('HTTP ' + response.status);
				return response.json();
			})
			.then(function (data) {
				posts = (data && data.posts) || [];
				return posts;
			})
			.catch(function (error) {
				posts = [];
				statusEl.textContent = '索引加载失败，请刷新页面后重试';
				console.error('[kira-search] 无法加载搜索索引 ' + indexUrl, error);
				return posts;
			});

		return indexPromise;
	}

	function openPanel() {
		root.classList.add('open');
		panel.setAttribute('aria-hidden', 'false');
		ensureIndex().then(render);
		input.focus();
		if (input.value) input.select();
	}

	function closePanel() {
		if (!root.classList.contains('open')) return;
		root.classList.remove('open');
		panel.setAttribute('aria-hidden', 'true');
		activeIndex = -1;
	}

	function moveActive(delta) {
		if (!currentItems.length) return;
		activeIndex = (activeIndex + delta + currentItems.length) % currentItems.length;
		syncActive();
	}

	function bindEvents() {
		toggle.addEventListener('click', function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (root.classList.contains('open')) closePanel();
			else openPanel();
		});

		closeButton.addEventListener('click', function (event) {
			event.preventDefault();
			event.stopPropagation();
			closePanel();
		});

		input.addEventListener('input', function () {
			window.clearTimeout(debounceTimer);
			debounceTimer = window.setTimeout(render, 120);
		});

		input.addEventListener('keydown', function (event) {
			if (event.key === 'Enter') {
				var target = currentItems[activeIndex >= 0 ? activeIndex : 0];
				if (target) {
					event.preventDefault();
					window.location.href = target.post.url;
				}
			}
		});

		resultsEl.addEventListener('mouseover', function (event) {
			var item = event.target.closest ? event.target.closest('.kira-search-item') : null;
			if (!item) return;
			var index = Number(item.getAttribute('data-index'));
			if (!isNaN(index) && index !== activeIndex) {
				activeIndex = index;
				syncActive();
			}
		});

		resultsEl.addEventListener('click', function (event) {
			// 点击结果项后收起面板，返回本站时状态干净
			if (event.target.closest && event.target.closest('.kira-search-item')) closePanel();
		});

		document.addEventListener('click', function (event) {
			if (!root.contains(event.target)) closePanel();
		});

		document.addEventListener('keydown', function (event) {
			var key = event.key;

			if ((event.ctrlKey || event.metaKey) && String(key).toLowerCase() === 'k') {
				event.preventDefault();
				openPanel();
				return;
			}

			if (!root.classList.contains('open')) return;

			if (key === 'Escape') {
				closePanel();
				if (document.activeElement === input) input.blur();
			} else if (key === 'ArrowDown') {
				event.preventDefault();
				moveActive(1);
			} else if (key === 'ArrowUp') {
				event.preventDefault();
				moveActive(-1);
			}
		});
	}

	function init() {
		root = document.getElementById('kira-search');
		if (!root) return;

		toggle = root.querySelector('.kira-search-toggle');
		panel = root.querySelector('.kira-search-panel');
		input = root.querySelector('.kira-search-input');
		closeButton = root.querySelector('.kira-search-close');
		statusEl = root.querySelector('.kira-search-status');
		resultsEl = root.querySelector('.kira-search-results');
		indexUrl = root.getAttribute('data-index') || '/search.json';

		if (!toggle || !panel || !input) return;

		bindEvents();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
