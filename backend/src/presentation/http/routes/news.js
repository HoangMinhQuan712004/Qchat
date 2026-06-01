const express = require('express');
const Parser = require('rss-parser');

const router = express.Router();
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; QchatBot/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['enclosure', 'enclosure'],
      ['description', 'description'],
    ],
  },
});

const FEEDS = [
  { name: 'VnExpress',  url: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
  { name: 'Tuổi Trẻ',  url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss' },
  { name: 'Thanh Niên', url: 'https://thanhnien.vn/rss/home.rss' },
  { name: 'Dân Trí',   url: 'https://dantri.com.vn/rss/home.rss' },
];

function extractImage(item) {
  // 1. media:thumbnail
  if (item.mediaThumbnail?.$ ?.url) return item.mediaThumbnail.$.url;
  if (typeof item.mediaThumbnail === 'string') return item.mediaThumbnail;

  // 2. media:content
  if (item.mediaContent?.$ ?.url) return item.mediaContent.$.url;

  // 3. enclosure image
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image')) return item.enclosure.url;

  // 4. img tag inside description/content
  const html = item.description || item.content || item['content:encoded'] || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];

  return null;
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 150);
}

async function fetchNews() {
  const results = await Promise.allSettled(
    FEEDS.map(f => parser.parseURL(f.url).then(feed => ({
      source: f.name,
      items: feed.items.slice(0, 8).map(i => ({
        title: i.title?.trim(),
        link: i.link,
        pubDate: i.pubDate || i.isoDate,
        image: extractImage(i),
        summary: stripHtml(i.contentSnippet || i.description || ''),
      })),
    })))
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value.items.map(i => ({ ...i, source: r.value.source })))
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 30);
}

let cache = null;
let cacheAt = 0;
const CACHE_TTL = 15 * 60 * 1000;

router.get('/', async (req, res, next) => {
  try {
    const now = Date.now();
    if (!cache || now - cacheAt > CACHE_TTL) {
      cache = await fetchNews();
      cacheAt = now;
    }
    res.json({ articles: cache, cachedAt: new Date(cacheAt).toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
