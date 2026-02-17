import { Product } from "@/types";

/**
 * Categorizes and orders product mockup images into "Designed" and "Plain" groups.
 * 
 * Rules:
 * 1. Group A (Designed): All mockups containing user designs (from modelMockups, flatMockups, or previewImagesByView).
 * 2. Group B (Plain): All mockups without designs (from catalog sample mockups).
 * 3. Priority: If a color is provided, that color's mockups are moved to the front of their respective groups.
 * 4. Hero: The first image of the resulting combined array will be a designed mockup if any exist.
 */
export const getProductImageGroups = (product: any, selectedColor?: string) => {
    const designedImages: string[] = [];
    const plainImages: string[] = [];
    const seenUrls = new Set<string>();

    const addUrl = (url: string, group: string[]) => {
        if (url && typeof url === 'string' && !seenUrls.has(url)) {
            group.push(url);
            seenUrls.add(url);
        }
    };

    const designData = product.designData || {};
    const modelMockups = designData.modelMockups || {};
    const flatMockups = designData.flatMockups || {};
    const previewImagesByView = designData.previewImagesByView || {};

    // Group A: Designed Images

    // 1. If a specific color is selected, prioritize its model mockups
    if (selectedColor) {
        const colorKey = selectedColor.toLowerCase().replace(/\s+/g, '-');
        const colorModels = modelMockups[colorKey] || modelMockups[selectedColor] || {};
        // Ensure we check both normalized and original keys
        const views = ['front', 'back', 'left', 'right'];
        views.forEach(view => {
            if (colorModels[view]) addUrl(colorModels[view], designedImages);
        });
        // Add any other views for this color
        Object.keys(colorModels).forEach(view => {
            if (!views.includes(view)) addUrl(colorModels[view], designedImages);
        });
    }

    // 2. Add all model mockups (including other colors)
    // We prioritize the current color, but include all others to "display all available designed mockups"
    Object.keys(modelMockups).forEach(cKey => {
        const colorDict = modelMockups[cKey];
        if (colorDict && typeof colorDict === 'object') {
            ['front', 'back', 'left', 'right'].forEach(view => {
                if (colorDict[view]) addUrl(colorDict[view], designedImages);
            });
            Object.values(colorDict).forEach(url => addUrl(url as string, designedImages));
        }
    });

    // 3. Add flat mockups (generic designs)
    ['front', 'back', 'left', 'right'].forEach(view => {
        if (flatMockups[view]) addUrl(flatMockups[view], designedImages);
    });
    Object.values(flatMockups).forEach(url => addUrl(url as string, designedImages));

    // 4. Add any remaining images from previewImagesByView (designed)
    Object.values(previewImagesByView).forEach(url => addUrl(url as string, designedImages));

    // Group B: Plain Mockups (No Design)

    const catalogProduct = product.catalogProduct || {};
    const sampleMockups = catalogProduct.design?.sampleMockups ||
        catalogProduct.sampleMockups ||
        product.sampleMockups ||
        [];

    // 1. If a color is selected, prioritize plain sample mockups for that color
    if (selectedColor) {
        sampleMockups.forEach((m: any) => {
            const mColor = (m.colorKey || m.color || '').toLowerCase();
            const sColor = selectedColor.toLowerCase();
            if (m.imageUrl && (mColor === sColor || mColor === sColor.replace(/\s+/g, '-'))) {
                addUrl(m.imageUrl, plainImages);
            }
        });
    }

    // 2. Add all other sample mockups by view order
    ['front', 'back', 'left', 'right'].forEach(view => {
        sampleMockups.forEach((m: any) => {
            if (m.imageUrl && (m.viewKey === view || m.view === view)) {
                addUrl(m.imageUrl, plainImages);
            }
        });
    });

    // 3. Catch-all for remaining sample mockups
    sampleMockups.forEach((m: any) => {
        if (m.imageUrl) addUrl(m.imageUrl, plainImages);
    });

    // 4. Fallback to galleryImages if they contain something new
    if (Array.isArray(product.galleryImages)) {
        product.galleryImages.forEach((img: any) => {
            const url = typeof img === 'string' ? img : img.url;
            if (url) addUrl(url, plainImages);
        });
    }

    // 5. Final safety fallbacks from legacy fields
    if (product.mockupUrl) addUrl(product.mockupUrl, plainImages);
    if (Array.isArray(product.mockupUrls)) {
        product.mockupUrls.forEach((url: string) => addUrl(url, plainImages));
    }

    return {
        designedImages,
        plainImages,
        allImages: [...designedImages, ...plainImages]
    };
};
