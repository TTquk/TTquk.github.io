/**
 * Kira 亮暗色切换
 *
 * 主题状态由 <html data-theme="dark|light"> 控制：
 * - 存储在 localStorage（key: kira-color-scheme）
 * - 未手动选择过时跟随系统 prefers-color-scheme
 * - 首屏防闪烁逻辑写在 themes/kira/layout/layout.ejs 的 head 内联脚本里
 * 具体配色见 source/style.css 末尾的 [data-theme='dark'] 区块。
 */
(function () {
	'use strict';

	var STORAGE_KEY = 'kira-color-scheme';
	var root = document.documentElement;

	function readStored() {
		try {
			var value = localStorage.getItem(STORAGE_KEY);
			return value === 'dark' || value === 'light' ? value : null;
		} catch (error) {
			return null;
		}
	}

	function writeStored(scheme) {
		try {
			localStorage.setItem(STORAGE_KEY, scheme);
		} catch (error) {
			/* 隐私模式下 localStorage 不可用，忽略 */
		}
	}

	function systemScheme() {
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
	}

	function currentScheme() {
		return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
	}

	/** 第三方组件（评论、播放器）不会自动跟随本站配色，需要手动同步 */
	function syncEmbedded(scheme) {
		var frame = document.querySelector('iframe.giscus-frame');
		if (frame && frame.contentWindow) {
			frame.contentWindow.postMessage(
				{ giscus: { setConfig: { theme: scheme === 'dark' ? 'dark' : 'light' } } },
				'https://giscus.app'
			);
		}
	}

	function updateButton(scheme) {
		var button = document.querySelector('.kira-theme-toggle');
		if (!button) return;
		var label = scheme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
		button.setAttribute('aria-label', label);
		button.setAttribute('title', label + '（Ctrl + J）');
		button.setAttribute('aria-pressed', scheme === 'dark' ? 'true' : 'false');
	}

	function apply(scheme, persist) {
		root.setAttribute('data-theme', scheme);
		if (persist) writeStored(scheme);
		updateButton(scheme);
		syncEmbedded(scheme);
	}

	function toggle() {
		apply(currentScheme() === 'dark' ? 'light' : 'dark', true);
	}

	function init() {
		// 页面可能在 head 脚本之后、本脚本之前被改回系统值，这里以属性为准
		apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);

		var button = document.querySelector('.kira-theme-toggle');
		if (button) {
			button.addEventListener('click', function (event) {
				event.preventDefault();
				toggle();
			});
		}

		// 用户没手动选过时，跟随系统切换
		if (window.matchMedia) {
			var query = window.matchMedia('(prefers-color-scheme: dark)');
			var onSystemChange = function (event) {
				if (readStored()) return;
				apply(event.matches ? 'dark' : 'light', false);
			};
			if (query.addEventListener) query.addEventListener('change', onSystemChange);
			else if (query.addListener) query.addListener(onSystemChange);
		}

		document.addEventListener('keydown', function (event) {
			if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'j') {
				event.preventDefault();
				toggle();
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
