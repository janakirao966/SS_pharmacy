import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { Phone, Mail, Clock, MapPin, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
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
import { supabase } from '../lib/supabase';

export default function Contact() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: '',
    product: '',
    message: '',
    consent: false,
    botcheck: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validationTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timeouts = validationTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) {
      error = "Full Name is required.";
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
        error = "Email Address is required.";
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) {
        error = "Enter a valid email address (e.g. name@domain.com).";
      }
    } else if (name === 'location' && !value.trim()) {
      error = "Location (City, State) is required.";
    } else if (name === 'message' && !value.trim()) {
      error = "Enquiry Message is required.";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    let finalValue = value;
    if (name === 'phone') {
      finalValue = value.replace(/[^\d\s\-()+]/g, '');
      if (finalValue.indexOf('+') > 0) {
        finalValue = finalValue.charAt(0) + finalValue.slice(1).replace(/\+/g, '');
      }
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

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

    if (!formData.name.trim()) tempErrors.name = 'Full Name is required.';
    if (!formData.phone.trim()) {
      tempErrors.phone = 'Phone Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      tempErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!formData.email.trim()) {
      tempErrors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      tempErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.location.trim()) tempErrors.location = 'City / Location is required.';
    if (!formData.message.trim()) tempErrors.message = 'Enquiry Message is required.';
    if (!formData.consent) tempErrors.consent = 'You must consent to be contacted.';

    setErrors(tempErrors);
    setTouched({
      name: true,
      phone: true,
      email: true,
      location: true,
      message: true,
      consent: true
    });

    const isValid = Object.keys(tempErrors).length === 0;
    if (!isValid) {
      const firstErrorField = Object.keys(tempErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstErrorField);
        el?.focus();
      }, 50);
    }

    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (formData.botcheck) {
      console.warn('Bot attempt blocked');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const { data, error: dbError } = await supabase.rpc('create_support_ticket', {
        p_customer_name: formData.name.trim(),
        p_customer_email: formData.email.trim(),
        p_customer_phone: formData.phone.trim(),
        p_category: 'GENERAL',
        p_subject: formData.product ? `Enquiry regarding ${formData.product}` : 'General Contact Enquiry',
        p_description: formData.message.trim(),
        p_source: 'contact_form'
      });

      if (!dbError && data?.success) {
        setSubmitStatus('success');
        showToast(`Enquiry submitted! Ticket #${data.ticket_number} created.`, 'success');
        setFormData({
          name: '',
          phone: '',
          email: '',
          location: '',
          product: '',
          message: '',
          consent: false,
          botcheck: false
        });
        setTouched({});
      } else {
        console.error('Supabase contact submission error:', dbError);
        setSubmitStatus('error');
        showToast('Failed to submit enquiry. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error submitting contact enquiry:', err);
      setSubmitStatus('error');
      showToast('Failed to submit enquiry. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productOptions = products.map((p) => ({
    value: p.name,
    label: p.name
  }));

  return (
    <div className="contact-page bg-[#FEFDF8]">
      <SEO
        title="Contact Us - S.S. PHARMACY"
        description="Get in touch with S.S. PHARMACY Kadapa headquarters for retail orders, clinic supply requests, and distributor program enquiries."
        canonical="https://sspharmacy.com/contact"
        schema={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact S.S. PHARMACY",
          "url": "https://sspharmacy.com/contact",
          "mainEntity": {
            "@type": "MedicalBusiness",
            "name": "S.S. PHARMACY",
            "telephone": "+919494323211",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "D. No. 1-2-211 & 1-2-212, Prakash Nagar, Yerraguntla Panchayati",
              "addressLocality": "YSR Kadapa District",
              "addressRegion": "Andhra Pradesh",
              "postalCode": "516309",
              "addressCountry": "IN"
            }
          }
        }}
      />
      {/* 1. Page Header */}
      <Section className="pt-page-header pb-10 bg-gradient-to-b from-[#F9F6EE] to-[#FEFDF8] border-b border-[#E8E2D2]">
        <Container>
          <Breadcrumbs items={[{ label: 'Contact' }]} className="mb-6" />
          <div className="contact-header-block max-w-3xl">
            <SectionHeader
              eyebrow="Connect With Our Team"
              title="Contact S.S. PHARMACY"
              subtitle="Have questions about our Ayurvedic products, retail supply, or regional dealership opportunities? Send us your message or reach out directly."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Contact Details & Form */}
      <Section className="py-12 md:py-16">
        <Container>
          <div className="contact-layout-grid grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            {/* Info cards column */}
            <div className="lg:col-span-4 contact-info-cards-column flex flex-col space-y-4">
              <InfoCard
                icon={<Phone size={20} className="text-[#C5A059]" />}
                title="Call or WhatsApp"
                className="contact-detail-card border border-[#D9C8A9]/70 bg-white hover:border-[#C5A059] transition-all"
              >
                <div className="mt-3 flex flex-col space-y-1.5 text-sm">
                  <a href="tel:+919494323211" className="text-[#1D3A28] font-semibold hover:text-[#C5A059] transition-colors flex items-center gap-2">
                    <span className="text-secondary font-normal">Primary:</span> +91 9494323211
                  </a>
                  <a href="tel:+918563274701" className="text-[#1D3A28] font-semibold hover:text-[#C5A059] transition-colors flex items-center gap-2">
                    <span className="text-secondary font-normal">Office:</span> +91 8563 274701
                  </a>
                </div>
              </InfoCard>

              <InfoCard
                icon={<Mail size={20} className="text-[#C5A059]" />}
                title="Email Dispatch"
                className="contact-detail-card border border-[#D9C8A9]/70 bg-white hover:border-[#C5A059] transition-all"
              >
                <div className="mt-3 flex flex-col space-y-1.5 text-sm">
                  <a href="mailto:info@sspharmacy.com" className="text-[#1D3A28] font-semibold hover:text-[#C5A059] transition-colors flex items-center gap-2">
                    <span className="text-secondary font-normal">General:</span> info@sspharmacy.com
                  </a>
                  <a href="mailto:partners@sspharmacy.com" className="text-[#1D3A28] font-semibold hover:text-[#C5A059] transition-colors flex items-center gap-2">
                    <span className="text-secondary font-normal">Dealers:</span> partners@sspharmacy.com
                  </a>
                </div>
              </InfoCard>

              <InfoCard
                icon={<Clock size={20} className="text-[#C5A059]" />}
                title="Business Hours"
                className="contact-detail-card border border-[#D9C8A9]/70 bg-white hover:border-[#C5A059] transition-all"
              >
                <div className="mt-3 text-sm text-secondary space-y-1">
                  <p className="font-semibold text-[#1D3A28]">Monday to Saturday</p>
                  <p>09:00 AM to 06:00 PM IST</p>
                </div>
              </InfoCard>

              <InfoCard
                icon={<MapPin size={20} className="text-[#C5A059]" />}
                title="Manufacturing Facility"
                className="contact-detail-card border border-[#D9C8A9]/70 bg-white hover:border-[#C5A059] transition-all"
              >
                <div className="mt-3 text-sm text-secondary space-y-1.5">
                  <p className="font-semibold text-[#1D3A28]">D. No. 1-2-211 & 1-2-212, Prakash Nagar,</p>
                  <p>Yerraguntla Panchayati, YSR Kadapa Dist, AP - 516309</p>
                  <a
                    href="https://maps.app.goo.gl/UwgF81SSMDMUAEFV8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D3A28] hover:text-[#C5A059] mt-3 min-h-[44px] transition-colors"
                  >
                    <MapPin size={14} className="text-[#C5A059]" />
                    <span>View on Google Maps &rarr;</span>
                  </a>
                </div>
              </InfoCard>
            </div>

            {/* Form column */}
            <div className="lg:col-span-8 contact-form-column">
              <CleanCard variant="elevated" innerClassName="contact-form-box p-6 sm:p-10 border-2 border-[#D9C8A9] bg-white shadow-lg">
                {submitStatus === 'success' ? (
                  <div className="form-success-box text-center py-8 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#1D3A28]">Enquiry Sent Successfully!</h3>
                    <p className="mt-3 text-secondary text-sm leading-relaxed">
                      Thank you for contacting S.S. PHARMACY. Our team will review your enquiry and respond promptly with the requested details.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-6 min-h-[44px]"
                      onClick={() => setSubmitStatus('idle')}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="form-layout-fields space-y-5">
                    <h3 className="bento-cell-title font-display text-2xl font-semibold text-[#1D3A28] mb-6">General Enquiry Form</h3>

                    {submitStatus === 'error' && (
                      <div className="form-error-alert flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">
                        <AlertCircle size={18} />
                        <span className="text-sm font-semibold">Failed to deliver enquiry. Please check form input and try again.</span>
                      </div>
                    )}

                    {Object.keys(errors).some(k => errors[k]) && Object.keys(touched).length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6 flex items-start gap-3 text-xs font-medium" role="alert" aria-live="assertive">
                        <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-950 text-sm">Please correct the following errors:</p>
                          <ul className="list-disc list-inside mt-1.5 space-y-1">
                            {Object.entries(errors).filter(([, msg]) => msg).map(([field, msg]) => (
                              <li key={field}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <Grid cols={2} gap="sm">
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
                    </Grid>

                    <Grid cols={2} gap="sm">
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
                    </Grid>

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
                      label="Message / Product Requirements"
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

                    <input
                      type="checkbox"
                      name="botcheck"
                      className="hidden"
                      style={{ display: 'none' }}
                      checked={formData.botcheck}
                      onChange={(e) => handleCheckboxChange('botcheck', e.target.checked)}
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-4 justify-center bg-[#1D3A28] text-white hover:bg-[#2D5016] min-h-[44px] mt-4 font-semibold text-base"
                      loading={isSubmitting}
                      disabled={isSubmitting}
                      aria-live="polite"
                    >
                      <span>{isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}</span>
                      <ArrowRight size={18} className="ml-2" />
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
