import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

const REFRESH_INTERVAL = 15 * 60 * 1000;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

const SOURCE_COLORS = {
  'VnExpress': '#0066cc',
  'Tuổi Trẻ': '#e60000',
  'Thanh Niên': '#ff6600',
  'Dân Trí': '#009933',
};

function ArticleCard({ article, featured = false }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: featured ? 'column' : 'row',
        gap: featured ? 0 : 10,
        padding: featured ? 0 : '10px 14px',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
        color: 'var(--text)',
        transition: 'background 0.15s',
        borderRadius: featured ? '0 0 0 0' : 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Image */}
      {article.image && !imgError && (
        <div style={{
          flexShrink: 0,
          width: featured ? '100%' : 80,
          height: featured ? 180 : 60,
          borderRadius: featured ? 0 : 8,
          overflow: 'hidden',
          background: 'var(--border)',
        }}>
          <img
            src={article.image}
            alt=""
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      {/* Text */}
      <div style={{
        flex: 1,
        minWidth: 0,
        padding: featured ? '10px 14px 12px' : 0,
      }}>
        <div style={{
          fontWeight: featured ? 700 : 500,
          fontSize: featured ? '0.95rem' : '0.85rem',
          lineHeight: 1.4,
          marginBottom: 4,
          color: 'var(--text)',
          display: '-webkit-box',
          WebkitLineClamp: featured ? 3 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {article.title}
        </div>
        {featured && article.summary && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--muted)',
            lineHeight: 1.5,
            marginBottom: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {article.summary}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: SOURCE_COLORS[article.source] || 'var(--accent)',
            background: `${SOURCE_COLORS[article.source] || 'var(--accent)'}20`,
            padding: '2px 6px',
            borderRadius: 4,
          }}>
            {article.source}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(article.pubDate)}</span>
        </div>
      </div>
    </a>
  );
}

export default function NewsWidget() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [activeSource, setActiveSource] = useState('Tất cả');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const fetchNews = useCallback(async () => {
    try {
      setError(false);
      const res = await fetch(`${API_URL}/news`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const id = setInterval(fetchNews, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNews]);

  // Auto-rotate khi thu gọn
  useEffect(() => {
    if (expanded || articles.length === 0) return;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % Math.min(articles.length, 20));
        setFade(true);
      }, 300);
    }, 10000);
    return () => clearInterval(id);
  }, [expanded, articles.length]);

  const sources = ['Tất cả', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên', 'Dân Trí'];
  const filtered = activeSource === 'Tất cả'
    ? articles
    : articles.filter(a => a.source === activeSource);

  const featured = filtered[0];
  const rest = filtered.slice(1, expanded ? filtered.length : 5);
  const collapsedArticle = articles[currentIndex] || articles[0];

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: expanded ? 400 : 340,
      maxHeight: expanded ? '80vh' : 'auto',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      zIndex: 500,
      overflow: 'hidden',
      transition: 'width 0.25s ease, max-height 0.25s ease',
      display: 'flex',
      flexDirection: 'column',
      fontSize: 13,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(88,101,242,0.2), rgba(88,101,242,0.05))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', userSelect: 'none', flex: 1 }}
        >
          <span style={{ fontSize: 16 }}>📰</span>
          <span>Tin tức nổi bật</span>
          {!loading && articles.length > 0 && (
            <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>
              {articles.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={fetchNews}
            title="Làm mới"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
          >↻</button>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
          >{expanded ? '▼' : '▲'}</button>
        </div>
      </div>

      {/* Source filter tabs */}
      {expanded && (
        <div style={{
          display: 'flex', gap: 4, padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {sources.map(s => (
            <button
              key={s}
              onClick={() => setActiveSource(s)}
              style={{
                background: activeSource === s ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: activeSource === s ? 'white' : 'var(--muted)',
                border: 'none', borderRadius: 20, padding: '3px 10px',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {expanded ? (
        <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scroll">
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📡</div>
              Đang tải tin tức...
            </div>
          )}
          {error && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>😕</div>
              Không tải được tin tức
              <br />
              <button onClick={fetchNews} style={{ marginTop: 10, color: 'var(--accent)', background: 'rgba(88,101,242,0.1)', border: '1px solid var(--accent)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
                Thử lại
              </button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Không có tin từ nguồn này</div>
          )}
          {!loading && !error && featured && (
            <ArticleCard article={featured} featured={true} />
          )}
          {!loading && !error && rest.map((a, i) => (
            <ArticleCard key={i} article={a} />
          ))}
        </div>
      ) : (
        /* Collapsed: auto-rotate */
        !loading && !error && collapsedArticle && (
          <div
            onClick={() => setExpanded(true)}
            style={{ cursor: 'pointer', opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}
          >
            <ArticleCard article={collapsedArticle} featured={false} />
            {/* Dots indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '6px 0 8px' }}>
              {Array.from({ length: Math.min(articles.length, 6) }).map((_, i) => (
                <div key={i} style={{
                  width: i === currentIndex % 6 ? 16 : 6,
                  height: 4,
                  borderRadius: 2,
                  background: i === currentIndex % 6 ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
