import { Search, ShoppingBag, Menu, X, User, ChevronDown, Settings, LogOut, Package } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useStoreAuth } from "@/contexts/StoreAuthContext";
import { buildStorePath, getTenantSlugFromLocation } from "@/utils/tenantUtils";

interface StoreHeaderProps {
  storeName?: string;
  onCartClick?: () => void;
}

const StoreHeader = ({ storeName = "merch", onCartClick }: StoreHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated, isLoading, customer, logout } = useStoreAuth();
  const params = useParams<{ subdomain?: string }>();
  const location = useLocation();
  const subdomain = getTenantSlugFromLocation(location, params) || "";

  const navLinks = [
    { name: "Products", href: buildStorePath("/products", subdomain) },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  const handleLogout = () => {
    if (subdomain) {
      logout(subdomain);
      setIsProfileOpen(false);
    }
  };

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
            <Link to={buildStorePath("/", subdomain)} className="flex items-center gap-2">
              <span className="font-display text-2xl lg:text-3xl font-semibold text-foreground tracking-tight">
                {storeName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="nav-link text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors relative"
                aria-label="Cart"
                onClick={onCartClick}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

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
                          to={buildStorePath('/profile', subdomain)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          to={buildStorePath('/orders', subdomain)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Package className="h-4 w-4" />
                          My Orders
                        </Link>
                        <Link
                          to={buildStorePath('/settings', subdomain)}
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
                  to={buildStorePath('/auth?redirect=checkout', subdomain)}
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
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-base font-medium text-foreground py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="border-t border-border pt-4 mt-2">
                {isLoading ? (
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                ) : isAuthenticated ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-2 py-1">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
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
                      to={buildStorePath('/profile', subdomain)}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                    <Link
                      to={buildStorePath('/orders', subdomain)}
                      className="flex items-center gap-3 px-2 py-2 text-base font-medium text-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-5 w-5" />
                      My Orders
                    </Link>
                    <Link
                      to={buildStorePath('/settings', subdomain)}
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
                    to={buildStorePath('/auth?redirect=checkout', subdomain)}
                    className="flex items-center justify-center bg-foreground text-background px-4 py-3 rounded-xl text-base font-semibold shadow-md active:scale-95 transition-transform"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default StoreHeader;
