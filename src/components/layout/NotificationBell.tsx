import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationBellProps {
    tooltipSide?: 'top' | 'bottom';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ tooltipSide = 'top' }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Don't show bell if user doesn't exist or both verifications are complete
    if (!user || (user.isEmailVerified && user.isPhoneVerified)) {
        return null;
    }

    const handleClick = () => {
        // Navigate to appropriate verification page based on what's missing
        if (!user.isEmailVerified) {
            navigate('/verify-email');
        } else if (!user.isPhoneVerified) {
            navigate('/verify-phone');
        }
    };

    return (
        <div className="relative group">
            <button
                onClick={handleClick}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-colors"
                title="Complete your verification"
                aria-label="Pending verification notification"
            >
                <Bell className="h-6 w-6 transition-transform group-hover:scale-110" />
                {/* Red badge indicator with pulse effect */}
                <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-600 ring-2 ring-white shadow-sm animate-pulse"></span>
            </button>

            {/* Tooltip - more polished style with dynamic positioning */}
            <div className={`absolute right-0 ${tooltipSide === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform ${tooltipSide === 'top' ? 'translate-y-2' : '-translate-y-2'} group-hover:translate-y-0 z-50`}>
                <div className="bg-white text-gray-900 border border-gray-100 text-sm rounded-xl py-3 px-4 shadow-xl flex flex-col gap-1 items-start">
                    <span className="font-semibold text-red-600 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        Action Required
                    </span>
                    <p className="text-gray-600 leading-tight">
                        Complete your {!user.isEmailVerified ? 'email' : 'phone'} verification to secure your account.
                    </p>
                    {tooltipSide === 'top' ? (
                        <div className="absolute top-full right-4 -mt-1.5 w-3 h-3 bg-white border-r border-b border-gray-100 transform rotate-45"></div>
                    ) : (
                        <div className="absolute bottom-full right-4 -mb-1.5 w-3 h-3 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationBell;
