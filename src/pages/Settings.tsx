import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storeApi, authApi } from '@/lib/api';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

const Settings = () => {
  const { selectedStore, refreshStores } = useStore();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Store settings state
  const [storeName, setStoreName] = useState('');
  const [storeSubdomain, setStoreSubdomain] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeTheme, setStoreTheme] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  // Profile settings state
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete store state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load store data when selectedStore changes
  useEffect(() => {
    if (selectedStore) {
      setStoreName((selectedStore as any).storeName || '');
      setStoreSubdomain((selectedStore as any).subdomain || '');
      setStoreDescription((selectedStore as any).description || '');
      setStoreTheme((selectedStore as any).theme || '');
      setPrimaryColor((selectedStore as any).settings?.primaryColor || '');
    } else {
      setStoreName('');
      setStoreSubdomain('');
      setStoreDescription('');
      setStoreTheme('');
      setPrimaryColor('');
    }
  }, [selectedStore]);

  // Load user data
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
    }
  }, [user]);

  const handleStoreSave = async () => {
    if (!selectedStore) return;

    const storeId = (selectedStore as any).id || (selectedStore as any)._id;
    if (!storeId) return;

    // Validation
    if (!storeName.trim()) {
      toast.error('Store name is required');
      return;
    }

    if (!storeSubdomain.trim()) {
      toast.error('Subdomain is required');
      return;
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(storeSubdomain)) {
      toast.error('Subdomain can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    try {
      setSavingStore(true);
      await storeApi.update(storeId, {
        storeName: storeName.trim(),
        subdomain: storeSubdomain.trim().toLowerCase(),
        description: storeDescription,
        theme: storeTheme || undefined,
        settings: {
          primaryColor: primaryColor || undefined,
        },
      });

      toast.success('Store settings updated successfully');

      // Refresh stores to update global state with new data
      await refreshStores();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update store settings');
    } finally {
      setSavingStore(false);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format to lowercase and remove invalid characters
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setStoreSubdomain(value);
  };

  const handleProfileSave = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    try {
      setSavingProfile(true);

      // Update user profile via API
      const response = await authApi.updateProfile(fullName.trim());

      if (response.success) {
        toast.success('Profile updated successfully');
        // Refresh user data
        await refreshUser();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;

    const storeId = (selectedStore as any).id || (selectedStore as any)._id;
    if (!storeId) {
      toast.error('Error: Store ID is missing');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await storeApi.delete(storeId);

      if (response.success) {
        toast.success('Store deleted successfully');
        setDeleteDialogOpen(false);

        // Refresh stores to update global state
        await refreshStores();

        // Redirect to stores page
        navigate('/stores');
      } else {
        throw new Error(response.message || 'Failed to delete store');
      }
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error.message || 'Failed to delete store');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and store preferences
          </p>
        </div>

        {/* Store Settings (store-aware via StoreContext) */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Store Settings</h2>
          {!selectedStore ? (
            <p className="text-sm text-muted-foreground">
              Select a store on the dashboard to view its settings.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="My Awesome Store"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is the public name of your store
                </p>
              </div>
              <div>
                <Label htmlFor="storeSubdomain">Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="storeSubdomain"
                    value={storeSubdomain}
                    onChange={handleSubdomainChange}
                    placeholder="mystore"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    .yoursite.com
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your store URL (lowercase letters, numbers, and hyphens only)
                </p>
              </div>
              <div>
                <Label htmlFor="storeDescription">Description</Label>
                <textarea
                  id="storeDescription"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder="Tell customers about your store..."
                />
              </div>
              <div>
                <Label htmlFor="storeTheme">Theme</Label>
                <Input
                  id="storeTheme"
                  value={storeTheme}
                  onChange={(e) => setStoreTheme(e.target.value)}
                  placeholder="e.g. modern"
                />
              </div>
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                  {primaryColor && (
                    <div
                      className="w-10 h-10 rounded border border-input"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hex color code for your store's primary color
                </p>
              </div>
              <div className="flex items-center justify-end pt-4 border-t">
                <Button onClick={handleStoreSave} disabled={savingStore}>
                  {savingStore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Store Settings'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Profile Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
            <div className="flex items-center justify-end pt-4 border-t">
              <Button onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        {/* <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-muted-foreground">Get notified when orders are placed</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-muted-foreground">Receive tips and updates from ShelfMerch</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </div>
        </Card> */}

        {/* Danger Zone */}
        {selectedStore && (
          <Card className="p-6 border-destructive">
            <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Once you delete this store, there is no going back. All products, orders, and data will be permanently removed. Please be certain.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Store
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Store Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{storeName}"? This action cannot be undone. All products, orders, and data associated with this store will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              No, go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, delete store'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Settings;