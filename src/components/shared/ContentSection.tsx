import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ContentSectionProps {
  title: string;
  description: string | ReactNode;
  image?: string;
  imageAlt?: string;
  reversed?: boolean;
  ctaText?: string;
  ctaLink?: string;
  bgColor?: 'white' | 'gray';
  children?: ReactNode;
}

const ContentSection = ({
  title,
  description,
  image,
  imageAlt = '',
  reversed = false,
  ctaText,
  ctaLink = '/',
  bgColor = 'white',
  children,
}: ContentSectionProps) => {
  return (
    <section className={`py-4 lg:py-6 ${bgColor === 'gray' ? 'bg-muted/30' : 'bg-background'}`}>
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Content */}
          <div className={`w-full lg:w-1/2 space-y-4 order-1 ${reversed ? 'lg:order-2' : 'lg:order-1'}`}>
            <h2 className="section-title">{title}</h2>
            {typeof description === 'string' ? (
              <p className="section-subtitle">{description}</p>
            ) : (
              description
            )}
            {ctaText && (
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                {ctaText}
                <span>→</span>
              </Link>
            )}
            {children}
          </div>

          {/* Image */}
          {image && (
            <div className={`w-full lg:w-1/2 order-2 ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
              <img
                src={image}
                alt={imageAlt}
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContentSection;