import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { Phone, Mail, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { products } from '../data/products';
import { useToast } from '../context/ToastContext';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import CleanCard from '../components/cards/CleanCard';
import InfoCard from '../components/cards/InfoCard';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import FormCheckbox from '../components/forms/FormCheckbox';
import SEO from '../components/ui/SEO';

// Reading this as: General enquiry form and contact details page for Ayurvedic facility, with a clean B2B responsive split layout, utilizing modular floating-label form controls and info detail cards.
// DESIGN_VARIANCE: 6
// MOTION_INTENSITY: 5
// VISUAL_DENSITY: 3

export default function Contact() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: '',
    product: '',
    message: '',
    consent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validationTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timeouts = validationTimeouts.current;
    // Cleanup timeouts on unmount
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) {
      error = "Name is required.";
    } else if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      const hasPlus = value.trim().startsWith('+');
      if (!value.trim()) {
        error = "Phone number is required.";
      } else if (digits.length < 10 || digits.length > 15) {
        error = "Enter a valid phone number (10 to 15 digits).";
      } else if (hasPlus && !/^\+?[0-9\s-()]+$/.test(value.trim())) {
        error = "Phone number contains invalid characters.";
      } else if (!hasPlus && !/^[0-9\s-()]+$/.test(value.trim())) {
        error = "Phone number contains invalid characters.";
      }
    } else if (name === 'email') {
      if (!value.trim()) {
        error = "Email is required.";
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
        error = "Enter a valid email address (e.g. name@domain.com).";
      }
    } else if (name === 'location' && !value.trim()) {
      error = "City and State are required.";
    } else if (name === 'message' && !value.trim()) {
      error = "Message details are required.";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Auto-format phone input
    let finalValue = value;
    if (name === 'phone') {
      finalValue = value.replace(/[^\d\s\-()+]/g, '');
      if (finalValue.indexOf('+') > 0) {
        finalValue = finalValue.charAt(0) + finalValue.slice(1).replace(/\+/g, '');
      }
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    // Debounced inline validation
    if (validationTimeouts.current[name]) {
      clearTimeout(validationTimeouts.current[name]);
    }
    validationTimeouts.current[name] = setTimeout(() => {
      validateField(name, finalValue);
    }, 500);
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    let error = '';
    if (name === 'consent' && !checked) {
      error = "You must agree to the contact terms.";
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.name.trim()) tempErrors.name = "Name is required.";
    if (!formData.phone.trim()) {
      tempErrors.phone = "Phone number is required.";
    } else if (!/^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim()) || formData.phone.replace(/[^\d]/g, '').length < 10) {
      tempErrors.phone = "Enter a valid phone number (10 to 15 digits).";
    }
    if (!formData.email.trim()) {
      tempErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      tempErrors.email = "Enter a valid email address.";
    }
    if (!formData.location.trim()) tempErrors.location = "City and State are required.";
    if (!formData.message.trim()) tempErrors.message = "Message details are required.";
    if (!formData.consent) tempErrors.consent = "You must agree to the contact terms.";

    setErrors(tempErrors);
    
    // Mark all as touched
    setTouched({
      name: true,
      phone: true,
      email: true,
      location: true,
      message: true,
      consent: true
    });

    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const web3formsAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE';

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          access_key: web3formsAccessKey,
          subject: `SS_Pharmacy Lead: General Enquiry from ${formData.name}`,
          from_name: 'SS_Pharmacy Website',
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          product: formData.product || 'Not Specified',
          message: formData.message
        })
      });

      const result = await response.json();
      if (result.success || response.status === 200) {
        setSubmitStatus('success');
        showToast('Enquiry submitted successfully! We will contact you soon.', 'success');
        setFormData({
          name: '',
          phone: '',
          email: '',
          location: '',
          product: '',
          message: '',
          consent: false
        });
        setTouched({});
      } else {
        setSubmitStatus('error');
        showToast('Failed to submit. Please try again.', 'error');
      }
    } catch {
      setSubmitStatus('error');
      showToast('Failed to submit. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productOptions = products.map((p) => ({
    value: p.name,
    label: p.name
  }));

  return (
    <div className="contact-page">
      <SEO
        title="Contact Us - S.S. PHARMACY"
        description="Get in touch with S.S. PHARMACY Kadapa headquarters for retail orders, clinic supply requests, and distributor program enquiries."
        canonical="https://sspharmacy.com/contact"
      />
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Contact' }]} className="mb-6" />
          <div className="contact-header-block">
            <SectionHeader
              eyebrow="Connect"
              title="Contact S.S. PHARMACY"
              subtitle="Submit general product inquiries, supply requests, or feedback to our team."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Contact Details & Form */}
      <Section className="pb-24 pt-4">
        <Container>
          <div className="contact-layout-grid">
            {/* Info cards column */}
            <div className="contact-info-cards-column flex flex-col space-y-4">
              <InfoCard
                icon={<Phone size={18} />}
                title="Call or WhatsApp"
              >
                <p className="mt-1 text-secondary">Primary: +91 9494323211</p>
                <p className="text-secondary">Office: +91 8563 274701</p>
              </InfoCard>

              <InfoCard
                icon={<Mail size={18} />}
                title="Email Dispatch"
              >
                <p className="mt-1 text-secondary">General: info@sspharmacy.com</p>
                <p className="text-secondary">Dealers: partners@sspharmacy.com</p>
              </InfoCard>

              <InfoCard
                icon={<Clock size={18} />}
                title="Business Hours"
              >
                <p className="mt-1 text-secondary">Monday to Saturday</p>
                <p className="text-secondary">09:00 AM to 06:00 PM IST</p>
              </InfoCard>

              <InfoCard
                icon={<MapPin size={18} />}
                title="Manufacturing Unit"
              >
                <p className="mt-1 text-secondary">Prakash Nagar, Yerraguntla,</p>
                <p className="text-secondary">YSR Kadapa Dist, AP - 516309</p>
              </InfoCard>
            </div>

            {/* Form column */}
            <div className="contact-form-column">
              <CleanCard variant="elevated" innerClassName="contact-form-box">
                {submitStatus === 'success' ? (
                  <div className="form-success-box">
                    <div className="success-icon-wrapper">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3>Enquiry Sent</h3>
                    <p className="mt-4">
                      Thank you for contacting S.S. PHARMACY. Our team will review your enquiry and respond with the relevant product details and next steps.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-6"
                      onClick={() => setSubmitStatus('idle')}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="form-layout-fields">
                    <h3 className="bento-cell-title mb-6">General Enquiry Form</h3>

                    {submitStatus === 'error' && (
                      <div className="form-error-alert flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">
                        <AlertCircle size={18} />
                        <span className="text-sm font-semibold">Failed to deliver enquiry. Please try again.</span>
                      </div>
                    )}

                    <FormInput
                      id="name"
                      name="name"
                      type="text"
                      label="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      error={errors.name}
                      success={touched.name && !errors.name && !!formData.name}
                      required
                      autoComplete="name"
                    />

                    <Grid cols={2} gap="sm" className="mb-4">
                      <FormInput
                        id="phone"
                        name="phone"
                        type="tel"
                        label="Phone Number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={errors.phone}
                        success={touched.phone && !errors.phone && !!formData.phone}
                        required
                        autoComplete="tel"
                      />

                      <FormInput
                        id="email"
                        name="email"
                        type="email"
                        label="Email Address"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={errors.email}
                        success={touched.email && !errors.email && !!formData.email}
                        required
                        autoComplete="email"
                      />
                    </Grid>

                    <FormInput
                      id="location"
                      name="location"
                      type="text"
                      label="Location (City, State)"
                      value={formData.location}
                      onChange={handleInputChange}
                      error={errors.location}
                      success={touched.location && !errors.location && !!formData.location}
                      required
                      autoComplete="address-level2"
                    />

                    <FormSelect
                      id="product"
                      name="product"
                      label="Interested Product (Optional)"
                      value={formData.product}
                      onChange={handleInputChange}
                      options={productOptions}
                    />

                    <FormTextarea
                      id="message"
                      name="message"
                      label="Message / Requirements"
                      value={formData.message}
                      onChange={handleInputChange}
                      error={errors.message}
                      required
                    />

                    <FormCheckbox
                      name="consent"
                      label="I agree to be contacted by S.S. PHARMACY regarding my enquiry."
                      checked={formData.consent}
                      onChange={(e) => handleCheckboxChange('consent', e.target.checked)}
                      error={errors.consent}
                      required
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-4 justify-center"
                      loading={isSubmitting}
                      aria-live="polite"
                    >
                      {isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}
                    </Button>
                  </form>
                )}
              </CleanCard>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
