(() => {
  const config = window.DASHBOARD_CONFIG;
  const state = {
    stories: [],
    filteredStories: [],
    sourceHealth: [],
    lastUpdated: null,
    degraded: false,
    watchlist: loadWatchlist(),
    filters: loadFilters()
  };

  const els = {
    globalSearch: document.getElementById('globalSearch'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportExecutiveBtn: document.getElementById('exportExecutiveBtn'),
    regionFilter: document.getElementById('regionFilter'),
    topicFilter: document.getElementById('topicFilter'),
    impactFilter: document.getElementById('impactFilter'),
    sourceTypeFilter: document.getElementById('sourceTypeFilter'),
    timeFilter: document.getElementById('timeFilter'),
    layoutMode: document.getElementById('layoutMode'),
    lastUpdated: document.getElementById('lastUpdated'),
    storyCount: document.getElementById('storyCount'),
    sourceCount: document.getElementById('sourceCount'),
    sourceFailedCount: document.getElementById('sourceFailedCount'),
    watchlistCount: document.getElementById('watchlistCount'),
    statusBanner: document.getElementById('statusBanner'),
    dashboard: document.getElementById('dashboard'),
    executivePulse: document.getElementById('executivePulse'),
    topicRadar: document.getElementById('topicRadar'),
    agencyMoves: document.getElementById('agencyMoves'),
    platformChanges: document.getElementById('platformChanges'),
    aiInnovation: document.getElementById('aiInnovation'),
    regulationDesk: document.getElementById('regulationDesk'),
    creativeIntel: document.getElementById('creativeIntel'),
    menaLens: document.getElementById('menaLens'),
    weeklySummary: document.getElementById('weeklySummary'),
    sourceTransparency: document.getElementById('sourceTransparency'),
    watchlistInput: document.getElementById('watchlistInput'),
    addWatchlistBtn: document.getElementById('addWatchlistBtn'),
    watchlistTags: document.getElementById('watchlistTags'),
    watchlistStories: document.getElementById('watchlistStories'),
    drawer: document.getElementById('drawer'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    drawerClose: document.getElementById('drawerClose'),
    drawerEyebrow: document.getElementById('drawerEyebrow'),
    drawerTitle: document.getElementById('drawerTitle'),
    drawerBody: document.getElementById('drawerBody')
  };

  function loadWatchlist() {
    const seed = config.watchlistSeed || [];
    try {
      const raw = localStorage.getItem('adintel-watchlist-v2');
      return raw ? JSON.parse(raw) : seed;
    } catch {
      return seed;
    }
  }

  function saveWatchlist() {
    localStorage.setItem('adintel-watchlist-v2', JSON.stringify(state.watchlist));
  }

  function loadFilters() {
    try {
      const raw = localStorage.getItem('adintel-filters-v2');
      return raw ? { ...config.defaultFilters, ...JSON.parse(raw) } : { ...config.defaultFilters };
    } catch {
      return { ...config.defaultFilters };
    }
  }

  function saveFilters() {
    localStorage.setItem('adintel-filters-v2', JSON.stringify(state.filters));
  }

  function populateSelect(select, options) {
    select.innerHTML = options.map((option) => {
      if (typeof option === 'string') return `<option value="${option}">${option}</option>`;
      return `<option value="${option.value}">${option.label}</option>`;
    }).join('');
  }

  function initControls() {
    populateSelect(els.regionFilter, config.options.regions);
    populateSelect(els.topicFilter, config.options.topics);
    populateSelect(els.impactFilter, config.options.impact);
    populateSelect(els.sourceTypeFilter, config.options.sourceTypes);
    populateSelect(els.timeFilter, config.options.timeWindow);
    populateSelect(els.layoutMode, config.options.layoutModes);

    els.regionFilter.value = state.filters.region;
    els.topicFilter.value = state.filters.topic;
    els.impactFilter.value = state.filters.impact;
    els.sourceTypeFilter.value = state.filters.sourceType;
    els.timeFilter.value = state.filters.timeWindow;
    els.layoutMode.value = state.filters.layoutMode;
    els.globalSearch.value = state.filters.search;

    [['regionFilter', 'region'], ['topicFilter', 'topic'], ['impactFilter', 'impact'], ['sourceTypeFilter', 'sourceType'], ['timeFilter', 'timeWindow'], ['layoutMode', 'layoutMode']]
      .forEach(([elKey, filterKey]) => {
        els[elKey].addEventListener('change', () => {
          state.filters[filterKey] = els[elKey].value;
          saveFilters();
          applyFiltersAndRender();
        });
      });

    els.globalSearch.addEventListener('input', () => {
      state.filters.search = els.globalSearch.value.trim();
      saveFilters();
      applyFiltersAndRender();
    });

    els.refreshBtn.addEventListener('click', fetchData);
    els.exportExecutiveBtn.addEventListener('click', exportExecutivePulse);

    els.addWatchlistBtn.addEventListener('click', addWatchTerm);
    els.watchlistInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addWatchTerm();
    });

    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);
  }

  async function fetchData() {
    showBanner('Loading live sources...', 'warn');
    try {
      const response = await fetch(`${config.apiEndpoint}?window=${encodeURIComponent(state.filters.timeWindow)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      const incomingStories = Array.isArray(data.stories) ? data.stories : [];
      state.sourceHealth = Array.isArray(data.sourceHealth) ? data.sourceHealth : [];
      state.lastUpdated = data.generatedAt || new Date().toISOString();

      if (!incomingStories.length) {
        if (!config.enableLocalFallback) throw new Error('No live stories returned');
        state.stories = config.localFallbackStories;
        state.degraded = true;
        showBanner('No live stories were returned. Local fallback mode is active.', 'bad');
      } else {
        state.stories = incomingStories;
        const liveSucceeded = state.sourceHealth.filter((source) => source.status === 'ok').length;
        const liveFailed = state.sourceHealth.filter((source) => source.status !== 'ok').length;
        state.degraded = liveSucceeded === 0;
        if (liveFailed > 0) {
          showBanner(`${liveSucceeded} sources succeeded and ${liveFailed} failed. The dashboard is live but partially degraded.`, 'warn');
        } else {
          hideBanner();
        }
      }
    } catch (error) {
      state.stories = config.localFallbackStories;
      state.sourceHealth = [];
      state.lastUpdated = new Date().toISOString();
      state.degraded = true;
      showBanner(`Live fetch failed: ${error.message}. Local fallback mode is active.`, 'bad');
    }
    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    const now = Date.now();
    const timeCutoff = getCutoffMs(state.filters.timeWindow, now);
    state.filteredStories = state.stories
      .filter((story) => !state.filters.region || state.filters.region === 'All' || story.region === state.filters.region)
      .filter((story) => !state.filters.topic || state.filters.topic === 'All' || story.topic === state.filters.topic)
      .filter((story) => !state.filters.impact || state.filters.impact === 'All' || story.impact === state.filters.impact)
      .filter((story) => !state.filters.sourceType || state.filters.sourceType === 'All' || story.sourceType === state.filters.sourceType)
      .filter((story) => !timeCutoff || new Date(story.publishedAt).getTime() >= timeCutoff)
      .filter((story) => {
        const term = state.filters.search.toLowerCase();
        if (!term) return true;
        return [story.title, story.summary, story.source, story.topic, story.region, ...(story.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => scoreStory(b) - scoreStory(a));

    renderMeta();
    renderExecutivePulse();
    renderTopicRadar();
    renderAgencyMoves();
    renderPlatformChanges();
    renderAIInnovation();
    renderRegulationDesk();
    renderCreativeIntel();
    renderMenaLens();
    renderWeeklySummary();
    renderSourceTransparency();
    renderWatchlist();
    updateLayout();
  }

  function getCutoffMs(windowKey, now) {
    if (windowKey === '24h') return now - 24 * 60 * 60 * 1000;
    if (windowKey === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (windowKey === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    return null;
  }

  function scoreStory(story) {
    const published = new Date(story.publishedAt).getTime();
    const ageHours = Math.max(1, (Date.now() - published) / 36e5);
    const recency = 72 / ageHours;
    const impact = story.impact === 'High' ? 18 : story.impact === 'Medium' ? 10 : 5;
    const sourceType = story.sourceType === 'Official' || story.sourceType === 'Industry Body' ? 10 : 6;
    const mena = ['MENA', 'GCC', 'UAE', 'Saudi', 'Qatar', 'Egypt'].includes(story.region) ? 3 : 0;
    return recency + impact + sourceType + mena;
  }

  function renderMeta() {
    const succeeded = state.sourceHealth.filter((source) => source.status === 'ok').length;
    const failed = state.sourceHealth.filter((source) => source.status !== 'ok').length;
    els.lastUpdated.textContent = formatDate(state.lastUpdated);
    els.storyCount.textContent = String(state.filteredStories.length);
    els.sourceCount.textContent = String(succeeded);
    els.sourceFailedCount.textContent = String(failed);
    els.watchlistCount.textContent = String(state.watchlist.length);
  }

  function renderExecutivePulse() {
    renderCards(els.executivePulse, state.filteredStories.slice(0, 5));
  }

  function renderTopicRadar() {
    const groups = groupBy(state.filteredStories, 'topic');
    const cards = Object.entries(groups).slice(0, 10).map(([topic, stories]) => {
      const topSources = [...new Set(stories.map((story) => story.source))].slice(0, 3).join(', ');
      return `
        <article class="topic-card">
          <h3>${escapeHtml(topic)}</h3>
          <p class="story-summary">${escapeHtml(stories[0]?.summary || 'No summary')}</p>
          <div class="metric-row"><span>${stories.length} stories</span><span>${topSources || 'Mixed sources'}</span></div>
        </article>
      `;
    });
    els.topicRadar.innerHTML = cards.length ? cards.join('') : emptyState('No topic data for the current filters.');
  }

  function renderAgencyMoves() {
    const stories = state.filteredStories.filter((story) => story.topic === 'Agency World').slice(0, 8);
    els.agencyMoves.innerHTML = stories.length ? `
      <table>
        <thead><tr><th>Headline</th><th>Source</th><th>Region</th><th>Impact</th></tr></thead>
        <tbody>
          ${stories.map((story) => `
            <tr>
              <td><a href="${story.link}" target="_blank" rel="noreferrer">${escapeHtml(story.title)}</a></td>
              <td>${escapeHtml(story.source)}</td>
              <td>${escapeHtml(story.region)}</td>
              <td>${badge(story.impact)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : emptyState('No agency or account-move stories matched the current filters.');
  }

  function renderPlatformChanges() {
    const stories = state.filteredStories.filter((story) => ['Media & Platforms', 'Search / Social / Video / CTV'].includes(story.topic)).slice(0, 8);
    els.platformChanges.innerHTML = stories.length ? stories.map((story) => `
      <article class="timeline-item">
        <div class="story-meta-top"><span class="badge">${escapeHtml(story.source)}</span>${badge(story.impact)}</div>
        <h4>${escapeHtml(story.title)}</h4>
        <p class="story-summary">${escapeHtml(story.summary)}</p>
        <div class="story-footer"><span>${formatDate(story.publishedAt)}</span></div>
      </article>
    `).join('') : emptyState('No platform-change items matched the current filters.');
  }

  function renderAIInnovation() {
    renderCards(els.aiInnovation, state.filteredStories.filter((story) => story.topic === 'AI in Advertising').slice(0, 4));
  }

  function renderRegulationDesk() {
    renderCards(els.regulationDesk, state.filteredStories.filter((story) => ['Privacy & Regulation', 'Measurement & Attribution'].includes(story.topic)).slice(0, 4));
  }

  function renderCreativeIntel() {
    renderCards(els.creativeIntel, state.filteredStories.filter((story) => story.topic === 'Creative & Campaigns').slice(0, 6));
  }

  function renderMenaLens() {
    const regionalStories = state.filteredStories.filter((story) => ['MENA', 'GCC', 'UAE', 'Saudi', 'Qatar', 'Egypt'].includes(story.region) || story.topic === 'MENA Market Moves').slice(0, 4);
    renderCards(els.menaLens, regionalStories);
  }

  function renderWeeklySummary() {
    const top = state.filteredStories.slice(0, 6);
    const points = [];
    if (state.degraded) points.push('Dashboard is currently running in degraded mode. Review source health before trusting completeness.');
    if (top[0]) points.push(`The strongest current signal is: ${top[0].title}.`);
    const sourceMix = [...new Set(top.map((story) => story.source))].slice(0, 4).join(', ');
    if (sourceMix) points.push(`Current top stories are being driven by: ${sourceMix}.`);
    const topics = Object.entries(groupBy(top, 'topic')).sort((a, b) => b[1].length - a[1].length);
    if (topics[0]) points.push(`The most active topic in the filtered view is ${topics[0][0]}.`);
    if (state.filteredStories.some((story) => ['MENA', 'GCC', 'UAE', 'Saudi'].includes(story.region))) {
      points.push('Regional signal is present in the current view, which matters because global trade coverage often drowns out local relevance.');
    }
    points.push('Use this module as synthesis only. The linked source cards remain the ground truth.');
    els.weeklySummary.innerHTML = `<ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;
  }

  function renderSourceTransparency() {
    if (!state.sourceHealth.length) {
      els.sourceTransparency.innerHTML = emptyState('No live source health is available. Check that the API route is deployed and returning JSON.');
      return;
    }
    els.sourceTransparency.innerHTML = `
      <table>
        <thead><tr><th>Source</th><th>Status</th><th>Stories</th><th>Type</th><th>Notes</th></tr></thead>
        <tbody>
          ${state.sourceHealth.map((source) => `
            <tr>
              <td><a href="${source.homepage}" target="_blank" rel="noreferrer">${escapeHtml(source.name)}</a></td>
              <td>${badge(source.status === 'ok' ? 'Live' : 'Failed', source.status === 'ok' ? 'good' : 'bad')}</td>
              <td>${source.storyCount || 0}</td>
              <td>${escapeHtml(source.type || '')}</td>
              <td>${escapeHtml(source.note || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderWatchlist() {
    els.watchlistTags.innerHTML = state.watchlist.map((term) => `
      <span class="badge watch-tag">${escapeHtml(term)} <button data-term="${escapeHtml(term)}">✕</button></span>
    `).join('');

    [...els.watchlistTags.querySelectorAll('button[data-term]')].forEach((button) => {
      button.addEventListener('click', () => {
        state.watchlist = state.watchlist.filter((term) => term !== button.dataset.term);
        saveWatchlist();
        renderWatchlist();
        renderMeta();
      });
    });

    const watchStories = state.filteredStories.filter((story) => {
      const haystack = [story.title, story.summary, story.source, ...(story.tags || [])].join(' ').toLowerCase();
      return state.watchlist.some((term) => haystack.includes(term.toLowerCase()));
    }).slice(0, 8);

    els.watchlistStories.innerHTML = watchStories.length ? watchStories.map((story) => `
      <article class="compact-item">
        <h4><a href="${story.link}" target="_blank" rel="noreferrer">${escapeHtml(story.title)}</a></h4>
        <p class="story-summary">${escapeHtml(story.summary)}</p>
        <div class="story-footer"><span>${escapeHtml(story.source)}</span><span>${formatDate(story.publishedAt)}</span></div>
      </article>
    `).join('') : emptyState('No watchlist matches in the current filtered view.');
  }

  function renderCards(container, stories) {
    container.innerHTML = stories.length ? stories.map((story) => `
      <article class="story-card" data-id="${escapeHtml(story.id)}">
        <div class="story-meta-top">
          <span class="badge">${escapeHtml(story.source)}</span>
          <span class="badge">${escapeHtml(story.region)}</span>
          ${badge(story.impact)}
        </div>
        <h3 class="story-title">${escapeHtml(story.title)}</h3>
        <p class="story-summary">${escapeHtml(story.summary)}</p>
        <div class="story-tags">${(story.tags || []).slice(0, 3).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="story-footer"><span>${formatDate(story.publishedAt)}</span></div>
      </article>
    `).join('') : emptyState('No stories matched the current filters.');

    [...container.querySelectorAll('[data-id]')].forEach((card) => {
      card.addEventListener('click', () => {
        const story = state.filteredStories.find((item) => item.id === card.dataset.id) || state.stories.find((item) => item.id === card.dataset.id);
        if (story) openDrawer(story);
      });
    });
  }

  function openDrawer(story) {
    els.drawerEyebrow.textContent = `${story.source} • ${story.topic}`;
    els.drawerTitle.textContent = story.title;
    els.drawerBody.innerHTML = `
      <p>${escapeHtml(story.summary)}</p>
      <p><strong>Why it matters:</strong> ${escapeHtml(story.whyItMatters || 'Not supplied.')}</p>
      <p><strong>Strategic implication:</strong> ${escapeHtml(story.strategicImplication || 'Not supplied.')}</p>
      <p><strong>Region:</strong> ${escapeHtml(story.region)}<br><strong>Published:</strong> ${formatDate(story.publishedAt)}<br><strong>Impact:</strong> ${escapeHtml(story.impact)}</p>
      <p><a href="${story.link}" target="_blank" rel="noreferrer">Open original source</a></p>
    `;
    els.drawer.classList.add('open');
    els.drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.drawer.setAttribute('aria-hidden', 'true');
  }

  function addWatchTerm() {
    const term = els.watchlistInput.value.trim();
    if (!term || state.watchlist.includes(term)) return;
    state.watchlist.push(term);
    els.watchlistInput.value = '';
    saveWatchlist();
    renderWatchlist();
    renderMeta();
  }

  function exportExecutivePulse() {
    const rows = state.filteredStories.slice(0, 5).map((story) => [story.title, story.source, story.region, story.topic, story.impact, story.link]);
    const csv = [['Title', 'Source', 'Region', 'Topic', 'Impact', 'Link'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'executive-pulse.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateLayout() {
    els.dashboard.classList.remove('layout-hybrid', 'layout-executive', 'layout-operator');
    els.dashboard.classList.add(`layout-${state.filters.layoutMode}`);
  }

  function groupBy(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key] || 'Unknown';
      acc[value] = acc[value] || [];
      acc[value].push(item);
      return acc;
    }, {});
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  }

  function badge(text, tone) {
    const safe = escapeHtml(text || 'Unknown');
    return `<span class="badge ${tone || impactTone(text)}">${safe}</span>`;
  }

  function impactTone(text) {
    if (text === 'High') return 'bad';
    if (text === 'Medium') return 'warn';
    if (text === 'Live') return 'good';
    if (text === 'Failed') return 'bad';
    return '';
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function showBanner(message, tone) {
    els.statusBanner.className = `status-banner ${tone || ''}`;
    els.statusBanner.textContent = message;
    els.statusBanner.classList.remove('hidden');
  }

  function hideBanner() {
    els.statusBanner.classList.add('hidden');
  }

  initControls();
  fetchData();
})();
