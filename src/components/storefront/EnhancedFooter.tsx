import { Instagram, Twitter, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/tenantUtils";

interface EnhancedFooterProps {
  storeName: string;
  description?: string;
  storeSlug?: string;
}

const EnhancedFooter = ({ storeName, description, storeSlug }: EnhancedFooterProps) => {
  const currentYear = new Date().getFullYear();

  const storeHome = storeSlug ? buildStorePath('/', storeSlug) : '/';
  const allProductsHref = storeSlug ? buildStorePath('/products', storeSlug) : '/products';
  const newArrivalsHref = storeSlug ? `${storeHome}#products` : '/#products';
  const aboutHref = storeSlug ? `${storeHome}#about` : '/#about';

  return (
    <footer className="bg-muted/50 border-t border-border py-16">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Left Column - Brand */}
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-semibold text-foreground">
              {storeSlug}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description || "Premium custom merchandise designed with passion. Every piece tells a story."}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="#"
                className="p-2 rounded-full bg-background hover:bg-primary/10 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background hover:bg-primary/10 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-background hover:bg-primary/10 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 uppercase text-sm tracking-wider">
              Shop
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to={allProductsHref}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to={newArrivalsHref}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 uppercase text-sm tracking-wider">
              Help
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/support/production-shipping-times"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shipping
                </Link>
              </li>
              <li>
                <Link
                  to="/support/policies"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 uppercase text-sm tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to={aboutHref}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/support/contact-us"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/about/careers"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {storeName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Powered by ShelfMerch</span>


          </div>
        </div>
      </div>
    </footer>
  );
};

export default EnhancedFooter;



