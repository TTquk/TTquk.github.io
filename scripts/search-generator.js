/**
 * 站内搜索索引生成器
 *
 * 构建时扫描全部文章，输出 /search.json 供右上角搜索框使用
 * （前端逻辑见 themes/kira/source/js/kira-search.js）。
 *
 * 可在 _config.yml 中调整：
 *   search_json:
 *     content_limit: 3000   # 每篇文章收录的正文字符数，0 表示不限制
 */
'use strict';

const DEFAULT_CONTENT_LIMIT = 3000;

function decodeEntities(text) {
	return text
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (match, code) => String.fromCharCode(Number(code)))
		.replace(/&amp;/g, '&');
}

/** 把渲染后的 HTML 转成用于检索的纯文本 */
function stripHtml(html) {
	return decodeEntities(
		String(html || '')
			// 代码块、脚本、样式只保留标题文字，避免污染摘要
			.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
			.replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<[^>]*>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

function namesOf(collection) {
	if (!collection) return [];
	if (typeof collection.toArray === 'function') {
		return collection.toArray().map((item) => String(item.name || ''));
	}
	if (Array.isArray(collection)) {
		return collection.map((item) => String(item.name || item));
	}
	return [];
}

hexo.extend.generator.register('search_json', function (locals) {
	const options = hexo.config.search_json || {};
	const contentLimit =
		options.content_limit === undefined ? DEFAULT_CONTENT_LIMIT : Number(options.content_limit);
	const root = hexo.config.root || '/';

	const posts = [];

	locals.posts.sort('-date').each(function (post) {
		const plain = stripHtml(post.content);
		const text = contentLimit > 0 ? plain.slice(0, contentLimit) : plain;

		posts.push({
			title: String(post.title || ''),
			// trailing_index 为 true 时 post.path 形如 xxx/index.html
			url: root + String(post.path || '').replace(/index\.html$/, ''),
			date: post.date ? post.date.format('YYYY-MM-DD') : '',
			categories: namesOf(post.categories),
			tags: namesOf(post.tags),
			text: text
		});
	});

	return {
		path: 'search.json',
		data: JSON.stringify({
			generated: new Date().toISOString(),
			total: posts.length,
			posts: posts
		})
	};
});
