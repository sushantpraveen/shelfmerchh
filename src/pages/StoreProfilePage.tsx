import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStoreAuth, StoreCustomerAddress } from '@/contexts/StoreAuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    Info,
    AlertCircle,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { buildStorePath } from '@/utils/tenantUtils';
import AddressModal from '@/components/storefront/AddressModal';
import { toast } from 'sonner';
import StoreLayout from '@/components/storefront/StoreLayout';
import { storeApi } from '@/lib/api';
import { Store } from '@/types';

const StoreProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { subdomain } = useParams<{ subdomain: string }>();
    const {
        customer,
        isAuthenticated,
        isLoading,
        updateProfile,
        deleteAddress,
        updateAddress,
        addAddress,
        sendPhoneVerificationOtp,
        confirmPhoneVerificationOtp,
        sendEmailVerificationOtp,
        confirmEmailVerificationOtp
    } = useStoreAuth();
    const { cartCount, setIsCartOpen } = useCart();

    const [store, setStore] = useState<Store | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Auth logic for verification
    const [verificationStep, setVerificationStep] = useState<'IDLE' | 'OTP'>('IDLE');
    const [verifyingField, setVerifyingField] = useState<'EMAIL' | 'PHONE' | null>(null);
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Address logic
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<StoreCustomerAddress | undefined>();

    useEffect(() => {
        if (customer) {
            setName(customer.name || '');
            setEmail(customer.email || '');
            setPhone(customer.phoneNumber || '');
        }
    }, [customer]);

    useEffect(() => {
        const loadStore = async () => {
            if (!subdomain) return;
            const resp = await storeApi.getBySubdomain(subdomain);
            if (resp.success) setStore(resp.data);
        };
        loadStore();
    }, [subdomain]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!isAuthenticated || !subdomain) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold mb-4">Please sign in to view your profile</h1>
                <Button asChild>
                    <Link to={buildStorePath('/auth', subdomain || '')}>Sign In</Link>
                </Button>
            </div>
        );
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile(subdomain, {
                name,
                email,
                phoneNumber: phone
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerifyPhone = async () => {
        if (!phone || phone.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }
        setIsVerifying(true);
        const success = await sendPhoneVerificationOtp(subdomain!, phone);
        setIsVerifying(false);
        if (success) {
            setVerifyingField('PHONE');
            setVerificationStep('OTP');
        }
    };

    const handleVerifyEmail = async () => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        setIsVerifying(true);
        const success = await sendEmailVerificationOtp(subdomain!, email);
        setIsVerifying(false);
        if (success) {
            setVerifyingField('EMAIL');
            setVerificationStep('OTP');
        }
    };

    const handleConfirmOtp = async () => {
        if (otp.length !== 6) {
            toast.error('Please enter the 6-digit code');
            return;
        }
        setIsVerifying(true);
        let success = false;
        if (verifyingField === 'PHONE') {
            success = await confirmPhoneVerificationOtp(subdomain!, otp);
        } else if (verifyingField === 'EMAIL') {
            success = await confirmEmailVerificationOtp(subdomain!, otp);
        }
        setIsVerifying(false);
        if (success) {
            setVerificationStep('IDLE');
            setVerifyingField(null);
            setOtp('');
        }
    };

    const handleAddressSave = async (addressData: Omit<StoreCustomerAddress, '_id'>) => {
        if (editingAddress) {
            await updateAddress(subdomain, editingAddress._id, addressData);
        } else {
            await addAddress(subdomain, addressData);
        }
        setEditingAddress(undefined);
    };

    const handleDeleteAddress = async (id: string) => {
        if (confirm('Are you sure you want to delete this address?')) {
            await deleteAddress(subdomain, id);
        }
    };

    const handleSetDefault = async (id: string) => {
        await updateAddress(subdomain, id, { isDefault: true });
    };

    return (
        <StoreLayout store={store}>
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8">
                    <Link
                        to={buildStorePath('/', subdomain)}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Shopping
                    </Link>
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground">View and manage your account details and addresses.</p>
                </div>

                <div className="grid gap-8">
                    {/* Basic Info */}
                    <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={customer.isEmailVerified || (customer as any).emailVerified || !!customer.googleId}
                                                className={`pl-10 ${(customer.isEmailVerified || (customer as any).emailVerified || !!customer.googleId) ? 'bg-muted/50' : ''}`}
                                                placeholder="Enter your email"
                                            />
                                            {(customer.isEmailVerified || (customer as any).emailVerified || !!customer.googleId) ? (
                                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                                            ) : (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="group relative">
                                                        <Info className="h-4 w-4 text-amber-500 cursor-help" />
                                                        <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                            Please verify to proceed with checkout.
                                                        </span>
                                                    </span>
                                                    {verificationStep === 'IDLE' && email && (
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            className="h-auto p-0 text-green-600 font-semibold"
                                                            onClick={handleVerifyEmail}
                                                            disabled={isVerifying}
                                                        >
                                                            Verify
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {verificationStep === 'OTP' && verifyingField === 'EMAIL' && (
                                            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                                                <Label htmlFor="otp">Enter 6-digit Email Code</Label>
                                                <div className="flex gap-2 mt-2">
                                                    <Input
                                                        id="otp-email"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        placeholder="000000"
                                                        className="max-w-[150px] tracking-widest text-center text-lg font-bold"
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={handleConfirmOtp}
                                                        disabled={isVerifying}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setVerificationStep('IDLE');
                                                            setVerifyingField(null);
                                                            setOtp('');
                                                        }}
                                                        disabled={isVerifying}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                placeholder="Enter 10-digit mobile number"
                                                className={`pl-10 ${(customer.isPhoneVerified && !!customer.phoneNumber) ? 'bg-muted/50' : ''}`}
                                                disabled={customer.isPhoneVerified && !!customer.phoneNumber}
                                            />
                                            {(customer.isPhoneVerified || (customer as any).phoneVerified) ? (
                                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                                            ) : (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="group relative">
                                                        <Info className="h-4 w-4 text-amber-500 cursor-help" />
                                                        <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                            Please verify to proceed with checkout.
                                                        </span>
                                                    </span>
                                                    {verificationStep === 'IDLE' && phone && (
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            className="h-auto p-0 text-green-600 font-semibold"
                                                            onClick={handleVerifyPhone}
                                                            disabled={isVerifying}
                                                        >
                                                            Verify
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {verificationStep === 'OTP' && verifyingField === 'PHONE' && (
                                            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                                                <Label htmlFor="otp">Enter 6-digit Phone Code</Label>
                                                <div className="flex gap-2 mt-2">
                                                    <Input
                                                        id="otp-phone"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        placeholder="000000"
                                                        className="max-w-[150px] tracking-widest text-center text-lg font-bold"
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={handleConfirmOtp}
                                                        disabled={isVerifying}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setVerificationStep('IDLE');
                                                            setVerifyingField(null);
                                                            setOtp('');
                                                        }}
                                                        disabled={isVerifying}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 text-lg font-semibold"
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Save Changes'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Addresses */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-green-600" />
                                Your Addresses
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                    setEditingAddress(undefined);
                                    setIsAddressModalOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Address
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {customer.addresses && customer.addresses.length > 0 ? (
                                customer.addresses.map((addr) => (
                                    <Card key={addr._id} className={addr.isDefault ? "border-green-600/30 ring-1 ring-green-600/30 shadow-md" : "border-border shadow-sm"}>
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                        {addr.label || 'Home'}
                                                    </span>
                                                    {addr.isDefault && (
                                                        <span className="text-[10px] font-bold uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => {
                                                            setEditingAddress(addr);
                                                            setIsAddressModalOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        onClick={() => handleDeleteAddress(addr._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <p className="font-bold text-base">{addr.fullName}</p>
                                                <p className="text-muted-foreground">{addr.address1}</p>
                                                {addr.address2 && <p className="text-muted-foreground">{addr.address2}</p>}
                                                <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.zipCode}</p>
                                                <p className="text-muted-foreground">{addr.country}</p>
                                                <p className="text-foreground font-medium pt-1 flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {addr.phone}
                                                </p>
                                            </div>
                                            {!addr.isDefault && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 h-auto mt-4 text-green-600 font-semibold text-xs"
                                                    onClick={() => handleSetDefault(addr._id)}
                                                >
                                                    Set as Default
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
                                    <MapPin className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No addresses saved yet.</p>
                                    <Button
                                        variant="link"
                                        className="text-green-600"
                                        onClick={() => setIsAddressModalOpen(true)}
                                    >
                                        Add your first address
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onSave={handleAddressSave}
                initialData={editingAddress}
                title={editingAddress ? "Edit Address" : "Add New Address"}
            />
        </StoreLayout>
    );
};

export default StoreProfilePage;
