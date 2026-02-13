const sharp = require('sharp');

/**
 * Determines if images in a specific folder should be normalized
 * @param {string} folder - The S3 folder name
 * @returns {boolean} - True if normalization should be applied
 */
const shouldNormalizeStoreImage = (folder) => {
    if (!folder) return false;
    // Apply normalization to product and store-related folders
    const targetFolders = [
        'products',
        'store-products',
        'store_products',
        'merch',
        'storefront',
        'generated'
    ];
    return targetFolders.some(f => folder.includes(f));
};

/**
 * Normalizes an image to a specific aspect ratio and maximum dimensions.
 * Useful for ensuring product grids look consistent.
 * 
 * @param {Buffer} imageBuffer - The raw image buffer
 * @param {Object} options - Normalization options
 * @param {number} options.targetAspectRatio - Desired width/height ratio (e.g. 0.8 for 4:5)
 * @param {number} options.maxWidth - Maximum width in pixels
 * @param {number} options.maxHeight - Maximum height in pixels
 * @param {string} options.fit - Sharp fit strategy ('cover', 'contain', 'fill', 'inside', 'outside'). 
 *                               Default 'contain' to preserve entire product image.
 * @returns {Promise<Buffer>} - The normalized image buffer
 */
const normalizeStoreImage = async (imageBuffer, options = {}) => {
    const {
        targetAspectRatio = 0.8, // Default to 4:5
        maxWidth = 1200,
        maxHeight = 1500,
        fit = 'contain', // 'contain' ensures the whole product is visible, adding background if needed
    } = options;

    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        // Calculate dimensions
        // We want the output to exactly match the aspect ratio if possible, bounded by max dims.
        // For 'contain', we create a canvas of the target ratio.

        let targetWidth = maxWidth;
        let targetHeight = Math.round(targetWidth / targetAspectRatio);

        // If calculated height is too big, constrain by height
        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = Math.round(targetHeight * targetAspectRatio);
        }

        // Start with the image
        return await image
            .resize({
                width: targetWidth,
                height: targetHeight,
                fit: fit,
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background if supported (png/webp), white if jpg
            })
            .toBuffer();

    } catch (error) {
        console.error('Image normalization error:', error);
        // If normalization fails, throw so the caller can handle it (e.g. use original)
        throw error;
    }
};

module.exports = {
    shouldNormalizeStoreImage,
    normalizeStoreImage
};
