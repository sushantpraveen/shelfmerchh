// import { SizeChart } from "./SizeChart";
// import { SizeChartData } from "@/types/product";

// interface ProductDescriptionProps {
//     sizeGuide?: string;
//     sizeChart?: SizeChartData;
//     category?: string;
//     subcategory?: string;
//     subcategoryIds?: string[];
// }

// export const ProductDescription = ({
//     sizeGuide,
//     sizeChart,
//     category = "Apparel",
//     subcategory = "T-Shirt",
//     subcategoryIds
// }: ProductDescriptionProps) => {
//     // If no size guide is provided and no size chart is enabled, we might not want to render the section header at all.
//     if (!sizeGuide && (!sizeChart || !sizeChart.enabled)) return null;

//     const isSizeChartEnabled = sizeChart && sizeChart.enabled;

//     return (
//         <section className="space-y-4">
//             <h2 className="section-title">{isSizeChartEnabled ? 'SIZE CHART' : 'SIZE GUIDE'}</h2>
//             <div className="max-w-9xl space-y-4 text-muted-foreground leading-relaxed">
//                 {isSizeChartEnabled ? (
//                     <SizeChart sizeChartData={sizeChart} hideTitle={true} />
//                 ) : (
//                     <div dangerouslySetInnerHTML={{ __html: sizeGuide || "" }} className="product-description-content" />
//                 )}
//             </div>
//         </section>
//     );
// };


import { SizeChart } from "./SizeChart";
import { SizeChartData } from "@/types/product";

interface ProductDescriptionProps {
    sizeGuide?: string;
    sizeChart?: SizeChartData;
    category?: string;
    subcategory?: string;
    subcategoryIds?: string[];
}

export const ProductDescription = ({
    sizeGuide,
    sizeChart,
    category = "Apparel",
    subcategory = "T-Shirt",
    subcategoryIds
}: ProductDescriptionProps) => {
    const isSizeChartEnabled = sizeChart?.enabled === true;
    const hasSizeGuide = !!sizeGuide?.trim();

    // Return null if nothing to show:
    // - Chart is disabled (or not set) AND no guide text exists
    if (!isSizeChartEnabled && !hasSizeGuide) return null;

    return (
        <section className="space-y-4">
            <h2 className="section-title">
                {isSizeChartEnabled ? 'SIZE CHART' : 'SIZE GUIDE'}
            </h2>

            <div className="max-w-9xl space-y-4 text-muted-foreground leading-relaxed">
                {isSizeChartEnabled ? (
                    // Toggle ON → render the admin-defined table via SizeChart
                    // hideTitle=true because we already rendered the heading above
                    <SizeChart
                        sizeChartData={sizeChart}
                        hideTitle={true}
                    />
                ) : (
                    // Toggle OFF → render HTML or plain text from admin's textarea
                    <div
                        dangerouslySetInnerHTML={{ __html: sizeGuide ?? "" }}
                        className="product-description-content prose prose-sm max-w-none"
                    />
                )}
            </div>
        </section>
    );
};
