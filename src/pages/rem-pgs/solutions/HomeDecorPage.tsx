import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import HeroSection from '@/components/shared/HeroSection';
import ContentSection from '@/components/shared/ContentSection';
import FeatureIcons from '@/components/shared/FeatureIcons';
import ProductGrid from '@/components/shared/ProductGrid';
import heroHomeDecor from '@/assets/home-decor1.png';
import greenCouch from '@/assets/green-couch.png';
import worldMap from '@/assets/world-map.png';
import transformSpaces from '@/assets/transform-pgs.png';
const HomeDecorPage = () => {
  return (
    <>
      <Header />
      <HeroSection
        title="Home Decor"
        description="Offer a personalized home décor range with custom designs that reflect your style and enhance any space."
        ctaText="Let's Talk"
        ctaLink="/support/contact-us"
        image={heroHomeDecor}
        imageAlt="Modern interior design with green chairs"
      />

      {/* Transform Spaces Section - Top */}
      <section className="py-8 lg:py-12 bg-background">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Content */}
            <div className="w-full lg:w-1/2 space-y-6 order-1 lg:order-2">
              <h2 className="section-title">
                Transform Spaces with Custom Home Décor
              </h2>
              <p className="section-subtitle">
                Bring your creative vision to life with our personalized home décor range. From custom-printed cushions to vibrant wall art and stylish tableware, Shelf Merch lets you design pieces that reflect your brand or personal style. Perfect for making a statement or offering unique products your customers will love—crafted with care, delivered with speed.
              </p>
            </div>

            {/* Image */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <img
                src={transformSpaces}
                alt="Collage of framed pictures"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Creating Memorable Spaces Section - Bottom */}
      <section className="py-8 lg:py-12 bg-background">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Content */}
            <div className="w-full lg:w-1/2 space-y-6 order-1">
              <h2 className="section-title">
                Creating Memorable Spaces, One Piece at a Time
              </h2>
              <p className="section-subtitle">
                Shelf Merch partners with leading manufacturers who excel in crafting premium-quality, handmade products at lightning speed. With competitive pricing that boosts margins and delights customers, we help brands transform ordinary spaces into unforgettable moments.
              </p>
            </div>

            {/* Image */}
            <div className="w-full lg:w-1/2 order-2">
              <img
                src={greenCouch}
                alt="Green couch with decorative pillow"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Global Network Section */}
      <section className="py-8 lg:py-12 bg-background">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Content */}
            <div className="w-full lg:w-1/2 space-y-6 order-1 lg:order-2">
              <h2 className="section-title">
                Economically sound for your brand
              </h2>
              <p className="section-subtitle">
                With Shelf Merch's globally distributed network we provide localized production and faster, more affordable shipping worldwide. This means you can scale your brand seamlessly and tap into international markets without the logistical hurdles or excessive costs.
              </p>
            </div>

            {/* Image */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <img
                src={worldMap}
                alt="Global distribution network"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <FeatureIcons />
      <ProductGrid />
      <Footer />
    </>
  );
};

export default HomeDecorPage;