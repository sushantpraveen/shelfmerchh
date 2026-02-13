import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [hasNotification, setHasNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [missingType, setMissingType] = useState<'email' | 'phone' | null>(null);

    useEffect(() => {
        if (!user) return;

        // Check if user has incomplete verification
        const hasEmail = !!user.email; // Check if email exists
        const hasPhone = !!user.phone; // Check if phone exists

        if (!hasEmail || !hasPhone) {
            setHasNotification(true);
            if (!hasEmail) {
                setNotificationMessage('Add your email address to complete your profile');
                setMissingType('email');
            } else if (!hasPhone) {
                setNotificationMessage('Add your phone number to complete your profile');
                setMissingType('phone');
            }
        } else {
            setHasNotification(false);
            setMissingType(null);
        }
    }, [user]);

    if (!hasNotification || !user) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {hasNotification && (
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Complete Your Profile</h4>
                        <p className="text-sm text-muted-foreground">
                            {notificationMessage}
                        </p>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => navigate(`/auth?addVerification=${missingType}`)}
                    >
                        {missingType === 'email' ? 'Add Email' : 'Add Phone Number'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
