interface ProductDescriptionProps {
    sizeGuide?: string;
    category?: string;
    subcategory?: string;
    subcategoryIds?: string[];
}

export const ProductDescription = ({
    sizeGuide,
    category = "Apparel",
    subcategory = "T-Shirt",
    subcategoryIds
}: ProductDescriptionProps) => {
    // If no size guide is provided, we might not want to render the section header at all,
    // or show a default message if appropriate.
    if (!sizeGuide) return null;

    return (
        <section className="space-y-4">
            <h2 className="section-title">SIZE GUIDE</h2>
            <div className="max-w-9xl space-y-4 text-muted-foreground leading-relaxed">
                {/* Render HTML content safely if present, otherwise plain text */}
                <div dangerouslySetInnerHTML={{ __html: sizeGuide }} className="product-description-content" />
            </div>
        </section>
    );
};
