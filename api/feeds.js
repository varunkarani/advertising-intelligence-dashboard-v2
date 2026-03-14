import * as cheerio from 'cheerio';

const SOURCES = [
  {
    id: 'iab-news',
    name: 'IAB',
    type: 'Industry Body',
    homepage: 'https://www.iab.com/news/',
    url: 'https://www.iab.com/news/',
    region: 'Global',
    defaultTopic: 'Privacy & Regulation',
    selectors: [
      'article',
      'main article',
      '.post',
      '.news-item',
      'a[href*="/news/"]'
    ],
    keywords: ['privacy', 'regulation', 'measurement', 'guidelines', 'creator', 'commerce']
  },
  {
    id: 'iab-mena-news',
    name: 'IAB MENA',
    type: 'Industry Body',
    homepage: 'https://iabmena.com/',
    url: 'https://iabmena.com/',
    region: 'MENA',
    defaultTopic: 'MENA Market Moves',
    selectors: [
      'article',
      '.post',
      '.blog-item',
      '.news-item',
      'a[href*="news"]',
      'a[href*="event"]'
    ],
    keywords: ['mena', 'gcc', 'uae', 'saudi', 'regional', 'summit']
  },
  {
    id: 'google-ads-announcements',
    name: 'Google Ads Announcements',
    type: 'Official',
    homepage: 'https://support.google.com/google-ads/announcements/9048695?hl=en',
    url: 'https://support.google.com/google-ads/announcements/9048695?hl=en',
    region: 'Global',
    defaultTopic: 'Search / Social / Video / CTV',
    selectors: [
      'a[href*="/google-ads/answer/"]',
      'a[href*="/google-ads/announcements/"]',
      'main a[href*="/answer/"]',
      'article a',
      'main a'
    ],
    keywords: ['google ads', 'youtube', 'performance max', 'measurement', 'search']
  },
  {
    id: 'meta-business-news',
    name: 'Meta for Business',
    type: 'Official',
    homepage: 'https://www.facebook.com/business/news',
    url: 'https://www.facebook.com/business/news',
    region: 'Global',
    defaultTopic: 'Media & Platforms',
    selectors: [
      'article',
      'main article',
      'a[href*="/business/news/"]',
      'main a'
    ],
    keywords: ['meta', 'instagram', 'facebook', 'ads', 'threads', 'reels']
  },
  {
    id: 'tiktok-business-blog',
    name: 'TikTok for Business',
    type: 'Official',
    homepage: 'https://ads.tiktok.com/business/en/blog',
    url: 'https://ads.tiktok.com/business/en/blog',
    region: 'Global',
    defaultTopic: 'Media & Platforms',
    selectors: [
      'article',
      'main article',
      'a[href*="/business/en/blog/"]',
      'main a'
    ],
    keywords: ['tiktok', 'commerce', 'creative', 'ads', 'shop']
  },
  {
    id: 'warc-latest',
    name: 'WARC',
    type: 'Trade Press',
    homepage: 'https://www.warc.com/en/latest',
    url: 'https://www.warc.com/en/latest',
    region: 'Global',
    defaultTopic: 'Creative & Campaigns',
    selectors: [
      'article',
      '[class*="latest"] article',
      '[class*="card"]',
      '[class*="teaser"]',
      '[class*="listing"]',
      'a[href*="/content/"]',
      'a[href*="/newsandopinion/"]',
      'a[href*="/latest/"]'
    ],
    keywords: ['effectiveness', 'creative', 'retail media', 'influencer', 'campaign']
  },
  {
    id: 'the-drum-latest',
    name: 'The Drum',
    type: 'Trade Press',
    homepage: 'https://www.thedrum.com/latest',
    url: 'https://www.thedrum.com/latest',
    region: 'Global',
    defaultTopic: 'Agency World',
    selectors: [
      'article',
      'main article',
      'a[href*="/news/"]',
      'main a'
    ],
    keywords: ['agency', 'campaign', 'creative', 'client', 'pitch']
  },
  {
    id: 'marketing-dive-home',
    name: 'Marketing Dive',
    type: 'Trade Press',
    homepage: 'https://www.marketingdive.com/',
    url: 'https://www.marketingdive.com/',
    region: 'US',
    defaultTopic: 'Agency World',
    selectors: [
      'article',
      'main article',
      'a[href*="/news/"]',
      'main a'
    ],
    keywords: ['agency', 'marketing', 'brand', 'measurement', 'creator']
  }
];

const TOPICS = {
  'AI in Advertising': ['ai', 'agentic', 'automation', 'model', 'synthetic'],
  'Privacy & Regulation': ['privacy', 'regulation', 'policy', 'legal', 'consent'],
  'Measurement & Attribution': ['measurement', 'attribution', 'incrementality', 'mmm', 'analytics'],
  'Creative & Campaigns': ['creative', 'campaign', 'creator', 'brand', 'influencer'],
  'Search / Social / Video / CTV': ['search', 'social', 'video', 'youtube', 'ctv', 'google ads'],
  'Media & Platforms': ['platform', 'ads', 'meta', 'tiktok', 'retail media', 'shop'],
  'Agency World': ['agency', 'pitch', 'account', 'client', 'leadership', 'partnership'],
  'MENA Market Moves': ['mena', 'gcc', 'uae', 'saudi', 'qatar', 'egypt']
};

export default async function handler(req, res) {
  const sourceHealth = [];
  const stories = [];
  const timeWindow = req.query.window || '7d';
  const cutoff = getCutoff(timeWindow);

  for (const source of SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; AdvertisingIntelligenceBot/2.1; +https://vercel.com)',
          'accept-language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) {
        sourceHealth.push({
          name: source.name,
          homepage: source.homepage,
          type: source.type,
          status: 'failed',
          storyCount: 0,
          note: `HTTP ${response.status}`
        });
        continue;
      }

      const html = await response.text();
      const parsed = parseSourceHtml(html, source);
      const filtered = parsed
        .filter((story) => !cutoff || new Date(story.publishedAt).getTime() >= cutoff)
        .slice(0, 8);

      stories.push(...filtered);
      sourceHealth.push({
        name: source.name,
        homepage: source.homepage,
        type: source.type,
        status: filtered.length ? 'ok' : 'failed',
        storyCount: filtered.length,
        note: filtered.length
          ? parsed.note || 'Parsed server-side with source-specific selectors'
          : 'No stories parsed from current page structure'
      });
    } catch (error) {
      sourceHealth.push({
        name: source.name,
        homepage: source.homepage,
        type: source.type,
        status: 'failed',
        storyCount: 0,
        note: clean(error.message).slice(0, 140)
      });
    }
  }

  const deduped = dedupeStories(stories)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.status(200).json({
    generatedAt: new Date().toISOString(),
    stories: deduped,
    sourceHealth
  });
}

function parseSourceHtml(html, source) {
  const $ = cheerio.load(html);

  if (source.id === 'google-ads-announcements') {
    const items = parseGoogleAdsHtml($, source);
    items.note = 'Parsed with Google Ads support-page selectors';
    return items;
  }

  if (source.id === 'warc-latest') {
    const items = parseWarcHtml($, source);
    items.note = 'Parsed with WARC content-card selectors';
    return items;
  }

  const items = parseGenericHtml($, source);
  items.note = 'Parsed with generic source selectors';
  return items;
}

function parseGoogleAdsHtml($, source) {
  const items = [];
  const seen = new Set();

  const rootSelectors = [
    'main article',
    'article',
    'main li',
    'main section',
    '.hcfe-content li',
    '.hcfe-content section',
    '.announcement',
    '.article',
    '.support-article'
  ];

  for (const rootSelector of rootSelectors) {
    $(rootSelector).each((_, el) => {
      const root = $(el);
      const story = extractStoryFromRoot(root, source, {
        linkSelectors: [
          'a[href*="/google-ads/answer/"]',
          'a[href*="/google-ads/announcements/"]',
          'a[href*="/answer/"]'
        ],
        headingSelectors: ['h1', 'h2', 'h3', 'h4', '[role="heading"]'],
        summarySelectors: ['p', '.summary', '.snippet', '.description', 'div'],
        dateSelectors: ['time', '.date', '.published', '.announcement-date', 'span']
      });

      if (shouldKeepStory(story, source, seen)) {
        seen.add(story._key);
        items.push(finalizeStory(story, source));
      }
    });

    if (items.length >= 8) break;
  }

  if (items.length < 3) {
    for (const selector of source.selectors) {
      $(selector).each((_, el) => {
        const anchor = $(el);
        const story = extractStoryFromAnchor(anchor, source);

        if (shouldKeepStory(story, source, seen)) {
          seen.add(story._key);
          items.push(finalizeStory(story, source));
        }
      });

      if (items.length >= 8) break;
    }
  }

  return items.slice(0, 8);
}

function parseWarcHtml($, source) {
  const items = [];
  const seen = new Set();

  const rootSelectors = [
    'main article',
    'article',
    '[class*="latest"]',
    '[class*="card"]',
    '[class*="teaser"]',
    '[class*="listing"]',
    '[class*="river"]'
  ];

  for (const rootSelector of rootSelectors) {
    $(rootSelector).each((_, el) => {
      const root = $(el);
      const story = extractStoryFromRoot(root, source, {
        linkSelectors: [
          'a[href*="/content/"]',
          'a[href*="/newsandopinion/"]',
          'a[href*="/latest/"]',
          'a[href*="/en/"]'
        ],
        headingSelectors: ['h1', 'h2', 'h3', 'h4', '[role="heading"]'],
        summarySelectors: ['p', '.deck', '.standfirst', '.summary', '.teaser', 'div'],
        dateSelectors: ['time', '.date', '.published', 'span']
      });

      if (shouldKeepStory(story, source, seen)) {
        seen.add(story._key);
        items.push(finalizeStory(story, source));
      }
    });

    if (items.length >= 8) break;
  }

  if (items.length < 3) {
    for (const selector of source.selectors) {
      $(selector).each((_, el) => {
        const anchor = $(el);
        const story = extractStoryFromAnchor(anchor, source);

        if (shouldKeepStory(story, source, seen)) {
          seen.add(story._key);
          items.push(finalizeStory(story, source));
        }
      });

      if (items.length >= 8) break;
    }
  }

  return items.slice(0, 8);
}

function parseGenericHtml($, source) {
  const items = [];
  const seen = new Set();

  for (const selector of source.selectors) {
    $(selector).each((_, el) => {
      const root = $(el);

      const story = root.is('a')
        ? extractStoryFromAnchor(root, source)
        : extractStoryFromRoot(root, source, {
            linkSelectors: ['a[href]'],
            headingSelectors: ['h1', 'h2', 'h3', 'h4', '[role="heading"]'],
            summarySelectors: ['p', '.summary', '.excerpt', '.dek', '.standfirst', 'div'],
            dateSelectors: ['time', '.date', '.published', 'span']
          });

      if (shouldKeepStory(story, source, seen)) {
        seen.add(story._key);
        items.push(finalizeStory(story, source));
      }
    });

    if (items.length >= 10) break;
  }

  return items.slice(0, 8);
}

function extractStoryFromRoot(root, source, options = {}) {
  const link = firstNonEmptySelection(root, options.linkSelectors || ['a[href]']);
  const heading = firstNonEmptySelection(root, options.headingSelectors || ['h1', 'h2', 'h3', 'h4']);
  const summary = firstNonEmptyText(root, options.summarySelectors || ['p', 'div']);
  const dateText = firstNonEmptyText(root, options.dateSelectors || ['time', 'span']);

  const hrefRaw = link?.attr('href') || heading?.find('a[href]').first().attr('href') || root.find('a[href]').first().attr('href');
  const title = clean(
    heading?.text() ||
    link?.text() ||
    root.find('a[href]').first().text()
  );

  const href = absolutizeUrl(hrefRaw, source.homepage);

  return {
    title,
    href,
    summary: sanitizeSummary(summary, title),
    publishedAt: parseDateFromText(dateText),
    _key: `${title}|${href}`
  };
}

function extractStoryFromAnchor(anchor, source) {
  const parent = anchor.closest('article, li, section, div');
  const hrefRaw = anchor.attr('href');
  const title = clean(anchor.text());
  const href = absolutizeUrl(hrefRaw, source.homepage);
  const summary = sanitizeSummary(
    clean(parent.find('p').first().text()) || clean(parent.text()),
    title
  );
  const publishedAt = parseDateFromText(
    clean(parent.find('time').first().attr('datetime')) ||
    clean(parent.find('time').first().text()) ||
    clean(parent.find('.date').first().text())
  );

  return {
    title,
    href,
    summary,
    publishedAt,
    _key: `${title}|${href}`
  };
}

function shouldKeepStory(story, source, seen) {
  if (!story) return false;
  if (!story.href || !story.title) return false;
  if (story.title.length < 16) return false;
  if (seen.has(story._key)) return false;
  if (isNoise(story.title, story.href, source)) return false;
  return true;
}

function finalizeStory(story, source) {
  const lowered = story.title.toLowerCase();
  const topic = inferTopic(lowered, source.defaultTopic);
  const region = inferRegion(lowered, source.region);
  const impact = inferImpact(lowered, source.type);

  return {
    id: `${source.id}-${slugify(story.title).slice(0, 60)}`,
    title: story.title,
    summary: story.summary || buildSummary(story.title, source.name, topic, region),
    link: story.href,
    source: source.name,
    sourceType: source.type,
    publishedAt: story.publishedAt || new Date().toISOString(),
    region,
    topic,
    tags: inferTags(lowered, source.keywords),
    whyItMatters: whyItMatters(topic, region),
    strategicImplication: strategicImplication(topic),
    impact
  };
}

function firstNonEmptySelection(root, selectors = []) {
  for (const selector of selectors) {
    const found = root.find(selector).first();
    if (found.length && clean(found.text())) return found;
  }
  return null;
}

function firstNonEmptyText(root, selectors = []) {
  for (const selector of selectors) {
    const nodes = root.find(selector).toArray();
    for (const node of nodes) {
      const text = clean(root.find(selector).filter((i, el) => el === node).first().text());
      if (text && text.length > 10) return text;
    }
  }
  return '';
}

function sanitizeSummary(summary, title) {
  const cleanSummary = clean(summary);
  if (!cleanSummary) return '';
  if (cleanSummary === title) return '';
  return cleanSummary.slice(0, 220);
}

function parseDateFromText(value) {
  const raw = clean(value);
  if (!raw) return null;

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();

  const match = raw.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i
  );
  if (match) {
    const parsed = Date.parse(match[0]);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  if (raw.toLowerCase().includes('today')) return new Date().toISOString();
  if (raw.toLowerCase().includes('yesterday')) {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

function inferTopic(text, fallback) {
  for (const [topic, words] of Object.entries(TOPICS)) {
    if (words.some((word) => text.includes(word))) return topic;
  }
  return fallback;
}

function inferRegion(text, fallback) {
  if (text.includes('saudi')) return 'Saudi';
  if (text.includes('uae') || text.includes('dubai') || text.includes('abu dhabi')) return 'UAE';
  if (text.includes('qatar')) return 'Qatar';
  if (text.includes('egypt')) return 'Egypt';
  if (text.includes('mena') || text.includes('gcc') || text.includes('middle east')) return 'MENA';
  return fallback || 'Global';
}

function inferImpact(text, sourceType) {
  if (['policy', 'privacy', 'regulation', 'launch', 'measurement', 'acquisition', 'leadership', 'account', 'pitch'].some((term) => text.includes(term))) {
    return 'High';
  }
  if (sourceType === 'Official' || sourceType === 'Industry Body') return 'Medium';
  return 'Low';
}

function inferTags(text, sourceKeywords = []) {
  const base = sourceKeywords.filter((term) => text.includes(term));
  return [...new Set(base)].slice(0, 4);
}

function whyItMatters(topic, region) {
  if (topic === 'Privacy & Regulation') return 'Standards and policy shifts show up in planning, compliance, and procurement conversations faster than most teams expect.';
  if (topic === 'AI in Advertising') return 'This matters only when it changes workflow, speed, cost, QA, or client expectation management.';
  if (topic === 'Agency World') return 'Agency and account movement is field intelligence, not background reading.';
  if (region === 'MENA' || region === 'Saudi' || region === 'UAE') return 'Regional relevance is easy to underweight in global trade coverage, which is exactly why this needs first-class visibility.';
  return 'This is potentially useful signal, but it still needs human judgment before it changes a decision.';
}

function strategicImplication(topic) {
  if (topic === 'Measurement & Attribution') return 'Review reporting assumptions, attribution narratives, and what you can still defend with confidence.';
  if (topic === 'Search / Social / Video / CTV' || topic === 'Media & Platforms') return 'Assess whether planning, buying, creative, or reporting workflows need to change immediately.';
  if (topic === 'Creative & Campaigns') return 'Use this as inspiration input, not proof of effectiveness.';
  return 'Monitor, validate, and decide whether it changes how you operate or advise clients.';
}

function buildSummary(title, sourceName, topic, region) {
  return `${sourceName} published an item relevant to ${topic.toLowerCase()}${region && region !== 'Global' ? ` in ${region}` : ''}: ${title}.`;
}

function dedupeStories(stories) {
  const seen = new Set();
  return stories.filter((story) => {
    const key = story.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNoise(title, href, source) {
  const lowered = title.toLowerCase();

  if ([
    'sign in',
    'subscribe',
    'newsletter',
    'privacy policy',
    'terms of use',
    'cookie',
    'help center',
    'community',
    'advertise with us',
    'contact us',
    'learn more'
  ].some((term) => lowered.includes(term))) return true;

  if (href === source.homepage) return true;

  if (source.id === 'google-ads-announcements') {
    const valid = href.includes('/google-ads/answer/') || href.includes('/google-ads/announcements/');
    if (!valid) return true;
  }

  if (source.id === 'warc-latest') {
    const looksContent = href.includes('/content/') || href.includes('/newsandopinion/') || href.includes('/latest/');
    if (!looksContent) return true;
  }

  return false;
}

function absolutizeUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href || '';
  }
}

function getCutoff(windowKey) {
  const now = Date.now();
  if (windowKey === '24h') return now - 24 * 60 * 60 * 1000;
  if (windowKey === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (windowKey === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
