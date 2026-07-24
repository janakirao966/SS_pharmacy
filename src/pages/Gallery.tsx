import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
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

  const handleOpenLightbox = (src: string, title: string) => {
    setSelectedImage(src);
    setSelectedTitle(title);
  };

  const handleCloseLightbox = () => {
    setSelectedImage(null);
  };

  return (
    <div className="gallery-page">
      <SEO
        title="Product & Packaging Gallery - S.S. PHARMACY"
        description="View authentic product packshots, label graphics, and licensed manufacturing facility visual assets of S.S. PHARMACY."
        canonical="https://sspharmacy.com/gallery"
      />
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Gallery' }]} className="mb-6" />
          <div className="gallery-header-block">
            <SectionHeader
              eyebrow="Visual Assets"
              title="Product & Packaging Gallery"
              subtitle="Explore authentic packshots, label graphics, and product visuals for S.S. PHARMACY."
              align="left"
              isPageHeader
            />

            {/* Filter Pills */}
            <div className="gallery-filters-row mt-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill-btn ${activeFilter === cat ? 'active' : ''}`}
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
      <Section className="pt-6 md:pt-8 pb-12 md:pb-16 lg:pb-24">
        <Container>
          <Grid cols={3} gap="md" className="gallery-layout-grid-container">
            {filteredItems.map((item, index) => (
              <CleanCard
                key={index}
                variant="default"
                interactive
                onClick={() => handleOpenLightbox(item.src, item.title)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenLightbox(item.src, item.title);
                  }
                }}
                className="gallery-item-card-outer"
                innerClassName="gallery-item-card"
                aria-label={`View enlarged ${item.title}`}
              >
                <div className="gallery-image-box">
                  <img src={item.src} alt={item.title} className="gallery-img" width={400} height={300} loading="lazy" decoding="async" />
                  <div className="gallery-hover-overlay">
                    <ZoomIn size={24} className="text-light" />
                  </div>
                </div>
                <div className="gallery-info-bar mt-4">
                  <Badge variant="status">{item.category}</Badge>
                  <h5 className="mt-2 font-display text-md text-brand-primary">{item.title}</h5>
                </div>
              </CleanCard>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* 3. Lightbox Modal */}
      <Modal isOpen={!!selectedImage} onClose={handleCloseLightbox} title={selectedTitle}>
        {selectedImage && (
          <div className="lightbox-content flex flex-col items-center justify-center p-2">
            <img
              src={selectedImage}
              alt={selectedTitle}
              className="max-h-[70vh] object-contain rounded-lg"
              style={{ maxWidth: '100%' }}
            />
            <p className="mt-4 text-sm text-secondary font-medium">{selectedTitle}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
