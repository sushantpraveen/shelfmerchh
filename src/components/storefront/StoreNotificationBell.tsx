import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { buildStorePath } from '@/utils/tenantUtils';

interface StoreNotificationBellProps {
    subdomain: string;
    tooltipSide?: 'top' | 'bottom';
}

const StoreNotificationBell: React.FC<StoreNotificationBellProps> = ({ subdomain, tooltipSide = 'bottom' }) => {
    const { customer } = useStoreAuth();
    const navigate = useNavigate();

    // For email-based signup, phone verification is required (for checkout)
    // For phone-based signup, email verification is NOT required
    // Default to 'email' logic if signupMethod is missing for legacy users
    const showBell = (customer.signupMethod === 'email' || !customer.signupMethod) && !customer.isPhoneVerified;

    if (!customer || !showBell) {
        return null;
    }

    const handleClick = () => {
        // For store customers, we navigate to the profile page to complete verification
        navigate(buildStorePath('/profile', subdomain));
    };

    const needsEmail = !customer.isEmailVerified;
    const needsPhone = !customer.isPhoneVerified;

    return (
        <div className="relative group">
            <button
                onClick={handleClick}
                className="relative p-2 text-muted-foreground hover:text-foreground focus:outline-none rounded-full transition-colors"
                title="Complete your verification"
                aria-label="Pending verification notification"
            >
                <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
                {/* Red badge indicator with pulse effect */}
                <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse"></span>
            </button>

            {/* Tooltip */}
            <div className={`absolute right-0 ${tooltipSide === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform ${tooltipSide === 'top' ? 'translate-y-2' : '-translate-y-2'} group-hover:translate-y-0 z-50`}>
                <div className="bg-popover text-popover-foreground border border-border text-sm rounded-xl py-3 px-4 shadow-xl flex flex-col gap-1 items-start">
                    <span className="font-semibold text-red-600 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        Action Required
                    </span>
                    <p className="text-muted-foreground leading-tight">
                        Complete your phone verification to enable checkout.
                    </p>
                    {tooltipSide === 'top' ? (
                        <div className="absolute top-full right-4 -mt-1.5 w-3 h-3 bg-popover border-r border-b border-border transform rotate-45"></div>
                    ) : (
                        <div className="absolute bottom-full right-4 -mb-1.5 w-3 h-3 bg-popover border-l border-t border-border transform rotate-45"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreNotificationBell;
