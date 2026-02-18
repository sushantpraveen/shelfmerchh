import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Settings,
    Bell,
    ShieldAlert,
    User,
    Loader2,
    ArrowLeft,
    LogOut,
    Trash2
} from 'lucide-react';
import { buildStorePath } from '@/utils/tenantUtils';
import EnhancedStoreHeader from '@/components/storefront/EnhancedStoreHeader';
import { storeApi } from '@/lib/api';
import { Store } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const StoreSettingsPage: React.FC = () => {
    const { subdomain } = useParams<{ subdomain: string }>();
    const navigate = useNavigate();
    const {
        customer,
        isAuthenticated,
        isLoading: authLoading,
        logout,
        updateNotifications,
        deleteAccount
    } = useStoreAuth();
    const { cartCount, setIsCartOpen } = useCart();

    const [store, setStore] = useState<Store | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    useEffect(() => {
        const loadStore = async () => {
            if (!subdomain) return;
            const resp = await storeApi.getBySubdomain(subdomain);
            if (resp.success) setStore(resp.data);
        };
        loadStore();
    }, [subdomain]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!isAuthenticated || !subdomain) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <Settings className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h1 className="text-2xl font-bold mb-4">Please sign in to view settings</h1>
                <Button asChild>
                    <Link to={buildStorePath('/auth', subdomain || '')}>Sign In</Link>
                </Button>
            </div>
        );
    }

    const handleLogout = () => {
        logout(subdomain);
        navigate(buildStorePath('/', subdomain));
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = confirm(
            "Are you sure you want to delete your account? This action is permanent and all your order history will be removed."
        );
        if (confirmDelete) {
            setIsDeleting(true);
            try {
                const success = await deleteAccount(subdomain);
                if (success) {
                    navigate(buildStorePath('/', subdomain));
                }
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleNotificationToggle = async (type: 'orderUpdates' | 'marketingEmails', val: boolean) => {
        setNotifLoading(true);
        try {
            await updateNotifications(subdomain, { [type]: val });
        } finally {
            setNotifLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <EnhancedStoreHeader
                storeName={store?.storeName || 'Store'}
                cartItemCount={cartCount}
                onCartClick={() => setIsCartOpen(true)}
                storeSlug={subdomain}
            />

            <main className="container mx-auto max-w-2xl px-4 py-8">
                <div className="mb-10">
                    <Link
                        to={buildStorePath('/profile', subdomain)}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Profile
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-2xl">
                            <Settings className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight leading-none">Settings</h1>
                            <p className="text-muted-foreground mt-1">Manage your account and app preferences.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Account Section */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            Account Details
                        </h2>
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-0">
                                <div className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-muted-foreground uppercase">Full Name</p>
                                        <p className="font-bold text-lg">{customer.name}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="rounded-xl font-bold h-10 px-4" asChild>
                                        <Link to={buildStorePath('/profile', subdomain)}>Update</Link>
                                    </Button>
                                </div>
                                <Separator />
                                <div className="p-6 space-y-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase">Email Address</p>
                                    <p className="font-bold text-lg">{customer.email}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Notifications Section */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5" />
                            Notifications
                        </h2>
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-bold">Order Updates</Label>
                                        <p className="text-sm text-muted-foreground">Receive tracking info and status alerts.</p>
                                    </div>
                                    <Switch
                                        checked={customer.notificationPreferences?.orderUpdates ?? true}
                                        onCheckedChange={(val) => handleNotificationToggle('orderUpdates', val)}
                                        disabled={notifLoading}
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-bold">Marketing Emails</Label>
                                        <p className="text-sm text-muted-foreground">Get notified about sales and new collections.</p>
                                    </div>
                                    <Switch
                                        checked={customer.notificationPreferences?.marketingEmails ?? false}
                                        onCheckedChange={(val) => handleNotificationToggle('marketingEmails', val)}
                                        disabled={notifLoading}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Danger Zone Section */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-red-600 px-1 flex items-center gap-2">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Danger Zone
                        </h2>
                        <Card className="border-2 border-red-50 shadow-none rounded-3xl overflow-hidden bg-red-50/20">
                            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-red-900">Delete Account</p>
                                    <p className="text-sm text-red-700/70">Permanently remove your account and all data.</p>
                                </div>
                                <Button
                                    variant="destructive"
                                    className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-red-100 hover:shadow-red-200 transition-all"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    Delete Account
                                </Button>
                            </CardContent>
                        </Card>
                    </section>

                    <Separator className="my-8" />

                    <Button
                        variant="outline"
                        className="w-full h-14 rounded-2xl font-black text-lg border-2 hover:bg-muted/50 transition-all border-muted-foreground/10 group"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        Logout from Account
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default StoreSettingsPage;
