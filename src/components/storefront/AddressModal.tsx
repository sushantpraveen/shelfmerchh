import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/locationData";
import { StoreCustomerAddress } from '@/contexts/StoreAuthContext';
import { Loader2 } from 'lucide-react';

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Omit<StoreCustomerAddress, '_id'>) => Promise<void>;
    initialData?: StoreCustomerAddress;
    title: string;
}

const AddressModal: React.FC<AddressModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    title
}) => {
    const [formData, setFormData] = useState<Omit<StoreCustomerAddress, '_id'>>({
        fullName: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        phone: '',
        isDefault: false,
        label: 'Home'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [pincodeLoading, setPincodeLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                fullName: initialData.fullName || '',
                address1: initialData.address1 || '',
                address2: initialData.address2 || '',
                city: initialData.city || '',
                state: initialData.state || '',
                zipCode: initialData.zipCode || '',
                country: initialData.country || 'India',
                phone: initialData.phone || '',
                isDefault: initialData.isDefault || false,
                label: initialData.label || 'Home'
            });
        } else {
            setFormData({
                fullName: '',
                address1: '',
                address2: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'India',
                phone: '',
                isDefault: false,
                label: 'Home'
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setFormData(prev => ({ ...prev, zipCode: value }));

        if (value.length === 6) {
            setPincodeLoading(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                const data = await response.json();
                if (data?.[0]?.Status === "Success" && data[0].PostOffice?.[0]) {
                    const place = data[0].PostOffice[0];
                    setFormData(prev => ({
                        ...prev,
                        city: place.District,
                        state: place.State
                    }));
                }
            } catch (error) {
                console.error("Error fetching pincode:", error);
            } finally {
                setPincodeLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Enter the delivery address details below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="e.g. Alex Johnson"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                    +91
                                </span>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="9876543210"
                                    className="pl-11"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="label">Address Type</Label>
                            <Select
                                value={['Home', 'Office'].includes(formData.label || '') ? formData.label : 'Other'}
                                onValueChange={(val) => {
                                    if (val !== 'Other') {
                                        setFormData(prev => ({ ...prev, label: val }));
                                    } else {
                                        // When selecting other, if it was previously Home/Office, reset or default to 'Other'
                                        if (['Home', 'Office'].includes(formData.label || '')) {
                                            setFormData(prev => ({ ...prev, label: 'Other' }));
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Home">Home</SelectItem>
                                    <SelectItem value="Office">Office</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(!['Home', 'Office'].includes(formData.label || '')) && (
                            <div className="col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label htmlFor="customLabel">Custom Address Type</Label>
                                <Input
                                    id="customLabel"
                                    value={formData.label === 'Other' ? '' : formData.label}
                                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value || 'Other' }))}
                                    placeholder="e.g. Hostel, Parents Home, PG"
                                />
                            </div>
                        )}

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="address1">Address Line 1</Label>
                            <Input
                                id="address1"
                                name="address1"
                                value={formData.address1}
                                onChange={handleChange}
                                placeholder="House / Flat No., Street, etc."
                                required
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                            <Input
                                id="address2"
                                name="address2"
                                value={formData.address2}
                                onChange={handleChange}
                                placeholder="Landmark, Area, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zipCode">Pin Code</Label>
                            <div className="relative">
                                <Input
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleZipCodeChange}
                                    placeholder="600001"
                                    maxLength={6}
                                    required
                                />
                                {pincodeLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="City"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Select
                                value={formData.state}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, state: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INDIAN_STATES.map(state => (
                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                name="country"
                                value={formData.country}
                                disabled
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || pincodeLoading}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : 'Save Address'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddressModal;
