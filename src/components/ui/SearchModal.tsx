import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, FileText, HelpCircle, Package, X, CornerDownLeft, History, Star } from 'lucide-react';
import { products, type Product } from '../../data/products';

interface SearchItem {
  title: string;
  description: string;
  category: 'Product' | 'FAQ' | 'Page';
  url: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = ['Dr Lion', 'Pain Relief', 'Ointment', 'Kadapa Unit', 'License'];

const preprocessQuery = (q: string) => {
  let processed = q.toLowerCase();
  if (processed.includes('pain killer') || processed.includes('painkiller') || processed.includes('joint pain') || processed.includes('muscle pain')) {
    processed += ' pain relief';
  }
  if (processed.includes('skincare') || processed.includes('skin care') || processed.includes('ointment')) {
    processed += ' cream';
  }
  if (processed.includes('capsule') || processed.includes('pills') || processed.includes('capsules')) {
    processed += ' tablet';
  }
  return processed;
};

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ss_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Searchable Items Memoization
  const searchItems: SearchItem[] = useMemo(() => [
    // 1. Pages
    { title: 'Home', description: 'Ayurvedic formulations and wholesale distributor partnership overview.', category: 'Page', url: '/' },
    { title: 'About Us', description: 'Our legacy of government licensed manufacturing unit located in Kadapa AP.', category: 'Page', url: '/about' },
    { title: 'Products Catalog', description: 'Browse and filter pain relief creams, pills, and skincare formulations.', category: 'Page', url: '/products' },
    { title: 'Manufacturing Standards', description: 'Our licensed quality control guidelines and GMP best practices.', category: 'Page', url: '/manufacturing' },
    { title: 'Distributor Partner Program', description: 'Apply to become a B2B wholesale partner with region selection.', category: 'Page', url: '/distributor' },
    { title: 'Contact Us', description: 'General inquiries, product questions, and office coordinates.', category: 'Page', url: '/contact' },
    { title: 'Gallery', description: 'Authentic packshots, labels, and manufacturing facility photos.', category: 'Page', url: '/gallery' },
    { title: 'Testimonials', description: 'Feedback from medical shops, clinics, and retail partners.', category: 'Page', url: '/testimonials' },
    { title: 'FAQ', description: 'Frequently asked questions about licensing, usage, and logistics.', category: 'Page', url: '/faq' },

    // 2. Products
    ...products.map((p: Product) => ({
      title: p.name,
      description: `${p.category} - ${p.composition.substring(0, 80)}...`,
      category: 'Product' as const,
      url: `/products/${p.id}`
    })),

    // 3. FAQs
    { title: 'Where are products manufactured?', description: 'S.S. PHARMACY formulations are prepared in Kadapa District, Andhra Pradesh (Mfg. Lic. No. R-1970/Ayur).', category: 'FAQ', url: '/faq' },
    { title: 'Are formulations approved?', description: 'Licensed for Ayurvedic proprietary medicine manufacturing by the state drug licensing authority.', category: 'FAQ', url: '/faq' },
    { title: 'Can I buy products online?', description: 'Currently direct online checkout is not active. Submit contact or distributor forms.', category: 'FAQ', url: '/faq' },
    { title: 'What is your target shipping region?', description: 'Distributors, medical stores, and clinics across AP and neighbouring states.', category: 'FAQ', url: '/faq' }
  ], []);

  // Dynamically loaded Fuse.js instance state
  const [fuse, setFuse] = useState<any>(null);

  // Dynamically load fuse.js when search modal is opened
  useEffect(() => {
    if (isOpen) {
      import('fuse.js').then((module) => {
        const FuseClass = module.default;
        const fuseInstance = new FuseClass(searchItems, {
          keys: ['title', 'description', 'category'],
          threshold: 0.45,
          includeMatches: true
        });
        setFuse(fuseInstance);
      });
    }
  }, [isOpen, searchItems]);

  // Debounce search term to prevent UI lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  // Handle Search Execution
  useEffect(() => {
    if (!debouncedQuery.trim() || !fuse) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    const processed = preprocessQuery(debouncedQuery);
    const searchResults = fuse.search(processed).map((r: any) => r.item);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [debouncedQuery, fuse]);

  // Focus on opening modal & restore on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key close & focus trapping trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const addToHistory = (q: string) => {
    if (!q.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, 5);
      localStorage.setItem('ss_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectResult = (url: string) => {
    addToHistory(query || debouncedQuery);
    navigate(url);
    onClose();
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem('ss_search_history');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        handleSelectResult(selected.url);
      }
    }
  };

  // Inline highlighter utility
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const escapedSearch = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-[#C4A35A]/30 text-[#2D5016] rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search site resources"
    >
      <div
        ref={containerRef}
        className="search-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="search-modal-header">
          <Search size={20} className="text-[#8B6914] mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search formulations, pages, FAQs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-modal-input"
          />
          <button
            type="button"
            onClick={onClose}
            className="search-modal-close-btn"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Results / suggestions */}
        <div
          ref={resultsContainerRef}
          className="search-modal-body"
        >
          {query === '' ? (
            <div className="search-suggestions-grid">
              <div>
                <h5 className="search-section-title">
                  <Star size={14} />
                  Popular Searches
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="search-popular-btn"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="search-section-title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={14} />
                    Recent Searches
                  </span>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className="search-history-clear-btn">
                      Clear
                    </button>
                  )}
                </h5>
                {history.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', fontFamily: 'var(--font-body)' }}>No recent searches.</p>
                ) : (
                  <div className="search-history-list">
                    {history.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(term)}
                        className="search-history-item"
                      >
                        <History size={12} style={{ color: 'var(--color-text-light)' }} />
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>
              <p style={{ marginBottom: '8px' }}>No matches found for <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>"{query}"</span></p>
              <div style={{ textAlign: 'left', backgroundColor: 'var(--color-bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border-light)', maxWidth: '380px', margin: '1rem auto 0 auto' }}>
                <span style={{ fontSize: '10px', fontWeight: 'var(--font-bold)', color: 'var(--color-brand-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Search Tips:</span>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', fontSize: '11px', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-text-secondary)' }}>
                  <li>Check spelling or try using simpler keywords.</li>
                  <li>Search for product benefits (e.g. "pain relief").</li>
                  <li>Search for specific packaging (e.g. "pack size").</li>
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Link
                    key={index}
                    to={item.url}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectResult(item.url);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`search-result-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="search-result-icon">
                      {item.category === 'Product' && <Package size={18} />}
                      {item.category === 'FAQ' && <HelpCircle size={18} />}
                      {item.category === 'Page' && <FileText size={18} />}
                    </div>
                    
                    <div className="search-result-content">
                      <div className="search-result-header">
                        <h4 className="search-result-title">
                          {highlightText(item.title, query)}
                        </h4>
                        <span className="search-result-badge">
                          {item.category}
                        </span>
                      </div>
                      <p className="search-result-desc">
                        {highlightText(item.description, query)}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="search-result-enter-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        <CornerDownLeft size={14} />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Helper Bar */}
        <div className="search-modal-footer">
          <div className="search-kbd-shortcuts">
            <span><kbd className="search-kbd-item">↑↓</kbd> Navigate</span>
            <span><kbd className="search-kbd-item">Enter</kbd> Select</span>
            <span><kbd className="search-kbd-item">ESC</kbd> Close</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            S.S. PHARMACY Fuzzy Search
          </div>
        </div>

        {/* Visually Hidden live announcements for search result counts */}
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">
          {debouncedQuery.trim() ? `${results.length} result${results.length === 1 ? '' : 's'} found for "${debouncedQuery}"` : ''}
        </div>
      </div>
    </div>
  );
}
