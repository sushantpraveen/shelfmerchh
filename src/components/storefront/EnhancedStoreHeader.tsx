import { Search, ShoppingBag, Menu, X, User, ChevronDown, Package, Settings, LogOut } from "lucide-react";
import { useStoreAuth } from "@/contexts/StoreAuthContext";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/tenantUtils";
import StoreNotificationBell from "./StoreNotificationBell";

interface EnhancedStoreHeaderProps {
  storeName: string;
  navLinks?: { name: string; href: string }[];
  cartItemCount: number;
  onCartClick: () => void;
  onSearchClick?: () => void;
  primaryColor?: string;
  storeSlug?: string;
}

const EnhancedStoreHeader = ({
  storeName,
  navLinks: propNavLinks,
  cartItemCount,
  onCartClick,
  onSearchClick,
  primaryColor,
  storeSlug,
}: EnhancedStoreHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, customer, logout } = useStoreAuth();

  const navLinks = propNavLinks || [
    { name: "Products", href: "#products" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  const handleLogout = () => {
    if (storeSlug) {
      logout(storeSlug);
      setIsProfileOpen(false);
    }
  };

  // Handle hash navigation: navigate to home first if needed, then scroll to section
  const handleHashNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return; // Not a hash link, let default behavior handle it

    e.preventDefault();
    const hash = href;
    const storeHome = storeSlug ? buildStorePath('/', storeSlug) : '/';
    const currentPath = location.pathname;

    // Check if we're already on the home page
    const isOnHomePage = currentPath === storeHome || currentPath === '/' ||
      (storeSlug && currentPath === `/store/${storeSlug}`);

    if (isOnHomePage) {
      // Already on home page, just scroll to section
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Navigate to home page with hash, then scroll after navigation
      navigate(`${storeHome}${hash}`, { replace: false });
      // Use setTimeout to ensure navigation completes before scrolling
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Close mobile menu if open
    setIsMenuOpen(false);
  };

  // Handle hash in URL on page load or navigation
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash, location.pathname]);

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-foreground text-background text-center py-2.5 text-sm font-medium tracking-wide">
        <span className="opacity-90">Free shipping on orders over ₹75</span>
        <span className="mx-3 opacity-50">•</span>
        <span className="opacity-90">Powered by ShelfMerch</span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to={storeSlug ? buildStorePath('/', storeSlug) : "/"} className="flex items-center gap-2">
              <span
                className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight"
                style={{ color: primaryColor || '#16a34a' }}
              >
                {storeName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isHashLink = link.href.startsWith('#');
                const isExternal = link.href.startsWith('http');

                if (isHashLink) {
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => handleHashNavigation(e, link.href)}
                      className="nav-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {link.name}
                    </a>
                  );
                }

                if (isExternal) {
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="nav-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4 font-display">
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
                onClick={onSearchClick}
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors relative"
                aria-label="Cart"
                onClick={onCartClick}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {isAuthenticated && storeSlug && (
                <StoreNotificationBell subdomain={storeSlug} />
              )}

              {/* Authentication Entry */}
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              ) : isAuthenticated ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors py-2">
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium hidden md:inline">{customer?.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-full right-0 w-48 z-[70] pt-1">
                      <div className="bg-popover border border-border rounded-xl shadow-xl py-2 overflow-hidden">
                        <Link
                          to={storeSlug ? buildStorePath('/profile', storeSlug) : "#"}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          to={storeSlug ? buildStorePath('/orders', storeSlug) : "#"}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Package className="h-4 w-4" />
                          My Orders
                        </Link>
                        <Link
                          to={storeSlug ? buildStorePath('/settings', storeSlug) : "#"}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-red-600 hover:bg-red-50 text-left font-medium"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={storeSlug ? buildStorePath('/auth?redirect=checkout', storeSlug) : "/auth?redirect=checkout"}
                  className="hidden md:inline-flex btn-outline-store bg-background text-foreground hover:bg-foreground hover:text-background px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300"
                >
                  Login / Sign Up
                </Link>
              )}

              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-background border-t border-border animate-fade-in">
            <nav className="container mx-auto px-6 py-4 flex flex-col gap-4">
              {navLinks.map((link) => {
                const isHashLink = link.href.startsWith('#');
                const isExternal = link.href.startsWith('http');

                if (isHashLink) {
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => {
                        handleHashNavigation(e, link.href);
                        setIsMenuOpen(false);
                      }}
                      className="text-base font-medium text-foreground py-2 cursor-pointer"
                    >
                      {link.name}
                    </a>
                  );
                }

                if (isExternal) {
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-foreground py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-base font-medium text-foreground py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}

              <div className="border-t border-border pt-4 mt-2">
                {isLoading ? (
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                ) : isAuthenticated ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-2 py-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-lg ring-2 ring-background ring-offset-2 ring-offset-border"
                        style={{ backgroundColor: primaryColor || '#16a34a' }}
                      >
                        {customer?.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                          {customer?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {customer?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={storeSlug ? buildStorePath('/profile', storeSlug) : "#"}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                    <Link
                      to={storeSlug ? buildStorePath('/orders', storeSlug) : "#"}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-5 w-5" />
                      My Orders
                    </Link>
                    <Link
                      to={storeSlug ? buildStorePath('/settings', storeSlug) : "#"}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-red-600 w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    to={storeSlug ? buildStorePath('/auth?redirect=checkout', storeSlug) : "/auth?redirect=checkout"}
                    className="flex items-center justify-center bg-foreground text-background px-4 py-3 rounded-xl text-base font-semibold shadow-lg active:scale-95 transition-transform"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header >
    </>
  );
};

export default EnhancedStoreHeader;

