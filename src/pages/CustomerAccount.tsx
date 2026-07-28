import { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  ShoppingBag,
  PackageCheck,
  Clock,
  Truck,
  CheckCircle2,
  Receipt,
  ExternalLink,
  Award,
  MapPin,
  HelpCircle,
  Compass,
  Plus,
  Edit2,
  Trash2,
  Navigation,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { UserProfileSidebar } from '../components/ui/UserProfileSidebar';

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  tag: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
}

export default function CustomerAccount() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { products } = useProducts();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'addresses' | 'support'>('dashboard');

  // Address Modal & Form State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [addressForm, setAddressForm] = useState<Omit<SavedAddress, 'id'>>({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    pincode: '',
    tag: 'Home',
    isDefault: false
  });

  const addressModalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const currentUser = sessionData.session.user;
          setUser(currentUser);
          await fetchUserProfile(currentUser.id);
          await fetchCustomerOrders(currentUser.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session load error:', err);
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  // Focus management & Escape key close for Address Modal
  useEffect(() => {
    if (isAddressModalOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstInput = addressModalRef.current?.querySelector('input') as HTMLElement;
        const closeBtn = addressModalRef.current?.querySelector('.address-close-btn') as HTMLElement;
        (firstInput || closeBtn)?.focus();
      }, 50);
    } else {
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }
  }, [isAddressModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddressModalOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const container = addressModalRef.current;
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

    if (isAddressModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddressModalOpen]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  const fetchCustomerOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), shipments(*), refunds(*), invoices(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const fetchedOrders = data as any[];
        setOrders(fetchedOrders);
      }
      await fetchSavedAddresses(userId);
    } catch (err) {
      console.error('Fetch customer orders error:', err);
      await fetchSavedAddresses(userId);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', userId)
        .order('is_default', { ascending: false });

      if (!error && data) {
        const mapped: SavedAddress[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          address: d.address,
          city: d.city,
          state: d.state,
          pincode: d.pincode,
          tag: d.tag as 'Home' | 'Office' | 'Other',
          isDefault: d.is_default
        }));
        setSavedAddresses(mapped);
      } else {
        setSavedAddresses([]);
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
      setSavedAddresses([]);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrders([]);
    setSavedAddresses([]);
    showToast('Signed out successfully', 'info');
    navigate('/');
  };

  const handleOpenAddressModal = (addressToEdit?: SavedAddress) => {
    if (addressToEdit) {
      setEditingAddressId(addressToEdit.id);
      setAddressForm({
        name: addressToEdit.name,
        phone: addressToEdit.phone,
        address: addressToEdit.address,
        city: addressToEdit.city,
        state: addressToEdit.state,
        pincode: addressToEdit.pincode,
        tag: addressToEdit.tag,
        isDefault: addressToEdit.isDefault
      });
    } else {
      setEditingAddressId(null);
      setAddressForm({
        name: profile?.full_name || user?.user_metadata?.full_name || '',
        phone: profile?.phone || user?.phone || '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        tag: 'Home',
        isDefault: savedAddresses.length === 0
      });
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.address || !addressForm.city || !addressForm.pincode) {
      showToast('Please fill in all required address fields', 'info');
      return;
    }

    setLoading(true);
    try {
      if (editingAddressId) {
        // Update existing address details (leave is_default = false first to prevent index collision)
        const { error } = await supabase
          .from('addresses')
          .update({
            name: addressForm.name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            state: addressForm.state,
            pincode: addressForm.pincode,
            tag: addressForm.tag
          })
          .eq('id', editingAddressId);

        if (error) throw error;

        // Perform transactional default toggling if selected
        if (addressForm.isDefault) {
          const { error: defaultError } = await supabase.rpc('set_default_address', {
            p_address_id: editingAddressId
          });
          if (defaultError) throw defaultError;
        }

        showToast('Delivery address updated', 'success');
      } else {
        // Insert new address with is_default = false (to avoid index collision)
        const { data: newAddr, error } = await supabase
          .from('addresses')
          .insert({
            profile_id: user.id,
            name: addressForm.name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            state: addressForm.state,
            pincode: addressForm.pincode,
            tag: addressForm.tag,
            is_default: false
          })
          .select()
          .single();

        if (error) throw error;

        // Perform transactional default setting
        if (addressForm.isDefault || savedAddresses.length === 0) {
          const { error: defaultError } = await supabase.rpc('set_default_address', {
            p_address_id: newAddr.id
          });
          if (defaultError) throw defaultError;
        }

        showToast('New delivery address added', 'success');
      }

      await fetchSavedAddresses(user.id);
      setIsAddressModalOpen(false);
    } catch (err: any) {
      console.error('Save address error:', err);
      showToast(err.message || 'Error saving address', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setLoading(true);
    try {
      const addressToDelete = savedAddresses.find((item) => item.id === id);
      const wasDefault = addressToDelete?.isDefault;

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Delivery address removed', 'info');

      // Unset/re-assign default address safely via server-side logic
      const remaining = savedAddresses.filter((item) => item.id !== id);
      if (wasDefault && remaining.length > 0) {
        const { error: defaultError } = await supabase.rpc('set_default_address', {
          p_address_id: remaining[0].id
        });
        if (defaultError) throw defaultError;
      }

      await fetchSavedAddresses(user.id);
    } catch (err: any) {
      console.error('Delete address error:', err);
      showToast(err.message || 'Error deleting address', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_default_address', {
        p_address_id: id
      });
      if (error) throw error;

      showToast('Primary delivery address updated', 'success');
      await fetchSavedAddresses(user.id);
    } catch (err: any) {
      console.error('Set default address error:', err);
      showToast(err.message || 'Error setting default address', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || 'Andhra Pradesh';
            const pincode = addr.postcode || '';
            const road = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');

            setAddressForm((prev) => ({
              ...prev,
              address: road || prev.address,
              city: city || prev.city,
              state: state || prev.state,
              pincode: pincode || prev.pincode
            }));
            showToast(`Location detected: ${city}, ${state}`, 'success');
          } else {
            showToast('Current GPS coordinates detected', 'info');
          }
        } catch {
          showToast('GPS coordinates acquired. Please verify address fields.', 'info');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        showToast('Unable to retrieve GPS location. Please check browser location permissions.', 'info');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 1;
      case 'processing':
      case 'packed':
        return 2;
      case 'shipped':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4 bg-[#FEFDF8]">
        <div className="w-10 h-10 border-3 border-[#1D3A28]/20 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const rawName = profile?.full_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Member');
  const memberName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const memberInitials = memberName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'M';
  const memberPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';

  const sidebarUser = {
    name: memberName,
    email: user.email || '',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=1D3A28&color=C5A059&bold=true`
  };

  const sidebarNavItems = [
    {
      label: 'My Orders',
      href: '#orders',
      icon: <ShoppingBag className="w-full h-full" />,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); setActiveTab('orders'); }
    },
    {
      label: 'Delivery Addresses',
      href: '#addresses',
      icon: <MapPin className="w-full h-full" />,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); setActiveTab('addresses'); }
    },
    {
      label: 'Support Portal',
      href: '#support',
      icon: <HelpCircle className="w-full h-full" />,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); setActiveTab('support'); }
    },
    {
      label: 'Browse Formulations',
      href: '/products',
      icon: <Compass className="w-full h-full" />,
      isSeparator: true,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); navigate('/products'); }
    },
    {
      label: 'Track Orders Live',
      href: '/track-order',
      icon: <Truck className="w-full h-full" />,
      onClick: (e: React.MouseEvent) => { e.preventDefault(); navigate('/track-order'); }
    }
  ];

  const sidebarLogoutItem = {
    label: 'Sign Out',
    icon: <LogOut className="w-full h-full" />,
    onClick: handleSignOut
  };

  return (
    <div className="account-portal-wrap">
      <SEO title="My Account | S.S. PHARMACY" description="Customer profile and order tracking portal." />

      <div className="account-portal-container">
        {/* Breadcrumb Bar */}
        <div className="account-breadcrumb-bar">
          <button onClick={() => navigate('/')} className="account-breadcrumb-btn">Home</button>
          <span>/</span>
          <span className="account-breadcrumb-current">My Member Account</span>
        </div>

        {/* REFINED COMPACT MEMBER HEADER CARD */}
        <div className="member-compact-card">
          <div className="member-info-group">
            <div className="member-avatar-ring">
              {memberInitials}
            </div>
            <div className="member-details-column">
              <span className="member-badge-pill">
                <Award size={13} />
                <span>VERIFIED AYURVEDIC MEMBER · SINCE 2025</span>
              </span>
              <h1 className="member-greeting-heading">
                Good Evening, {memberName}
              </h1>
              <p className="member-meta-text">
                {user.email} {memberPhone && `· ${memberPhone}`}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="member-action-ctas">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="member-btn-gold"
            >
              <Compass size={14} />
              <span>Browse Formulations</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/track-order')}
              className="member-btn-gold"
            >
              <Truck size={14} />
              <span>Track Orders</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="member-btn-signout"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* TABBED SUB-NAVIGATION BAR */}
        <div className="relative">
          <div className="account-nav-bar-refined" role="tablist">
            <button
              type="button"
              className={`account-nav-tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>

            <button
              type="button"
              className={`account-nav-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              My Orders ({orders.length})
            </button>

            <button
              type="button"
              className={`account-nav-tab-item ${activeTab === 'addresses' ? 'active' : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              Addresses ({savedAddresses.length})
            </button>

            <button
              type="button"
              className={`account-nav-tab-item ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              Support
            </button>
          </div>
        </div>

        {/* TAB 1 & 2: DASHBOARD / ORDERS OVERVIEW */}
        {(activeTab === 'dashboard' || activeTab === 'orders') && (
          <div>
            {orders.length === 0 ? (
              <div className="account-empty-state-card">
                <div className="account-empty-icon-box">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h2 className="account-empty-heading">No Orders Yet</h2>
                  <p className="account-empty-desc">
                    Your Ayurvedic formulations and delivery updates will appear here once you place a purchase order.
                  </p>
                </div>

                <div className="account-empty-actions">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/products')}
                    className="bg-[#1D3A28] hover:bg-[#2D5016] text-white py-3 px-8 rounded-full font-bold text-xs"
                  >
                    Explore Formulations Catalog
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/track-order')}
                    className="border-[#E8E5DE] text-[#1F2A22] hover:bg-[#F7F6F3] py-3 px-6 rounded-full font-bold text-xs"
                  >
                    Track Guest Order
                  </Button>
                </div>
              </div>
            ) : (
              <div className="account-dashboard-layout">
                {/* LEFT MAIN COLUMN (70%) */}
                <div className="account-main-column">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                    <h2 className="font-display text-xl font-bold text-[#1D3A28] m-0">Recent Orders</h2>
                    <span className="text-xs text-[#667068] font-mono">Showing {orders.length} order(s)</span>
                  </div>

                  {orders.map((order) => {
                    const statusStep = getStatusStep(order.order_status);
                    return (
                      <div key={order.id} className="order-card-refined space-y-5 text-left">
                        {/* Header Row */}
                        <div className="order-card-header">
                          <div>
                            <span className="order-card-ref-title">Order Reference</span>
                            <span className="order-card-ref-num">{order.order_number}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#667068]">
                              {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span
                              className={`order-card-status-pill ${
                                order.order_status === 'delivered'
                                  ? 'status-pill-delivered'
                                  : order.order_status === 'shipped'
                                  ? 'status-pill-shipped'
                                  : 'status-pill-pending'
                              }`}
                            >
                              {order.order_status.replace('_', ' ')}
                            </span>
                            <span className="text-lg font-bold text-[#1D3A28] font-mono">₹{order.total_amount}/-</span>
                          </div>
                        </div>

                        {/* PRODUCT ITEM ROWS */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="order-items-container">
                            {order.order_items.map((item: any) => {
                              const matchedProduct = products.find(
                                (p) => p.id === item.product_id || p.name.toLowerCase() === item.product_name.toLowerCase()
                              );
                              return (
                                <div key={item.id} className="order-item-row">
                                  <div className="flex items-center gap-3">
                                    {matchedProduct?.image ? (
                                      <img
                                        src={matchedProduct.image}
                                        alt={item.product_name}
                                        className="product-row-thumbnail"
                                      />
                                    ) : (
                                      <div className="product-row-thumbnail flex items-center justify-center text-[#1D3A28]">
                                        <PackageCheck size={20} />
                                      </div>
                                    )}
                                    <div className="text-left">
                                      <span className="font-semibold text-[#1D3A28] text-xs md:text-sm block">{item.product_name}</span>
                                      <span className="text-[11px] text-[#667068] font-mono">Qty: {item.quantity} × ₹{item.unit_price}</span>
                                    </div>
                                  </div>
                                  <span className="font-mono font-bold text-[#1D3A28] text-xs md:text-sm flex-shrink-0">₹{item.total_price}/-</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* VERTICAL DETAILED FULFILLMENT TIMELINE */}
                        <div className="vertical-timeline-container">
                          <span className="vertical-timeline-header-title">
                            Detailed Order Fulfillment Timeline
                          </span>

                          <div className="vertical-timeline-steps">
                            {/* Step 1: Order Placed */}
                            <div className={`vertical-timeline-step ${statusStep >= 1 ? 'completed' : 'pending'}`}>
                              <div className="vertical-timeline-node">
                                {statusStep >= 1 ? <CheckCircle2 size={16} /> : <div className="vertical-timeline-dot" />}
                              </div>
                              <div className="vertical-timeline-content">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h5 className="vertical-timeline-title">1. Order Placed &amp; Confirmed</h5>
                                  <span className="vertical-timeline-time">
                                    {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="vertical-timeline-desc">
                                  Order #{order.order_number} confirmed. Item reservation and payment method ({order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Gateway'}) recorded at S.S. PHARMACY manufacturing facility.
                                </p>
                              </div>
                            </div>

                            {/* Step 2: Processing & Quality Inspection */}
                            <div className={`vertical-timeline-step ${statusStep >= 2 ? (statusStep === 2 ? 'active' : 'completed') : 'pending'}`}>
                              <div className="vertical-timeline-node">
                                {statusStep > 2 ? <CheckCircle2 size={16} /> : (statusStep === 2 ? <Clock size={14} className="animate-pulse text-[#C5A059]" /> : <div className="vertical-timeline-dot" />)}
                              </div>
                              <div className="vertical-timeline-content">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h5 className="vertical-timeline-title">2. Processing &amp; Batch Quality Inspection</h5>
                                  <span className="vertical-timeline-time">
                                    {statusStep >= 2 ? 'In Progress / Verified' : 'Pending Processing'}
                                  </span>
                                </div>
                                <p className="vertical-timeline-desc">
                                  Ayurvedic formulation quality verification, Schedule T statutory compliance check, and tamper-evident protective packaging.
                                </p>
                              </div>
                            </div>

                            {/* Step 3: Dispatched & In Transit */}
                            <div className={`vertical-timeline-step ${statusStep >= 3 ? (statusStep === 3 ? 'active' : 'completed') : 'pending'}`}>
                              <div className="vertical-timeline-node">
                                {statusStep > 3 ? <CheckCircle2 size={16} /> : (statusStep === 3 ? <Truck size={14} className="animate-bounce text-[#1D3A28]" /> : <div className="vertical-timeline-dot" />)}
                              </div>
                              <div className="vertical-timeline-content">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h5 className="vertical-timeline-title">3. Dispatched &amp; In Transit</h5>
                                  <span className="vertical-timeline-time">
                                    {statusStep >= 3 ? 'Dispatched' : 'Awaiting Dispatch'}
                                  </span>
                                </div>
                                <p className="vertical-timeline-desc">
                                  Handed over to logistical courier partner for express delivery to {order.city || 'your shipping destination'}, {order.state || 'India'}.
                                </p>
                              </div>
                            </div>

                            {/* Step 4: Delivered */}
                            <div className={`vertical-timeline-step ${statusStep >= 4 ? 'completed' : 'pending'}`}>
                              <div className="vertical-timeline-node">
                                {statusStep >= 4 ? <CheckCircle2 size={16} /> : <div className="vertical-timeline-dot" />}
                              </div>
                              <div className="vertical-timeline-content">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h5 className="vertical-timeline-title">4. Order Delivered</h5>
                                  <span className="vertical-timeline-time">
                                    {statusStep >= 4 ? 'Delivered' : 'Estimated 2-4 Days'}
                                  </span>
                                </div>
                                <p className="vertical-timeline-desc">
                                  Package delivered safely to recipient doorstep at {order.shipping_address ? `${order.shipping_address.slice(0, 40)}...` : 'your registered address'}.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SHIPMENT / TRACKING ROW */}
                        {order.shipments && (Array.isArray(order.shipments) ? order.shipments[0] : order.shipments) && (
                          (() => {
                            const sh = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;
                            return (
                              <div className="bg-[#EEF7F1] p-3.5 rounded-xl border border-[#D1E2D5] text-xs flex items-center justify-between flex-wrap gap-2 text-left">
                                <div>
                                  <span className="text-[10px] font-bold text-[#1D3A28] uppercase tracking-wider block">Courier &amp; AWB Tracking</span>
                                  <span className="font-bold text-[#1D3A28]">{sh.carrier} · </span>
                                  <span className="font-mono text-[#1D3A28]">{sh.tracking_number}</span>
                                </div>
                                {sh.tracking_url && sh.tracking_url.startsWith('https://') && (
                                  <a
                                    href={sh.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#1D3A28] hover:bg-[#2D5016] text-white py-1.5 px-4 rounded-full font-bold text-xs inline-flex items-center gap-1.5 text-decoration-none shadow-xs"
                                  >
                                    <span>Track Package</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            );
                          })()
                        )}

                        {/* Action Buttons Row */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E5DE]">
                          <span className="text-xs text-[#667068]">Payment Method: <strong>{order.payment_method || 'Online / COD'}</strong></span>
                          <div className="flex items-center gap-2">
                            {order.invoices && (Array.isArray(order.invoices) ? order.invoices[0] : order.invoices) && (
                              <button
                                onClick={async () => {
                                  const inv = Array.isArray(order.invoices) ? order.invoices[0] : order.invoices;
                                  if (inv.pdf_storage_path) {
                                    const { data } = await supabase.storage.from('invoices').createSignedUrl(inv.pdf_storage_path, 60);
                                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                  }
                                }}
                                className="bg-white hover:bg-[#F7F6F3] text-[#1D3A28] border border-[#E8E5DE] px-3 py-1.5 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                              >
                                <Receipt size={13} />
                                <span>Tax Invoice</span>
                              </button>
                            )}

                            <button
                              onClick={() => navigate('/contact')}
                              className="bg-white hover:bg-[#F7F6F3] text-[#1F2A22] border border-[#E8E5DE] px-3 py-1.5 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                            >
                              <HelpCircle size={13} />
                              <span>Get Support</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT SECONDARY COLUMN (30%) */}
                <div className="account-sidebar-column flex flex-col gap-4">
                  <UserProfileSidebar
                    user={sidebarUser}
                    navItems={sidebarNavItems}
                    logoutItem={sidebarLogoutItem}
                  />

                  <div className="guarantee-sidebar-card">
                    <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider block">Authentic Potency</span>
                    <h4>Direct Licensed Manufacturing</h4>
                    <p>
                      Formulated under AYUSH Ministry Mfg. Lic. No. R-1970/Ayur with pure botanical active concentrations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADDRESSES VIEW (100% REAL DATA & INTERACTIVE) */}
        {activeTab === 'addresses' && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-[#1D3A28] m-0">
                  Saved Delivery Locations ({savedAddresses.length})
                </h3>
                <p className="text-xs text-[#667068] mt-1 m-0">
                  Manage your primary shipping addresses for seamless 1-click Ayurvedic order checkouts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddressModal()}
                className="account-add-address-btn"
              >
                <Plus size={16} />
                <span>+ Add Delivery Address</span>
              </button>
            </div>

            {savedAddresses.length === 0 ? (
              <div className="account-empty-state-card">
                <div className="account-empty-icon-box text-green-700 bg-green-50 border-green-200">
                  <MapPin size={28} />
                </div>
                <div>
                  <h2 className="account-empty-heading">No Saved Delivery Addresses</h2>
                  <p className="account-empty-desc">
                    You have not added any delivery locations yet. Click the "Add Delivery Address" button above to enter an address manually or auto-detect your location via GPS.
                  </p>
                </div>
              </div>
            ) : (
              <div className="addresses-grid">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`address-card-item ${addr.isDefault ? 'is-default' : ''}`}
                  >
                    <div>
                      <div className="address-card-header">
                        <span className={`address-tag-pill ${addr.isDefault ? 'default-tag' : ''}`}>
                          {addr.isDefault ? 'Default Location' : addr.tag}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">Primary</span>
                        )}
                      </div>

                      <div className="address-body-text mt-3">
                        <span className="font-bold text-[#1D3A28] text-base">{addr.name}</span>
                        <span>{addr.address}</span>
                        <span>{addr.city}, {addr.state} - {addr.pincode}</span>
                        {addr.phone && (
                          <span className="font-mono text-xs text-[#667068] mt-1">Phone: {addr.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="address-actions-bar">
                      <button
                        type="button"
                        onClick={() => handleOpenAddressModal(addr)}
                        className="address-action-btn"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="address-action-btn"
                        >
                          <CheckCircle2 size={13} />
                          <span>Make Primary</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="address-action-btn delete-btn"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SUPPORT VIEW */}
        {activeTab === 'support' && (
          <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 shadow-xs space-y-4 text-left">
            <h3 className="font-display text-xl font-bold text-[#1D3A28] flex items-center gap-2 m-0">
              <HelpCircle size={20} className="text-[#C5A059]" />
              <span>Pharmacy Support &amp; Customer Advisory</span>
            </h3>
            <p className="text-sm text-[#667068] leading-relaxed">
              Need assistance with your Ayurvedic product orders, batch verification, or shipment dispatch? Contact our licensed facility support team directly.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/contact')}
                className="bg-[#1D3A28] hover:bg-[#2D5016] text-white py-2.5 px-6 rounded-full font-bold text-xs"
              >
                Contact Manufacturing Support
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/faq')}
                className="border-[#E8E5DE] text-[#1F2A22] hover:bg-[#F7F6F3] py-2.5 px-6 rounded-full font-bold text-xs"
              >
                Read Frequently Asked Questions
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* LUXURY ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div ref={addressModalRef} className="address-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="address-modal-card">
            <div className="address-modal-header">
              <h3 className="address-modal-title" id="address-modal-title">
                <MapPin size={20} className="text-[#C5A059]" />
                <span>{editingAddressId ? 'Edit Delivery Location' : 'Add New Delivery Location'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="address-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="address-modal-body">
              {/* GPS GEOLOCATION AUTO-DETECT BUTTON */}
              <button
                type="button"
                onClick={handleDetectGPSLocation}
                disabled={detectingLocation}
                className="location-gps-btn"
              >
                <Navigation size={16} className={detectingLocation ? 'animate-spin' : ''} />
                <span>{detectingLocation ? 'Detecting Location...' : '📍 Use Current Location'}</span>
              </button>

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="address-form-grid">
                  <div>
                    <label htmlFor="addr-name" className="address-form-label">Contact Name *</label>
                    <input
                      id="addr-name"
                      type="text"
                      required
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      placeholder="Full Recipient Name"
                      className="address-form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="addr-phone" className="address-form-label">Phone Number *</label>
                    <input
                      id="addr-phone"
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="address-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="addr-street" className="address-form-label">Street Address / Flat / Building *</label>
                  <textarea
                    id="addr-street"
                    required
                    rows={2}
                    value={addressForm.address}
                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                    placeholder="D. No., Street, Colony or Landmark"
                    className="address-form-textarea"
                  />
                </div>

                <div className="address-form-grid">
                  <div>
                    <label htmlFor="addr-city" className="address-form-label">City / Town *</label>
                    <input
                      id="addr-city"
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="City / District"
                      className="address-form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="addr-pincode" className="address-form-label">Pincode *</label>
                    <input
                      id="addr-pincode"
                      type="text"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      placeholder="6-digit PIN"
                      className="address-form-input font-mono"
                    />
                  </div>
                </div>

                <div className="address-form-grid">
                  <div>
                    <label htmlFor="addr-state" className="address-form-label">State</label>
                    <input
                      id="addr-state"
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      placeholder="State"
                      className="address-form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="addr-tag" className="address-form-label">Address Tag</label>
                    <select
                      id="addr-tag"
                      value={addressForm.tag}
                      onChange={(e) => setAddressForm({ ...addressForm, tag: e.target.value as any })}
                      className="address-form-select"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="set-default-check"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="rounded text-[#1D3A28]"
                  />
                  <label htmlFor="set-default-check" className="text-xs text-[#1D3A28] cursor-pointer">
                    Set as primary default delivery location
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E8E5DE]">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-[#667068] hover:text-[#1D3A28] border-none bg-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#1D3A28] hover:bg-[#2D5016] text-white px-6 py-2.5 rounded-full text-xs font-bold cursor-pointer"
                  >
                    {editingAddressId ? 'Save Changes' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
