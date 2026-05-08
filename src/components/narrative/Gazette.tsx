import React from 'react';
import { useGame as useGameStore } from '@/game/store';
import type { NewsItem, EntityLink } from '@/core/narrative/newsTypes';
import './Gazette.css';

export const Gazette: React.FC = () => {
  const { news, day } = useGameStore();

  const highImportance = news.filter(n => n.importance === 'high');
  const mediumImportance = news.filter(n => n.importance === 'medium');
  const lowImportance = news.filter(n => n.importance === 'low');

  const mainNews = [...highImportance, ...mediumImportance].slice(0, 5);
  const sideNews = lowImportance.slice(0, 10);

  return (
    <div className="gazette-container">
      <header className="gazette-header">
        <h1 className="gazette-title">The Gallop Gazette</h1>
        <div className="gazette-meta">
          <span>Established Year 1</span>
          <span>Day {day} Edition</span>
          <span>Price: Two Pence</span>
        </div>
      </header>

      <div className="gazette-body">
        <main className="gazette-main-column">
          {mainNews.length > 0 ? (
            mainNews.map(item => (
              <NewsArticle key={item.id} item={item} />
            ))
          ) : (
            <div className="news-item">
              <h2 className="news-headline">Quiet Day at the Tracks</h2>
              <p className="news-body">The racing world is catching its breath. No major results reported today.</p>
            </div>
          )}
        </main>

        <aside className="gazette-sidebar">
          <section className="sidebar-section">
            <h3 className="sidebar-title">Local Snippets</h3>
            {sideNews.length > 0 ? (
              sideNews.map(item => (
                <div key={item.id} className="news-snippet" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem' }}>{item.headline}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>{item.body}</p>
                </div>
              ))
            ) : (
              <p className="sidebar-content">Stable conditions across all regional tracks.</p>
            )}
          </section>

          <section className="sidebar-section" style={{ background: '#2c2c2c', color: '#fff' }}>
            <h3 className="sidebar-title" style={{ borderColor: '#fff' }}>Classifieds</h3>
            <p className="sidebar-content">Looking for prime pasture? Contact the Kentucky Syndicate.</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

const NewsArticle: React.FC<{ item: NewsItem }> = ({ item }) => {
  return (
    <article className={`news-item news-importance-${item.importance}`}>
      <span className="news-category">{item.category}</span>
      <h2 className="news-headline">{item.headline}</h2>
      <div className="news-body">
        {renderBodyWithLinks(item.body, item.entityLinks)}
      </div>
    </article>
  );
};

function renderBodyWithLinks(body: string, links?: EntityLink[]) {
  if (!links || links.length === 0) return <p>{body}</p>;

  // Simple implementation: replace exact name matches with links
  // In a real app, you'd use a more robust regex or structured body
  let parts: (string | JSX.Element)[] = [body];

  links.forEach(link => {
    const newParts: (string | JSX.Element)[] = [];
    parts.forEach(part => {
      if (typeof part !== 'string') {
        newParts.push(part);
        return;
      }

      const segments = part.split(link.name);
      segments.forEach((seg, i) => {
        newParts.push(seg);
        if (i < segments.length - 1) {
          newParts.push(
            <span 
              key={`${link.id}-${i}`} 
              className="entity-link"
              onClick={() => {
                // In a real app, use navigation
                console.log(`Navigate to ${link.type}: ${link.id}`);
                window.dispatchEvent(new CustomEvent('navigate', { detail: { type: link.type, id: link.id } }));
              }}
            >
              {link.name}
            </span>
          );
        }
      });
    });
    parts = newParts;
  });

  return <p>{parts}</p>;
}
