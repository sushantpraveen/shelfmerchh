import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CartItem, Store, ShippingAddress } from '@/types';
import { getTheme } from '@/lib/themes';
import { storeApi, checkoutApi, shippingApi } from '@/lib/api';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { estimateCartWeight } from '@/lib/delhivery';
import { getTenantSlugFromLocation, buildStorePath } from '@/utils/tenantUtils';
import { useCart } from '@/contexts/CartContext';

import {
  ArrowLeft,
  CreditCard,
  Truck,
  ShieldCheck,
  Lock,
  Loader2,
  Check,
  ChevronsUpDown,
  AlertCircle
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { INDIAN_STATES, COUNTRIES } from "@/lib/locationData";

const defaultShipping: ShippingAddress = {
  fullName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India', // Default to India as requested
};

const StoreCheckoutPage: React.FC = () => {
  const params = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Robustly extract subdomain from hostname OR path params
  const subdomain = getTenantSlugFromLocation(location, params);

  const locationState = location.state as { cart?: CartItem[]; storeId?: string; subdomain?: string } | null;
  const [store, setStore] = useState<Store | null>(null);
  const { cart, clearCart } = useCart();
  const [shippingInfo, setShippingInfo] = useState<ShippingAddress>(defaultShipping);
  const [processing, setProcessing] = useState(false);
  const [shipping, setShipping] = useState(0); // Will be calculated based on zip code
  const [shippingLoading, setShippingLoading] = useState(false);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<number | undefined>();

  // New states for validation and enhance UI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pincodeDetailsLoading, setPincodeDetailsLoading] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Constants
  const NAME_REGEX = /^[a-zA-Z\s']+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^\d{10}$/;

  useEffect(() => {
    const load = async () => {
      if (!subdomain) return;
      try {
        const resp = await storeApi.getBySubdomain(subdomain);
        if (resp.success && resp.data) {
          setStore(resp.data as Store);
        } else {
          setStore(null);
        }
      } catch (err) {
        console.error('Failed to fetch store for checkout:', err);
        setStore(null);
      }
    };

    load();
  }, [subdomain]);



  const { isAuthenticated, customer } = useStoreAuth();

  useEffect(() => {
    if (store && !isAuthenticated) {
      // Redirect to auth page, preserving the cart state so it's available after login
      navigate(`/store/${store.subdomain}/auth?redirect=checkout`, {
        state: locationState
      });
    }
  }, [isAuthenticated, store, navigate, locationState]);

  // Auto-fill default address
  useEffect(() => {
    if (customer && customer.addresses && customer.addresses.length > 0) {
      const defaultAddr = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
      if (defaultAddr && (!shippingInfo.fullName || shippingInfo.fullName === '')) {
        setShippingInfo({
          fullName: defaultAddr.fullName || '',
          email: customer.email || '',
          phone: defaultAddr.phone || customer.phoneNumber || '',
          address1: defaultAddr.address1 || '',
          address2: defaultAddr.address2 || '',
          city: defaultAddr.city || '',
          state: defaultAddr.state || '',
          zipCode: defaultAddr.zipCode || '',
          country: defaultAddr.country || 'India',
        });
      }
    }
  }, [customer, isAuthenticated]);

  const theme = store ? getTheme(store.theme) : getTheme('modern');

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  // Initialize default shipping when cart loads
  useEffect(() => {
    if (cart.length > 0 && !shippingInfo.zipCode) {
      setShipping(150); // Default ₹150 for India
    } else if (cart.length === 0) {
      setShipping(0);
    }
  }, [cart.length]);

  // Check if Delhivery service is configured
  const isShippingServiceConfigured = !!import.meta.env.VITE_DELHIVERY_TOKEN;

  // Calculate shipping using Delhivery API when zipCode is entered
  useEffect(() => {
    const calculateShipping = async () => {
      const zipCode = shippingInfo.zipCode?.trim() || '';

      if (!zipCode || !/^\d{6}$/.test(zipCode)) {
        setShipping(cart.length > 0 ? 150 : 0);
        setEstimatedDeliveryDays(undefined);
        setShippingLoading(false);
        return;
      }

      if (cart.length === 0) {
        setShipping(0);
        setEstimatedDeliveryDays(undefined);
        setShippingLoading(false);
        return;
      }

      setShippingLoading(true);
      try {
        const weightKg = estimateCartWeight(cart);
        const weightGrams = Math.round(weightKg * 1000);

        const result = await shippingApi.getQuote(zipCode, weightGrams);

        if (result && result.serviceable) {
          setShipping(result.shipping_charge);
          setEstimatedDeliveryDays(result.estimated_days);

          // AUTOFILL DISABLED HERE to prevent India Post API overwrite
          // We rely on fetchPincodeDetails for address population
        } else {
          setShipping(150);
          setEstimatedDeliveryDays(undefined);
          if (result && result.message) {
            toast.error(result.message);
          }
        }
      } catch (error) {
        console.error('Error calculating shipping:', error);
        setShipping(cart.length > 0 ? 150 : 0);
        setEstimatedDeliveryDays(undefined);
        toast.error('Could not calculate shipping. Using default rate.');
      } finally {
        setShippingLoading(false);
      }
    };

    const timeoutId = setTimeout(calculateShipping, 500);
    return () => clearTimeout(timeoutId);
  }, [shippingInfo.zipCode, cart]);

  const validateField = (name: string, value: string) => {
    let error = "";
    switch (name) {
      case "fullName":
        if (!value.trim()) error = "Full name is required";
        else if (!NAME_REGEX.test(value)) error = "Only alphabets, spaces, and apostrophes allowed";
        break;
      case "email":
        if (!value.trim()) error = "Email is required";
        else if (!EMAIL_REGEX.test(value)) error = "Enter a valid email address";
        break;
      case "phone":
        if (!value.trim()) error = "Phone number is required";
        else if (!PHONE_REGEX.test(value.replace(/\D/g, ''))) error = "Enter a valid 10-digit mobile number";
        break;
      case "zipCode":
        if (!value.trim()) error = "Pin code is required";
        else if (!/^\d{6}$/.test(value)) error = "Enter a valid 6-digit pin code";
        break;
      case "address1":
        if (!value.trim()) error = "Address line 1 is required";
        break;
      case "city":
        if (!value.trim()) error = "City is required";
        break;
      case "state":
        if (!value.trim()) error = "State is required";
        break;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) newErrors[name] = error;
      else delete newErrors[name];
      return newErrors;
    });
    return !error;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === "fullName" && value && !NAME_REGEX.test(value)) {
      setErrors(prev => ({ ...prev, fullName: "Enter a valid name" }));
      return;
    }

    setShippingInfo((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digits = value.replace(/\D/g, '');

    if (digits.length > 10) return;

    setShippingInfo(prev => ({ ...prev, phone: digits }));

    if (digits.length > 0 && digits.length !== 10) {
      setErrors(prev => ({ ...prev, phone: "Enter a valid 10-digit mobile number" }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const fetchPincodeDetails = async (pincode: string) => {
    if (pincode.length !== 6) return;

    setPincodeDetailsLoading(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.zipCode;
      return newErrors;
    });

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (Array.isArray(data) && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const place = data[0].PostOffice[0];
        const city = place.District;
        const state = place.State;
        const country = "India";

        setShippingInfo(prev => ({
          ...prev,
          city,
          state,
          country
        }));

        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.city;
          delete newErrors.state;
          delete newErrors.country;
          delete newErrors.zipCode;
          return newErrors;
        });
      } else {
        setErrors(prev => ({ ...prev, zipCode: "Invalid pin code" }));
        setShippingInfo(prev => ({ ...prev, city: '', state: '', country: 'India' }));
      }
    } catch (error) {
      console.error("Error fetching pincode:", error);
    } finally {
      setPincodeDetailsLoading(false);
    }
  };

  const handleZipCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
    setShippingInfo((prev) => ({ ...prev, zipCode: value }));

    if (value.length === 6) {
      fetchPincodeDetails(value);
    } else {
      if (value.length < 6) {
        setShippingInfo(prev => ({ ...prev, city: '', state: '', country: 'India' }));
        if (value.length > 0) {
          setErrors(prev => ({ ...prev, zipCode: "Enter a valid 6-digit pin code" }));
        } else {
          setErrors(prev => { const n = { ...prev }; delete n.zipCode; return n; });
        }
      }
    }
  };

  const validateShipping = () => {
    let isValid = true;
    const required: (keyof ShippingAddress)[] = ['fullName', 'email', 'phone', 'address1', 'city', 'state', 'zipCode'];

    required.forEach(field => {
      if (!validateField(field, shippingInfo[field])) {
        isValid = false;
      }
    });

    if (Object.keys(errors).length > 0) return false;

    return isValid;
  };

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (document.getElementById('razorpay-checkout-js')) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleContinueToPayment = async () => {
    if (!validateShipping()) {
      return;
    }

    // MANDATORY: Check for verification before first checkout
    if (customer && (!customer.isEmailVerified || !customer.isPhoneVerified)) {
      toast.error(`Please verify your ${!customer.isEmailVerified ? 'email' : 'phone number'} before placing your order.`, {
        description: "You can complete this in your Profile section.",
        action: {
          label: "Go to Profile",
          onClick: () => navigate(buildStorePath('/profile', subdomain || ''))
        }
      });
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok) {
      toast.error('Failed to load payment gateway. Please try again.');
      return;
    }

    try {
      setProcessing(true);

      const orderSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const orderTax = orderSubtotal * 0.08;

      const createResp = await checkoutApi.createRazorpayOrder(subdomain!, {
        cart,
        shippingInfo,
        shipping,
        tax: orderTax,
      });

      if (!createResp.success || !createResp.data?.razorpayOrder) {
        throw new Error(createResp.message || 'Failed to start payment');
      }

      const { razorpayOrder } = createResp.data;
      const razorpayKeyId = (createResp.data as any)?.razorpayKeyId;

      const razorpayKey = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

      if (!razorpayKey) {
        toast.error('Payment configuration missing. Please contact store owner.');
        setProcessing(false);
        return;
      }

      const options: any = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: store?.storeName || 'ShelfMerch Store',
        description: 'Order payment',
        order_id: razorpayOrder.id,
        prefill: {
          name: shippingInfo.fullName,
          email: shippingInfo.email,
          contact: `+91${shippingInfo.phone}`, // Add +91 prefix for Razorpay
        },
        notes: {
          subdomain: store?.subdomain,
        },
        handler: async (response: any) => {
          try {
            const verifyResp = await checkoutApi.verifyRazorpayPayment(subdomain!, {
              cart,
              shippingInfo,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shipping,
              tax: orderTax,
            });

            if (!verifyResp.success || !verifyResp.data) {
              throw new Error(verifyResp.message || 'Payment verification failed');
            }

            const order = verifyResp.data;
            clearCart();
            toast.success('Payment successful! Order placed.');
            navigate('/order-confirmation', {
              state: {
                order,
                storeSlug: store?.subdomain || subdomain,
              },
            });
          } catch (err) {
            console.error('Order placement error after payment:', err);
            toast.error('Payment verification failed. Please contact support with your payment ID.');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      if (!(window as any).Razorpay) {
        toast.error('Payment SDK not loaded. Please refresh and try again.');
        setProcessing(false);
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed details:', JSON.stringify(response, null, 2));
        const errorDesc = response.error?.description || response.error?.reason || 'Unknown error';
        toast.error(`Payment failed: ${errorDesc}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (error) {
      console.error('Error starting payment:', error);
      toast.error('Failed to start payment. Please try again.');
      setProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!store) return;
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!validateShipping()) {
      return;
    }

    setProcessing(true);
    try {
      const resp = await checkoutApi.placeOrder(store.subdomain, {
        cart,
        shippingInfo,
      });

      if (!resp.success || !resp.data) {
        throw new Error(resp.message || 'Failed to place order');
      }

      const order = resp.data;
      clearCart();
      toast.success('Order placed successfully!');

      navigate('/order-confirmation', {
        state: {
          order,
          storeSlug: store.subdomain,
        },
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error?.message || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const handleBackToStore = () => {
    if (!store) return;
    navigate(`/store/${store.subdomain}`);
  };

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-3xl font-bold mb-3">Checkout unavailable</h1>
        <p className="text-muted-foreground mb-6">
          The store you are trying to access is not available at the moment.
        </p>
        <Button asChild>
          <Link to="/">Go back to ShelfMerch</Link>
        </Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-3xl font-bold mb-3">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Add items to your cart before proceeding to checkout.
        </p>
        <Button onClick={handleBackToStore}>Back to store</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: theme.fonts.body }}>
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToStore}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue shopping
            </Button>
            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Checkout</p>
              <h1 className="text-lg font-semibold" style={{ fontFamily: theme.fonts.heading }}>
                {store.storeName}
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <Lock className="h-4 w-4" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-8">
          <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: theme.fonts.heading }}>
                Shipping information
              </h2>
              <p className="text-sm text-muted-foreground">
                Provide your contact and delivery details so we know where to send your order.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Verification Message */}
              {customer && (!customer.isEmailVerified || !customer.isPhoneVerified) && (
                <div className="sm:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Verification Required</p>
                    <p className="text-xs text-amber-700">
                      Please verify your {!customer.isEmailVerified ? 'email' : 'phone number'} to proceed with the checkout.
                      <Link to={buildStorePath('/profile', subdomain || '')} className="ml-1 font-bold underline">Go to Profile</Link>
                    </p>
                  </div>
                </div>
              )}

              {/* Saved Address Selection */}
              {customer && customer.addresses && customer.addresses.length > 0 && (
                <div className="sm:col-span-2 mb-2">
                  <Label className="mb-2 block">Select from saved addresses</Label>
                  <div className="flex flex-wrap gap-2">
                    {customer.addresses.map((addr) => (
                      <Button
                        key={addr._id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-xl h-auto py-2 px-3 flex flex-col items-start text-left bg-background border-2",
                          shippingInfo.zipCode === addr.zipCode && shippingInfo.address1 === addr.address1
                            ? "border-green-600 bg-green-50/30"
                            : "border-border hover:border-green-200 hover:bg-green-50/10"
                        )}
                        onClick={() => {
                          setShippingInfo({
                            fullName: addr.fullName,
                            email: customer.email || '',
                            phone: addr.phone,
                            address1: addr.address1,
                            address2: addr.address2 || '',
                            city: addr.city,
                            state: addr.state,
                            zipCode: addr.zipCode,
                            country: addr.country
                          });
                        }}
                      >
                        <span className="text-xs font-bold">{addr.label || 'Address'}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{addr.address1}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2 text-muted-foreground text-xs pb-2">
                All fields marked with * are required.
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={shippingInfo.fullName}
                  onChange={handleInputChange}
                  placeholder="Alex Johnson"
                  className={cn(errors.fullName && "border-destructive")}
                  required
                />
                {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={shippingInfo.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={cn(errors.email && "border-destructive")}
                  required
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <div className="flex relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none">
                    +91
                  </span>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    className={cn("pl-11", errors.phone && "border-destructive")}
                    required
                  />
                </div>
                {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="address1">Address line 1 *</Label>
                <Input
                  id="address1"
                  name="address1"
                  value={shippingInfo.address1}
                  onChange={handleInputChange}
                  placeholder="123 Market Street"
                  className={cn(errors.address1 && "border-destructive")}
                  required
                />
                {errors.address1 && <p className="text-destructive text-xs mt-1">{errors.address1}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="address2">Address line 2</Label>
                <Input id="address2" name="address2" value={shippingInfo.address2} onChange={handleInputChange} placeholder="Apartment, suite, etc." />
              </div>

              <div>
                <Label htmlFor="zipCode">Postal code / Pin code *</Label>
                <div className="relative">
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={shippingInfo.zipCode}
                    onChange={handleZipCodeChange}
                    placeholder="110001"
                    maxLength={6}
                    className={cn(errors.zipCode && "border-destructive")}
                    required
                  />
                  {pincodeDetailsLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {errors.zipCode && <p className="text-destructive text-xs mt-1">{errors.zipCode}</p>}
                {shippingLoading && !pincodeDetailsLoading && !errors.zipCode && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking delivery...
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  value={shippingInfo.city}
                  onChange={handleInputChange}
                  placeholder="City"
                  className={cn(errors.city && "border-destructive")}
                  required
                />
                {errors.city && <p className="text-destructive text-xs mt-1">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="state">State / Province *</Label>
                <Popover open={stateOpen} onOpenChange={setStateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stateOpen}
                      className={cn("w-full justify-between", !shippingInfo.state && "text-muted-foreground", errors.state && "border-destructive")}
                    >
                      {shippingInfo.state || "Select state"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search state..." />
                      <CommandList>
                        <CommandEmpty>No state found.</CommandEmpty>
                        <CommandGroup>
                          {INDIAN_STATES.map((state) => (
                            <CommandItem
                              key={state}
                              value={state}
                              onSelect={(currentValue) => {
                                setShippingInfo(prev => ({ ...prev, state: currentValue }));
                                setErrors(prev => { const n = { ...prev }; delete n.state; return n; });
                                setStateOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  shippingInfo.state === state ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {state}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.state && <p className="text-destructive text-xs mt-1">{errors.state}</p>}
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className={cn("w-full justify-between", !shippingInfo.country && "text-muted-foreground")}
                    >
                      {shippingInfo.country || "Select country"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRIES.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                setShippingInfo(prev => ({ ...prev, country: currentValue }));
                                setCountryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  shippingInfo.country === country ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="lg" onClick={handleContinueToPayment} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing payment
                  </>
                ) : (
                  'Continue to payment'
                )}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="space-y-4 p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: theme.fonts.heading }}>
                Order summary
              </h3>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
            <Separator />
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.variant.color}-${item.variant.size}`} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.variant.color} • {item.variant.size}
                    </p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                  <p className="font-semibold">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Shipping
                  {!shippingInfo.zipCode && (
                    <span className="text-xs ml-1 text-muted-foreground">(Enter pin code)</span>
                  )}
                  {shippingInfo.zipCode && !/^\d{6}$/.test(shippingInfo.zipCode.trim()) && (
                    <span className="text-xs ml-1 text-amber-600">(Enter valid 6-digit pin code)</span>
                  )}
                </span>
                <span>
                  {shippingLoading ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Calculating...</span>
                    </span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxes (8%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>
                  {shippingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin inline-block" />
                  ) : (
                    `₹${total.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Fast fulfillment</p>
                <p>Orders ship within 3-5 business days after production.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Purchase protection</p>
                <p>30-day return policy. Contact us if anything isn&apos;t perfect.</p>
              </div>
            </div>
          </Card>
        </aside>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {store.storeName}. Powered by ShelfMerch.
        </div>
      </footer>
    </div>
  );
};

export default StoreCheckoutPage;
