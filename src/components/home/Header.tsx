import { Button } from "@/components/ui/button";
import { ChevronDown, User, Package, Store, Settings, LogOut, Menu, X as XIcon } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import logo from "@/assets/logo.webp";

const solutionsItems = [
  { name: 'Creators & Agencies', path: '/solutions/creators-agencies' },
  { name: 'Fashion & Apparel', path: '/solutions/fashion-apparel' },
  { name: 'Entertainment & Media', path: '/solutions/entertainment-media' },
  { name: 'Home Decor', path: '/solutions/home-decor' },
  { name: 'Customized Merch', path: '/solutions/customized-merch' },
  { name: 'Enterprise Merch', path: '/solutions/enterprise-merch' },
  { name: 'Bulk Orders', path: '/solutions/bulk-orders' },
];

const aboutUsItems = [
  { name: 'Our Story', path: '/about/our-story' },
  { name: 'Careers', path: '/about/careers' },
];

const supportItems = [
  { name: 'Help Center', path: '/support/help-center' },
  { name: 'Policies', path: '/support/policies' },
  { name: 'Production & Shipping Times', path: '/support/production-shipping-times' },
  { name: 'Customer Support Policy', path: '/support/customer-support-policy' },
  { name: 'Content Guidelines', path: '/support/content-guidelines' },
  { name: 'Contact Us', path: '/support/contact-us' },
];

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSupportExpanded, setIsSupportExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);

  const toggleMobileSubmenu = (menu: string) => {
    setOpenMobileSubmenu(openMobileSubmenu === menu ? null : menu);
  };

  const primarySupportItems = supportItems.filter(
    (item) => item.name === 'Help Center' || item.name === 'Contact Us'
  );

  const secondarySupportItems = supportItems.filter(
    (item) => item.name !== 'Help Center' && item.name !== 'Contact Us'
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center">
            <img
              src={logo}
              alt="logo"
              className="w-40 rounded-3xl shadow-2xl"
            />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/platform" className="flex items-center gap-1 transition-colors hover:text-primary">
            <span className="text-l font-medium">Platform</span>
          </Link>
          <Link to="/products" className="flex items-center gap-1 transition-colors hover:text-primary">
            <span className="text-l font-medium">Products</span>
          </Link>

          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsSolutionsOpen(true)}
            onMouseLeave={() => setIsSolutionsOpen(false)}
          >
            <button
              className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
            >
              <span className="text-l font-medium">Solutions</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSolutionsOpen && (
              <div className="absolute top-full left-0 w-56 z-[70] pt-1">
                <div className="bg-popover border border-border rounded-lg shadow-lg py-2">
                  {solutionsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSolutionsOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${location.pathname === item.path
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* About Us Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsAboutUsOpen(true)}
            onMouseLeave={() => setIsAboutUsOpen(false)}
          >
            <button
              className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
            >
              <span className="text-l font-medium">About Us</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAboutUsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAboutUsOpen && (
              <div className="absolute top-full left-0 w-56 z-[70] pt-1">
                <div className="bg-popover border border-border rounded-lg shadow-lg py-2">
                  {aboutUsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsAboutUsOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${location.pathname === item.path
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Support Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsSupportOpen(true)}
            onMouseLeave={() => {
              setIsSupportOpen(false);
              setIsSupportExpanded(false);
            }}
          >
            <button
              className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
            >
              <span className="text-l font-medium">Support</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSupportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSupportOpen && (
              <div className="absolute top-full left-0 w-56 z-[70] pt-1">
                <div className="bg-popover border border-border rounded-lg shadow-lg py-2">
                  {primarySupportItems.map((item) => {
                    if (item.name === 'Help Center') {
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => setIsSupportExpanded((prev) => !prev)}
                          className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {item.name}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsSupportOpen(false);
                          setIsSupportExpanded(false);
                        }}
                        className={`block px-4 py-2 text-sm transition-colors ${location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}

                  {isSupportExpanded &&
                    secondarySupportItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsSupportOpen(false);
                          setIsSupportExpanded(false);
                        }}
                        className={`block px-4 py-2 text-sm transition-colors ${location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/pricing" className="flex items-center gap-1 transition-colors hover:text-primary">
            <span className="text-l font-medium">Pricing</span>
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div
              className="relative"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <button className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                <User className="h-4 w-4" />
                <span className="text-l font-medium hidden md:inline">{user?.name}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 w-56 z-[70] pt-1">
                  <div className="bg-popover border border-border rounded-lg shadow-lg py-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Package className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/stores"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Store className="h-4 w-4" />
                      My Stores
                    </Link>
                    {isAuthenticated && (
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* <Link to="/auth">
                <Button variant="ghost" className="hidden sm:inline-flex text-sm font-medium">
                  Log in
                </Button>
              </Link> */}
              <Link to="/auth">
                <Button className="bg-primary hover:bg-lime-dark text-primary-foreground font-semibold px-5 py-2 rounded-lg">
                  Login/Sign Up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="text-left border-b pb-4 mb-4">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2">
                  <Link
                    to="/platform"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    Platform
                  </Link>
                  <Link
                    to="/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    Products
                  </Link>

                  {/* Solutions Accordion */}
                  <div className="border-b border-border/50">
                    <button
                      onClick={() => toggleMobileSubmenu('solutions')}
                      className="flex items-center justify-between w-full text-lg font-medium hover:text-primary transition-colors py-3"
                    >
                      Solutions
                      <ChevronDown className={`h-5 w-5 transition-transform ${openMobileSubmenu === 'solutions' ? 'rotate-180' : ''}`} />
                    </button>
                    {openMobileSubmenu === 'solutions' && (
                      <div className="pl-4 pb-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                        {solutionsItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-base text-muted-foreground hover:text-primary py-1"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* About Us Accordion */}
                  <div className="border-b border-border/50">
                    <button
                      onClick={() => toggleMobileSubmenu('about')}
                      className="flex items-center justify-between w-full text-lg font-medium hover:text-primary transition-colors py-3"
                    >
                      About Us
                      <ChevronDown className={`h-5 w-5 transition-transform ${openMobileSubmenu === 'about' ? 'rotate-180' : ''}`} />
                    </button>
                    {openMobileSubmenu === 'about' && (
                      <div className="pl-4 pb-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                        {aboutUsItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-base text-muted-foreground hover:text-primary py-1"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Support Accordion */}
                  <div className="border-b border-border/50">
                    <button
                      onClick={() => toggleMobileSubmenu('support')}
                      className="flex items-center justify-between w-full text-lg font-medium hover:text-primary transition-colors py-3"
                    >
                      Support
                      <ChevronDown className={`h-5 w-5 transition-transform ${openMobileSubmenu === 'support' ? 'rotate-180' : ''}`} />
                    </button>
                    {openMobileSubmenu === 'support' && (
                      <div className="pl-4 pb-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                        {supportItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-base text-muted-foreground hover:text-primary py-1"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/pricing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors py-3 border-b border-border/50"
                  >
                    Pricing
                  </Link>
                </nav>
                <div className="mt-8 flex flex-col gap-3">
                  {!isAuthenticated && (
                    <>
                      {/* <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start h-12 text-base font-medium">
                          Log in
                        </Button>
                      </Link> */}
                      <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full justify-start h-12 text-base font-medium bg-primary hover:bg-lime-dark text-primary-foreground">
                          Login/Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-base font-medium"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Log out
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
