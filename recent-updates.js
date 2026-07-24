(function () {
    const markdownPath = 'recent-updates.md';
    const btn = document.querySelector('.recent-updates-button');
    if (!btn) return;

    const widget = document.createElement('div');
    widget.className = 'recent-updates-widget';
    btn.parentNode.insertBefore(widget, btn);
    widget.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'recent-updates-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '最近更新说明');
    panel.innerHTML = '<div class="recent-updates-content">加载中...</div>';
    widget.appendChild(panel);

    const content = panel.querySelector('.recent-updates-content');
    let loaded = false;

    async function loadUpdates() {
        if (loaded) return;
        loaded = true;
        try {
            const response = await fetch(markdownPath, { cache: 'no-store' });
            if (!response.ok) throw new Error('load failed');
            const md = await response.text();
            const lines = md.split(/\r?\n/);
            const html = [];
            let inList = false;
            lines.forEach(function (line) {
                var t = line.trim();
                if (!t) { if (inList) { html.push('</ul>'); inList = false; } return; }
                var h = t.match(/^(#{1,3})\s+(.+)$/);
                if (h) { if (inList) { html.push('</ul>'); inList = false; } html.push('<h' + h[1].length + '>' + esc(h[2]) + '</h' + h[1].length + '>'); return; }
                var li = t.match(/^[-*]\s+(.+)$/);
                if (li) { if (!inList) { html.push('<ul>'); inList = true; } html.push('<li>' + esc(li[1]) + '</li>'); return; }
                if (inList) { html.push('</ul>'); inList = false; }
                html.push('<p>' + esc(t) + '</p>');
            });
            if (inList) html.push('</ul>');
            content.innerHTML = html.join('') || '<p>暂无更新说明。</p>';
        } catch (e) {
            content.textContent = '最近更新加载失败，请确认 recent-updates.md 文件存在，并通过本地服务器访问页面。';
        }
    }

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    widget.addEventListener('mouseenter', loadUpdates);
    widget.addEventListener('focusin', loadUpdates);
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        widget.classList.toggle('open');
        loadUpdates();
    });
    document.addEventListener('click', function (e) {
        if (!widget.contains(e.target)) widget.classList.remove('open');
    });
})();