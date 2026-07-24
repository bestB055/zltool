(function () {
    const markdownPath = 'recent-updates.md';

    function createWidget() {
        if (document.querySelector('.recent-updates-widget')) return;

        const widget = document.createElement('div');
        widget.className = 'recent-updates-widget';
        widget.innerHTML = `
            <button class="recent-updates-button" type="button" title="查看最近更新说明">最近更新</button>
        `;

        const button = widget.querySelector('.recent-updates-button');
        button.addEventListener('click', () => {
            window.open(markdownPath, '_blank', 'noopener');
        });

        document.body.appendChild(widget);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
