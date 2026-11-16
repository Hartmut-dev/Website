// Shared page script (kept out of the HTML so the Content-Security-Policy can forbid inline scripts).

// Copyright year in the footer.
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Blog: roadmap show/hide toggle.
const roadmapBtn = document.getElementById('roadmapBtn');
const roadmapContent = document.getElementById('roadmapContent');
const roadmapArrow = document.getElementById('roadmapArrow');
if (roadmapBtn && roadmapContent && roadmapArrow) {
    roadmapBtn.addEventListener('click', () => {
        const isVisible = roadmapContent.style.display === 'block';
        roadmapContent.style.display = isVisible ? 'none' : 'block';
        roadmapArrow.textContent = isVisible ? '▼' : '▲';
    });
}
