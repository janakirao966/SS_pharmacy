import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { Award, Briefcase, Map, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { trackEvent } from '../utils/analytics';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import CleanCard from '../components/cards/CleanCard';
import FeatureCard from '../components/cards/FeatureCard';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import FormCheckbox from '../components/forms/FormCheckbox';
import SEO from '../components/ui/SEO';
import { supabase } from '../lib/supabase';

export default function Distributor() {
  const { showToast } = useToast();
  const benefits = [
    {
      title: "Consistent Licensed Supply",
      desc: "Direct batch dispatches from our Andhra Pradesh facility ensure stock availability for your target regions."
    },
    {
      title: "Marketing & Packshot Assets",
      desc: "We supply brand leaflets, high-resolution visual packshots, and statutory compliance copy templates."
    },
    {
      title: "Transparent B2B Margins",
      desc: "Competitive wholesale pricing structures with clear retail margins for medical shops and distributors."
    }
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    location: '',
    businessType: '',
    yearsInBusiness: '',
    regions: '',
    capacity: '',
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
    if (name === 'businessName' && !value.trim()) {
      error = "Business Name is required.";
    } else if (name === 'contactPerson' && !value.trim()) {
      error = "Contact Person name is required.";
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
    } else if (name === 'businessType' && !value) {
      error = "Please select a Business Type.";
    } else if (name === 'yearsInBusiness' && !value.trim()) {
      error = "Years in business is required.";
    } else if (name === 'regions' && !value.trim()) {
      error = "Preferred distribution regions are required.";
    } else if (name === 'message' && !value.trim()) {
      error = "Requirements notes are required.";
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
      error = "You must agree to the data usage terms.";
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateStep = (step: number) => {
    const tempErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.businessName.trim()) tempErrors.businessName = "Business Name is required.";
      if (!formData.contactPerson.trim()) tempErrors.contactPerson = "Contact Person name is required.";
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
    } else if (step === 2) {
      if (!formData.location.trim()) tempErrors.location = "City and State are required.";
      if (!formData.businessType) tempErrors.businessType = "Please select a Business Type.";
      if (!formData.yearsInBusiness.trim()) tempErrors.yearsInBusiness = "Years in business is required.";
      if (!formData.regions.trim()) tempErrors.regions = "Preferred distribution regions are required.";
    } else if (step === 3) {
      if (!formData.message.trim()) tempErrors.message = "Requirements notes are required.";
      if (!formData.consent) tempErrors.consent = "You must agree to the data usage terms.";
    }

    setErrors(tempErrors);
    
    const touchedFields: Record<string, boolean> = {};
    if (step === 1) {
      touchedFields.businessName = true;
      touchedFields.contactPerson = true;
      touchedFields.phone = true;
      touchedFields.email = true;
    } else if (step === 2) {
      touchedFields.location = true;
      touchedFields.businessType = true;
      touchedFields.yearsInBusiness = true;
      touchedFields.regions = true;
    } else if (step === 3) {
      touchedFields.message = true;
      touchedFields.consent = true;
    }
    setTouched((prev) => ({ ...prev, ...touchedFields }));

    return Object.keys(tempErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep(3)) return;

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
          subject: `SS_Pharmacy B2B Lead: Partner Application from ${formData.businessName}`,
          from_name: 'SS_Pharmacy Website',
          business_name: formData.businessName,
          contact_person: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          business_type: formData.businessType,
          years_in_business: formData.yearsInBusiness,
          regions: formData.regions,
          capacity: formData.capacity || 'Not Specified',
          notes: formData.message,
          botcheck: formData.botcheck
        })
      });

      try {
        await supabase.from('distributor_applications').insert([
          {
            company_name: formData.businessName,
            contact_person: formData.contactPerson,
            phone: formData.phone,
            email: formData.email,
            city: formData.location,
            state: 'Andhra Pradesh',
            expected_monthly_volume: formData.capacity || 'Not Specified',
            notes: formData.message,
            status: 'new'
          }
        ]);
      } catch (dbErr) {
        console.warn('Supabase DB lead store notice:', dbErr);
      }

      const result = await response.json();
      if (result.success || response.status === 200) {
        setSubmitStatus('success');
        showToast('Application submitted successfully! Our wholesale team will contact you.', 'success');
        trackEvent('Lead', 'Submit', formData.businessName);
        setFormData({
          businessName: '',
          contactPerson: '',
          phone: '',
          email: '',
          location: '',
          businessType: '',
          yearsInBusiness: '',
          regions: '',
          capacity: '',
          message: '',
          consent: false,
          botcheck: false
        });
        setTouched({});
        setCurrentStep(1);
      } else {
        setSubmitStatus('error');
        showToast('Failed to submit application. Please try again.', 'error');
      }
    } catch {
      setSubmitStatus('error');
      showToast('Failed to submit application. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Company Details' },
    { number: 2, title: 'Credentials' },
    { number: 3, title: 'Scope & Terms' }
  ];

  return (
    <div className="distributor-page bg-[#FEFDF8]">
      <SEO
        title="Distributor & Dealer Application - S.S. PHARMACY"
        description="Apply for local distributorship or wholesale dealer account with S.S. PHARMACY, government licensed Ayurvedic manufacturing unit."
        canonical="https://sspharmacy.com/distributor"
      />
      {/* 1. Page Header */}
      <Section className="pt-page-header pb-10 bg-gradient-to-b from-[#F9F6EE] to-[#FEFDF8] border-b border-[#E8E2D2]">
        <Container>
          <Breadcrumbs items={[{ label: 'Partnership' }]} className="mb-6" />
          <div className="distributor-header-block max-w-3xl">
            <SectionHeader
              eyebrow="Wholesale & Dealership Program"
              title="Distributor & Stockist Application"
              subtitle="Partner with S.S. PHARMACY. We offer regional distribution programs for medical stores, Ayurvedic clinics, hospitals, and wholesale dealers."
              align="left"
              isPageHeader
            />
          </div>
        </Container>
      </Section>

      {/* 2. Benefits Grid */}
      <Section className="py-10">
        <Container>
          <SectionHeader
            eyebrow="Partnership Advantages"
            title="Why Partner With S.S. PHARMACY?"
            subtitle="We support your regional growth with dependable supply schedules and promotional collateral."
          />

          <Grid cols={3} gap="lg" className="distributor-benefits-grid mt-10">
            {benefits.map((benefit, i) => (
              <FeatureCard
                key={i}
                icon={i === 0 ? <Briefcase size={22} className="text-[#C5A059]" /> : i === 1 ? <Award size={22} className="text-[#C5A059]" /> : <Map size={22} className="text-[#C5A059]" />}
                title={benefit.title}
                description={benefit.desc}
                className="border border-[#D9C8A9]/70 hover:border-[#C5A059] transition-all bg-white"
              />
            ))}
          </Grid>
        </Container>
      </Section>

      {/* 3. Multi-Step Form Card */}
      <Section className="py-12 md:py-16">
        <Container>
          <CleanCard variant="elevated" className="distributor-form-wrapper max-w-4xl mx-auto border-2 border-[#D9C8A9] shadow-lg bg-white" innerClassName="p-6 sm:p-10 md:p-12">
            {submitStatus === 'success' ? (
              <div className="form-success-box max-w-md mx-auto text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="font-display text-2xl font-semibold text-[#1D3A28]">Application Submitted Successfully!</h3>
                <p className="mt-3 text-secondary text-sm leading-relaxed">
                  Thank you for applying for S.S. PHARMACY distributorship. Our wholesale partnership team will review your credentials and contact you within 1-2 business days.
                </p>
                <Button
                  variant="secondary"
                  className="mt-6 min-h-[44px]"
                  onClick={() => setSubmitStatus('idle')}
                >
                  Submit Another Application
                </Button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <h3 className="bento-cell-title text-center font-display text-2xl text-[#1D3A28] mb-8">Distributor Registration Form</h3>

                {/* Progress Bar */}
                <div className="step-progress-container mb-10 relative">
                  <div className="step-progress-line absolute top-5 left-8 right-8 h-1 bg-[#E8E2D2] z-0">
                    <div
                      className="step-progress-fill h-full bg-[#1D3A28] transition-all duration-500"
                      style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center relative z-10">
                    {steps.map((s) => (
                      <div key={s.number} className="flex flex-col items-center">
                        <div
                          className={`step-bubble rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm transition-all ${
                            currentStep >= s.number
                              ? 'bg-[#1D3A28] text-white ring-4 ring-[#C5A059]/30'
                              : 'bg-[#F5EFE3] text-secondary border border-[#D9C8A9]'
                          }`}
                        >
                          {s.number}
                        </div>
                        <span className={`step-label text-[11px] sm:text-xs font-semibold uppercase tracking-wider mt-2.5 ${currentStep === s.number ? 'text-[#1D3A28] font-bold' : 'text-secondary'}`}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {submitStatus === 'error' && (
                  <div className="form-error-alert flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6" role="alert">
                    <AlertCircle size={18} />
                    <span className="text-sm font-semibold">Failed to submit application. Please check form inputs or try again.</span>
                  </div>
                )}

                {Object.keys(errors).some(k => errors[k]) && Object.keys(touched).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6 flex items-start gap-3 text-xs font-medium" role="alert">
                    <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950 text-sm">Please correct the following fields:</p>
                      <ul className="list-disc list-inside mt-1.5 space-y-1">
                        {Object.entries(errors).filter(([, msg]) => msg).map(([field, msg]) => (
                          <li key={field}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="form-layout-fields space-y-6">
                  {/* Step 1 Content */}
                  {currentStep === 1 && (
                    <div className="step-content-pane space-y-4">
                      <div className="form-panel-header mb-4 pb-2 border-b border-[#E8E2D2]">
                        <h4 className="form-panel-title font-display text-lg font-semibold text-[#1D3A28]">1. Company & Contact Details</h4>
                      </div>
                      
                      <FormInput
                        id="businessName"
                        name="businessName"
                        type="text"
                        label="Business / Company Name"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        error={errors.businessName}
                        success={touched.businessName && !errors.businessName && !!formData.businessName}
                        required
                        autoComplete="organization"
                      />

                      <FormInput
                        id="contactPerson"
                        name="contactPerson"
                        type="text"
                        label="Contact Person Name"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        error={errors.contactPerson}
                        success={touched.contactPerson && !errors.contactPerson && !!formData.contactPerson}
                        required
                        autoComplete="name"
                      />

                      <Grid cols={2} gap="sm">
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
                    </div>
                  )}

                  {/* Step 2 Content */}
                  {currentStep === 2 && (
                    <div className="step-content-pane space-y-4">
                      <div className="form-panel-header mb-4 pb-2 border-b border-[#E8E2D2]">
                        <h4 className="form-panel-title font-display text-lg font-semibold text-[#1D3A28]">2. Business Credentials</h4>
                      </div>

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
                        id="businessType"
                        name="businessType"
                        label="Business Type"
                        value={formData.businessType}
                        onChange={handleInputChange}
                        error={errors.businessType}
                        options={[
                          { value: 'medical-shop', label: 'Medical Shop / Pharmacy' },
                          { value: 'ayurvedic-clinic', label: 'Ayurvedic Clinic' },
                          { value: 'distributor', label: 'Regional Distributor' },
                          { value: 'wholesaler', label: 'Wholesale Dealer' },
                          { value: 'hospital', label: 'Hospital / Nursing Home' },
                          { value: 'other', label: 'Other Business Entity' }
                        ]}
                        required
                      />

                      <Grid cols={2} gap="sm">
                        <FormInput
                          id="yearsInBusiness"
                          name="yearsInBusiness"
                          type="number"
                          min="0"
                          label="Years in Business"
                          value={formData.yearsInBusiness}
                          onChange={handleInputChange}
                          error={errors.yearsInBusiness}
                          success={touched.yearsInBusiness && !errors.yearsInBusiness && !!formData.yearsInBusiness}
                          required
                          autoComplete="off"
                        />

                        <FormInput
                          id="regions"
                          name="regions"
                          type="text"
                          label="Preferred Distribution Region(s)"
                          value={formData.regions}
                          onChange={handleInputChange}
                          error={errors.regions}
                          success={touched.regions && !errors.regions && !!formData.regions}
                          required
                          autoComplete="off"
                        />
                      </Grid>
                    </div>
                  )}

                  {/* Step 3 Content */}
                  {currentStep === 3 && (
                    <div className="step-content-pane space-y-4">
                      <div className="form-panel-header mb-4 pb-2 border-b border-[#E8E2D2]">
                        <h4 className="form-panel-title font-display text-lg font-semibold text-[#1D3A28]">3. Scope & Partnership Details</h4>
                      </div>

                      <FormInput
                        id="capacity"
                        name="capacity"
                        type="text"
                        label="Current Business Capacity / Monthly Volume (Optional)"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        success={touched.capacity && !errors.capacity && !!formData.capacity}
                        autoComplete="off"
                      />

                      <FormTextarea
                        id="message"
                        name="message"
                        label="Partnership Notes / Special Requirements"
                        value={formData.message}
                        onChange={handleInputChange}
                        error={errors.message}
                        required
                      />

                      <FormCheckbox
                        name="consent"
                        label="I agree to be contacted by S.S. PHARMACY regarding my distributorship application."
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
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="form-steps-nav-buttons flex justify-between items-center pt-6 border-t border-[#E8E2D2] mt-8">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePrevStep}
                        disabled={isSubmitting}
                        className="flex items-center space-x-2 min-h-[44px] px-6"
                      >
                        <ChevronLeft size={16} />
                        <span>Back</span>
                      </Button>
                    ) : (
                      <div />
                    )}

                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleNextStep}
                        disabled={isSubmitting}
                        className="flex items-center space-x-2 min-h-[44px] px-6 bg-[#1D3A28] text-white hover:bg-[#2D5016]"
                      >
                        <span>Next Step</span>
                        <ChevronRight size={16} />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        className="flex items-center space-x-2 min-h-[44px] px-8 bg-[#1D3A28] text-white hover:bg-[#2D5016]"
                        aria-live="polite"
                      >
                        <span>{isSubmitting ? 'Sending Application...' : 'Submit Application'}</span>
                        <ArrowRight size={16} />
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </CleanCard>
        </Container>
      </Section>
    </div>
  );
}
