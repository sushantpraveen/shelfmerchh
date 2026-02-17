import { Search, ShoppingBag, Menu, X, User } from "lucide-react";
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
  const { cartCount } = useCart();
  const { isAuthenticated, isLoading } = useStoreAuth();
  const params = useParams<{ subdomain?: string }>();
  const location = useLocation();
  const subdomain = getTenantSlugFromLocation(location, params) || "";

  const navLinks = [
    { name: "Products", href: buildStorePath("/products", subdomain) },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

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
                /* Profile icon will be added here later. */
                <div className="w-8" />
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
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default StoreHeader;
