(function () {
    const markdownPath = 'recent-updates.md';

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderInline(value) {
        return escapeHtml(value)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }

    function renderMarkdown(markdown) {
        const lines = markdown.split(/\r?\n/);
        const html = [];
        let inList = false;

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                return;
            }

            const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
            if (heading) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
                return;
            }

            const listItem = trimmed.match(/^[-*]\s+(.+)$/);
            if (listItem) {
                if (!inList) {
                    html.push('<ul>');
                    inList = true;
                }
                html.push(`<li>${renderInline(listItem[1])}</li>`);
                return;
            }

            if (inList) {
                html.push('</ul>');
                inList = false;
            }
            html.push(`<p>${renderInline(trimmed)}</p>`);
        });

        if (inList) html.push('</ul>');
        return html.join('');
    }

    function createWidget() {
        if (document.querySelector('.recent-updates-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'recent-updates-widget';
        widget.innerHTML = `
            <button class="recent-updates-button" type="button" aria-expanded="false">最近更新</button>
            <div class="recent-updates-panel" role="dialog" aria-label="最近更新说明">
                <div class="recent-updates-content">悬停后加载最近更新...</div>
            </div>
        `;

        const button = widget.querySelector('.recent-updates-button');
        const content = widget.querySelector('.recent-updates-content');
        let loaded = false;

        async function loadUpdates() {
            if (loaded) return;
            loaded = true;
            try {
                const response = await fetch(markdownPath, { cache: 'no-store' });
                if (!response.ok) throw new Error('load failed');
                const markdown = await response.text();
                content.innerHTML = renderMarkdown(markdown.trim() || '# 最近更新\n\n暂无更新说明。');
            } catch (error) {
                content.textContent = '最近更新加载失败，请确认 recent-updates.md 文件存在，并通过本地服务器访问页面。';
            }
        }

        widget.addEventListener('mouseenter', loadUpdates);
        widget.addEventListener('focusin', loadUpdates);
        button.addEventListener('click', () => {
            widget.classList.toggle('open');
            button.setAttribute('aria-expanded', widget.classList.contains('open') ? 'true' : 'false');
            loadUpdates();
        });
        document.addEventListener('click', (event) => {
            if (!widget.contains(event.target)) {
                widget.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
            }
        });

        document.body.appendChild(widget);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
