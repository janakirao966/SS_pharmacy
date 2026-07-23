import { useNavigate, Link } from 'react-router-dom';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import CleanCard from '../components/cards/CleanCard';
import { Compass, BookOpen, Factory, PhoneCall, Home } from 'lucide-react';
import SEO from '../components/ui/SEO';

export default function NotFound() {
  const navigate = useNavigate();

  const suggestions = [
    { label: 'Product Catalogue', path: '/products', desc: 'Browse our Ayurvedic remedies', icon: <Compass size={18} /> },
    { label: 'Manufacturing Unit', path: '/manufacturing', desc: 'Learn about our GMP facility', icon: <Factory size={18} /> },
    { label: 'About Us', path: '/about', desc: 'Our heritage and credentials', icon: <BookOpen size={18} /> },
    { label: 'Contact Us', path: '/contact', desc: 'Get in touch for distribution', icon: <PhoneCall size={18} /> }
  ];

  return (
    <div className="not-found-page">
      <SEO
        title="Page Not Found - S.S. PHARMACY"
        description="The requested page could not be found. Return to S.S. PHARMACY home page."
        canonical="https://sspharmacy.com/404"
      />
      <Section className="pt-page-header pb-12 md:pb-16 lg:pb-24">
        <Container className="flex flex-col items-center max-w-[680px] mx-auto text-center">
          <SectionHeader
            eyebrow="Error 404"
            title="Page Not Found"
            subtitle="The Ayurvedic formulation page or resource you are looking for does not exist or has been relocated."
            align="center"
            isPageHeader
          />
          
          <CleanCard variant="default" className="w-full mt-8" innerClassName="not-found-card-inner">
            <h4 className="font-display text-md text-[#3D6B20] font-semibold mb-6">Perhaps these pages might help:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
              {suggestions.map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="not-found-suggestion-link"
                >
                  <div className="text-[#9B7B35] mt-0.5">{item.icon}</div>
                  <div>
                    <span className="block text-sm font-semibold text-[#3D6B20]">{item.label}</span>
                    <span className="block text-xs text-secondary mt-0.5">{item.desc}</span>
                  </div>
                </Link>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="mx-auto flex items-center justify-center space-x-2"
            >
              <Home size={16} />
              <span>Return to Home</span>
            </Button>
          </CleanCard>
        </Container>
      </Section>
    </div>
  );
}
