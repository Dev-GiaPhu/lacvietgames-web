(() => {
  let attempts = 0;
  const addLink = () => {
    const nav = document.querySelector('.main-nav');
    if (!nav) {
      if (++attempts < 40) setTimeout(addLink, 100);
      return;
    }
    if (nav.querySelector('[data-lvg-tasks-link]')) return;
    const link = document.createElement('a');
    link.href = './tasks.html';
    link.dataset.lvgTasksLink = '1';
    link.textContent = 'Nhiệm vụ & Sự kiện';
    if (document.body.dataset.page === 'tasks') link.classList.add('active');
    nav.appendChild(link);
  };
  addLink();
})();