window.DASHBOARD_CONFIG = {
  apiEndpoint: '/api/feeds',
  enableLocalFallback: true,
  defaultFilters: {
    region: 'All',
    topic: 'All',
    impact: 'All',
    sourceType: 'All',
    timeWindow: '7d',
    layoutMode: 'hybrid',
    search: ''
  },
  options: {
    regions: ['All', 'Global', 'MENA', 'GCC', 'UAE', 'Saudi', 'Qatar', 'Egypt', 'US', 'Europe'],
    topics: ['All', 'Agency World', 'Media & Platforms', 'Adtech & Martech', 'AI in Advertising', 'Retail Media & Commerce', 'Measurement & Attribution', 'Privacy & Regulation', 'Creative & Campaigns', 'Search / Social / Video / CTV', 'MENA Market Moves'],
    impact: ['All', 'High', 'Medium', 'Low'],
    sourceTypes: ['All', 'Official', 'Industry Body', 'Trade Press'],
    timeWindow: [
      { value: '24h', label: 'Last 24 hours' },
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' }
    ],
    layoutModes: [
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'executive', label: 'Executive' },
      { value: 'operator', label: 'Operator' }
    ]
  },
  watchlistSeed: ['Publicis', 'WPP', 'Saudi', 'retail media', 'Google Ads'],
  localFallbackStories: [
    {
      id: 'fallback-1',
      title: 'Local fallback mode is active because live fetching failed or has not been configured yet',
      summary: 'The UI is still usable, but the serverless feed layer needs to return live stories for production use.',
      link: '#',
      source: 'System',
      sourceType: 'Official',
      publishedAt: '2026-03-15T08:00:00Z',
      region: 'Global',
      topic: 'Agency World',
      tags: ['fallback'],
      whyItMatters: 'This keeps the dashboard honest. A degraded mode is better than an empty dead shell.',
      strategicImplication: 'Check the Vercel deployment logs and the /api/feeds response.',
      impact: 'Medium'
    },
    {
      id: 'fallback-2',
      title: 'Google Ads and platform updates should be fetched server-side, not directly in the browser',
      summary: 'This avoids CORS failures and lets you normalize structured changes into one view.',
      link: 'https://support.google.com/google-ads/announcements/9048695?hl=en',
      source: 'Google Ads Announcements',
      sourceType: 'Official',
      publishedAt: '2026-03-14T08:00:00Z',
      region: 'Global',
      topic: 'Search / Social / Video / CTV',
      tags: ['google ads', 'server-side'],
      whyItMatters: 'The old GitHub Pages model was brittle because the browser was doing the heavy lifting.',
      strategicImplication: 'Move ingestion to Vercel and keep the front-end clean.',
      impact: 'High'
    },
    {
      id: 'fallback-3',
      title: 'Regional market intelligence needs its own first-class module and source weighting',
      summary: 'MENA stories are easy to drown out when a dashboard is dominated by US and global trade coverage.',
      link: 'https://iabmena.com/',
      source: 'IAB MENA',
      sourceType: 'Industry Body',
      publishedAt: '2026-03-13T08:00:00Z',
      region: 'MENA',
      topic: 'MENA Market Moves',
      tags: ['mena', 'gcc'],
      whyItMatters: 'A global-only view is strategically weak for regional operators.',
      strategicImplication: 'Keep MENA weighting explicit in the ranking logic.',
      impact: 'Medium'
    }
  ]
};
