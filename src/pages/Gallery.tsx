import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import CleanCard from '../components/cards/CleanCard';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import SEO from '../components/ui/SEO';

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const categories = ['All', 'Packaging', 'Facility', 'Logos'];

  const galleryItems = [
    {
      src: import.meta.env.BASE_URL + 'products/Dr lion pain cream/Pain cream front view.webp',
      title: 'Dr. Lion Pain Cream Packshot',
      category: 'Packaging'
    },
    {
      src: import.meta.env.BASE_URL + 'products/Moon-light/Moon cream front view.webp',
      title: 'Moon Light Cream Packshot',
      category: 'Packaging'
    },
    {
      src: import.meta.env.BASE_URL + 'products/Dr lion Pain pills/Pain_pills.webp',
      title: 'Dr. Lion Pain Pills Bottle',
      category: 'Packaging'
    },
    {
      src: import.meta.env.BASE_URL + 'products/Hero%20section/home_page_image.webp',
      title: 'Licensed Manufacturing Facility',
      category: 'Facility'
    },
    {
      src: import.meta.env.BASE_URL + 'products/logo/logo.webp',
      title: 'Official S.S. PHARMACY Logo',
      category: 'Logos'
    }
  ];

  const filteredItems = activeFilter === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === activeFilter);

  const handleOpenLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedIndex(null);
  };

  const handleNextImage = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0));
  }, [selectedIndex, filteredItems.length]);

  const handlePrevImage = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
  }, [selectedIndex, filteredItems.length]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNextImage, handlePrevImage]);

  const currentItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  return (
    <div className="gallery-page bg-[#FEFDF8]">
      <SEO
        title="Product & Packaging Gallery - S.S. PHARMACY"
        description="View authentic product packshots, label graphics, and licensed manufacturing facility visual assets of S.S. PHARMACY."
        canonical="https://sspharmacy.com/gallery"
      />
      {/* 1. Page Header */}
      <Section className="pt-page-header pb-10 bg-gradient-to-b from-[#F9F6EE] to-[#FEFDF8] border-b border-[#E8E2D2]">
        <Container>
          <Breadcrumbs items={[{ label: 'Gallery' }]} className="mb-6" />
          <div className="gallery-header-block max-w-3xl">
            <SectionHeader
              eyebrow="Visual Portfolio"
              title="Product & Packaging Gallery"
              subtitle="Explore official product packshots, label graphics, and manufacturing plant visual assets for S.S. PHARMACY."
              align="left"
              isPageHeader
            />

            {/* Filter Pills */}
            <div className="gallery-filters-row mt-8 flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill-btn px-5 py-2.5 rounded-full text-xs font-bold min-h-[44px] transition-all duration-200 border ${
                    activeFilter === cat
                      ? 'bg-[#1D3A28] text-white border-[#1D3A28] shadow-md ring-2 ring-[#C5A059]/40'
                      : 'bg-white text-secondary hover:bg-[#F5EFE3] border-[#D9C8A9]'
                  }`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* 2. Gallery Grid */}
      <Section className="py-12 md:py-16">
        <Container>
          <Grid cols={3} gap="lg" className="gallery-layout-grid-container">
            {filteredItems.map((item, index) => (
              <CleanCard
                key={index}
                variant="default"
                interactive
                onClick={() => handleOpenLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenLightbox(index);
                  }
                }}
                className="gallery-item-card-outer border-2 border-[#D9C8A9] hover:border-[#C5A059] transition-all bg-white overflow-hidden shadow-sm hover:shadow-md"
                innerClassName="gallery-item-card p-3"
                aria-label={`View enlarged ${item.title}`}
              >
                <div className="gallery-image-box relative overflow-hidden rounded-xl bg-slate-50">
                  <img
                    src={item.src}
                    alt={item.title}
                    className="gallery-img w-full h-[240px] object-cover transition-transform duration-500 hover:scale-105"
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = import.meta.env.BASE_URL + 'products/logo/logo.webp';
                    }}
                  />
                  <div className="gallery-hover-overlay absolute inset-0 bg-[#1D3A28]/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 rounded-full bg-[#C5A059] text-[#1D3A28] shadow-md">
                      <ZoomIn size={24} />
                    </div>
                  </div>
                </div>
                <div className="gallery-info-bar mt-3.5 flex items-center justify-between gap-2 px-1">
                  <Badge variant="status" className="bg-[#1D3A28]/10 text-[#1D3A28] border border-[#1D3A28]/20 text-[11px] font-bold">
                    {item.category}
                  </Badge>
                  <h5 className="font-display text-sm font-semibold text-[#1D3A28] truncate">{item.title}</h5>
                </div>
              </CleanCard>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* 3. Lightbox Modal */}
      <Modal isOpen={selectedIndex !== null} onClose={handleCloseLightbox} title={currentItem?.title || 'Gallery Viewer'}>
        {currentItem && (
          <div className="lightbox-content flex flex-col items-center justify-center p-2 relative">
            <div className="relative w-full flex items-center justify-center bg-slate-900/5 rounded-2xl p-4">
              {filteredItems.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-white text-[#1D3A28] border border-[#D9C8A9] flex items-center justify-center shadow-lg hover:bg-[#1D3A28] hover:text-white transition-all z-10"
                  aria-label="Previous Image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <img
                src={currentItem.src}
                alt={currentItem.title}
                className="max-h-[65vh] object-contain rounded-xl shadow-md"
                style={{ maxWidth: '100%' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = import.meta.env.BASE_URL + 'products/logo/logo.webp';
                }}
              />

              {filteredItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-white text-[#1D3A28] border border-[#D9C8A9] flex items-center justify-center shadow-lg hover:bg-[#1D3A28] hover:text-white transition-all z-10"
                  aria-label="Next Image"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between w-full px-3 text-sm">
              <span className="font-semibold text-[#1D3A28] flex items-center gap-2">
                <ImageIcon size={16} className="text-[#C5A059]" />
                <span>{currentItem.title}</span>
              </span>
              {filteredItems.length > 1 && selectedIndex !== null && (
                <span className="text-xs bg-[#1D3A28] text-white px-3 py-1 rounded-full font-mono font-bold">
                  {selectedIndex + 1} / {filteredItems.length}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
