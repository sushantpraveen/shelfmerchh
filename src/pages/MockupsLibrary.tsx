// import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { storeProductsApi, productApi } from '@/lib/api';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { AlertTriangle, ArrowLeft, Image as ImageIcon, Save, Check, Loader2, Sparkles, ChevronRight, Eye, Download, Zap, Package } from 'lucide-react';
// import { RealisticWebGLPreview } from '@/components/admin/RealisticWebGLPreview';
// import type { DisplacementSettings, DesignPlacement } from '@/types/product';
// import { toast } from 'sonner';
// import { RAW_API_URL } from '@/config';
// import { cn } from '@/lib/utils';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';

// interface LocationState {
//     storeProductId?: string;
//     productId?: string;
//     title?: string;
//     selectedColors?: string[];
//     selectedSizes?: string[];
//     primaryColorHex?: string | null;
// }

// const MockupsLibrary = () => {
//     const navigate = useNavigate();
//     const location = useLocation();
//     const state = (location.state || {}) as LocationState;

//     const [storeProductId] = useState<string | undefined>(state.storeProductId);
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [storeProduct, setStoreProduct] = useState<any | null>(null);
//     const [sampleMockups, setSampleMockups] = useState<any[]>([]);
//     const [variants, setVariants] = useState<any[]>([]);
//     const [isLoadingMockups, setIsLoadingMockups] = useState(false);
//     const [catalogPhysicalDimensions, setCatalogPhysicalDimensions] = useState<{ width: number; height: number } | null>(null);

//     const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
//     const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
//     const previewCache = useRef<Record<string, string>>({});

//     const defaultDisplacementSettings: DisplacementSettings = {
//         scaleX: 45,
//         scaleY: 45,
//         contrastBoost: 2.0,
//     };
//     const [displacementSettings, setDisplacementSettings] = useState<DisplacementSettings>(defaultDisplacementSettings);
//     const webglContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
//     const [savedMockupUrls, setSavedMockupUrls] = useState<Record<string, string>>({});
//     const [savingMockups, setSavingMockups] = useState<Record<string, boolean>>({});
//     const [allSaved, setAllSaved] = useState(false);
//     const [isSavingAll, setIsSavingAll] = useState(false);
//     const [hasAutoSaved, setHasAutoSaved] = useState(false);

//     const [webglReadyMap, setWebglReadyMap] = useState<Record<string, boolean>>({});

//     const [selectedColors, setSelectedColors] = useState<string[]>([]);
//     const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
//     const [selectedSizesByColor, setSelectedSizesByColor] = useState<Record<string, string[]>>({});
//     const [primaryColorHex, setPrimaryColorHex] = useState<string | null>(null);

//     const [availableColors, setAvailableColors] = useState<string[]>([]);
//     const [currentPreviewColor, setCurrentPreviewColor] = useState<string | null>(null);

//     const convertPlaceholderToPixels = (
//         placeholder: any,
//         mockupImgWidth: number,
//         mockupImgHeight: number,
//         physicalDimensions: { width: number; height: number }
//     ) => {
//         const physW = physicalDimensions.width;
//         const physH = physicalDimensions.height;

//         const CANVAS_WIDTH = 800;
//         const CANVAS_HEIGHT = 600;
//         const CANVAS_PADDING = 40;
//         const EFFECTIVE_W = CANVAS_WIDTH - CANVAS_PADDING * 2;
//         const EFFECTIVE_H = CANVAS_HEIGHT - CANVAS_PADDING * 2;

//         const pxPerInchCanvas = Math.min(EFFECTIVE_W / physW, EFFECTIVE_H / physH);

//         const aspectRatio = mockupImgWidth / mockupImgHeight;
//         let imgCanvasW = EFFECTIVE_W;
//         let imgCanvasH = imgCanvasW / aspectRatio;
//         if (imgCanvasH > EFFECTIVE_H) {
//             imgCanvasH = EFFECTIVE_H;
//             imgCanvasW = EFFECTIVE_H * aspectRatio;
//         }

//         const imgStageX = CANVAS_PADDING + (EFFECTIVE_W - imgCanvasW) / 2;
//         const imgStageY = CANVAS_PADDING + (EFFECTIVE_H - imgCanvasH) / 2;

//         const scaleToRaw = mockupImgWidth / imgCanvasW;

//         const usesInches = placeholder.xIn !== undefined || placeholder.widthIn !== undefined;

//         if (usesInches) {
//             const xIn = placeholder.xIn || 0;
//             const yIn = placeholder.yIn || 0;
//             const widthIn = placeholder.widthIn || 0;
//             const heightIn = placeholder.heightIn || 0;
//             const rotation = placeholder.rotationDeg || placeholder.rotation || 0;

//             const xStage = CANVAS_PADDING + xIn * pxPerInchCanvas;
//             const yStage = CANVAS_PADDING + yIn * pxPerInchCanvas;
//             const wStage = widthIn * pxPerInchCanvas;
//             const hStage = heightIn * pxPerInchCanvas;

//             const xRelStage = xStage - imgStageX;
//             const yRelStage = yStage - imgStageY;

//             const x = xRelStage * scaleToRaw;
//             const y = yRelStage * scaleToRaw;
//             const width = wStage * scaleToRaw;
//             const height = hStage * scaleToRaw;

//             return { x, y, width, height, rotation };
//         } else {
//             return {
//                 x: placeholder.x || 0,
//                 y: placeholder.y || 0,
//                 width: placeholder.width || 0,
//                 height: placeholder.height || 0,
//                 rotation: placeholder.rotationDeg || placeholder.rotation || 0
//             };
//         }
//     };

//     const generateMockupPreview = async (
//         mockupUrl: string,
//         designUrl: string,
//         placeholder: any,
//         physicalDimensions: { width: number; height: number }
//     ): Promise<string> => {
//         return new Promise((resolve, reject) => {
//             const canvas = document.createElement('canvas');
//             const ctx = canvas.getContext('2d');
//             if (!ctx) return reject('Could not get canvas context');

//             const mockupImg = new Image();
//             mockupImg.crossOrigin = 'anonymous';

//             mockupImg.onload = () => {
//                 canvas.width = mockupImg.width;
//                 canvas.height = mockupImg.height;

//                 ctx.drawImage(mockupImg, 0, 0);

//                 const designImg = new Image();
//                 designImg.crossOrigin = 'anonymous';

//                 designImg.onload = () => {
//                     const { x, y, width, height, rotation } = convertPlaceholderToPixels(
//                         placeholder,
//                         mockupImg.width,
//                         mockupImg.height,
//                         physicalDimensions
//                     );

//                     if (width <= 0 || height <= 0) {
//                         resolve(canvas.toDataURL('image/png'));
//                         return;
//                     }

//                     ctx.save();

//                     const centerX = x + width / 2;
//                     const centerY = y + height / 2;
//                     ctx.translate(centerX, centerY);
//                     ctx.rotate((rotation * Math.PI) / 180);

//                     ctx.beginPath();
//                     ctx.rect(-width / 2, -height / 2, width, height);
//                     ctx.clip();

//                     const designAspect = designImg.width / designImg.height;
//                     const placeholderAspect = width / height;

//                     let drawWidth, drawHeight, drawX, drawY;

//                     if (designAspect > placeholderAspect) {
//                         drawHeight = height;
//                         drawWidth = height * designAspect;
//                         drawX = -drawWidth / 2;
//                         drawY = -height / 2;
//                     } else {
//                         drawWidth = width;
//                         drawHeight = width / designAspect;
//                         drawX = -width / 2;
//                         drawY = -drawHeight / 2;
//                     }

//                     ctx.drawImage(designImg, drawX, drawY, drawWidth, drawHeight);

//                     ctx.restore();

//                     try {
//                         resolve(canvas.toDataURL('image/png'));
//                     } catch (e) {
//                         console.error('Canvas export failed (likely CORS):', e);
//                         reject(e);
//                     }
//                 };

//                 designImg.onerror = () => reject('Failed to load design image');
//                 designImg.src = designUrl;
//             };

//             mockupImg.onerror = () => reject('Failed to load mockup image');
//             mockupImg.src = mockupUrl;
//         });
//     };

//     useEffect(() => {
//         const load = async () => {
//             if (!storeProductId) {
//                 setError('Missing storeProductId. Please go back to the design editor and try again.');
//                 return;
//             }
//             try {
//                 setIsLoading(true);
//                 setError(null);
//                 const resp = await storeProductsApi.getById(storeProductId);
//                 if (resp && resp.success !== false) {
//                     setStoreProduct(resp.data);
//                 } else {
//                     setError('Failed to load store product');
//                 }
//             } catch (e: any) {
//                 setError(e?.message || 'Failed to load store product');
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         load();
//     }, [storeProductId]);

//     useEffect(() => {
//         const loadSampleMockups = async () => {
//             if (!storeProduct?.catalogProductId) {
//                 return;
//             }

//             try {
//                 setIsLoadingMockups(true);
//                 const resp = await productApi.getById(storeProduct.catalogProductId);
//                 if (resp && resp.success !== false && resp.data) {
//                     const catalogProduct = resp.data;

//                     if (Array.isArray(catalogProduct.availableColors) && catalogProduct.availableColors.length > 0) {
//                         setAvailableColors(catalogProduct.availableColors);
//                     }

//                     if (Array.isArray(catalogProduct.variants)) {
//                         setVariants(catalogProduct.variants);
//                     }

//                     const productDesign = catalogProduct.design || {};
//                     const mockups = productDesign.sampleMockups || [];
//                     setSampleMockups(mockups);

//                     const physDims = productDesign.physicalDimensions;
//                     if (physDims) {
//                         setCatalogPhysicalDimensions({
//                             width: physDims.width || 20,
//                             height: physDims.height || 24
//                         });
//                     } else {
//                         setCatalogPhysicalDimensions({ width: 20, height: 24 });
//                     }
//                 }
//             } catch (e: any) {
//                 console.error('❌ Error loading sampleMockups from productcatalogs:', e);
//             } finally {
//                 setIsLoadingMockups(false);
//             }
//         };

//         if (storeProduct?.catalogProductId) {
//             loadSampleMockups();
//         }
//     }, [storeProduct?.catalogProductId]);

//     const designData = storeProduct?.designData || {};

//     const placementsByView: Record<string, Record<string, DesignPlacement>> =
//         (designData.placementsByView && typeof designData.placementsByView === 'object')
//             ? designData.placementsByView
//             : {};

//     useEffect(() => {
//         if (storeProduct?.designData) {
//             const designData = storeProduct.designData;

//             if (Array.isArray(designData.selectedColors)) {
//                 setSelectedColors(designData.selectedColors);
//             } else if (state.selectedColors && Array.isArray(state.selectedColors)) {
//                 setSelectedColors(state.selectedColors);
//             }

//             if (Array.isArray(designData.selectedSizes)) {
//                 setSelectedSizes(designData.selectedSizes);
//             } else if (state.selectedSizes && Array.isArray(state.selectedSizes)) {
//                 setSelectedSizes(state.selectedSizes);
//             }

//             if (designData.selectedSizesByColor && typeof designData.selectedSizesByColor === 'object') {
//                 setSelectedSizesByColor(designData.selectedSizesByColor);
//             }

//             if (typeof designData.primaryColorHex === 'string') {
//                 setPrimaryColorHex(designData.primaryColorHex);
//             } else if (state.primaryColorHex && typeof state.primaryColorHex === 'string') {
//                 setPrimaryColorHex(state.primaryColorHex);
//             }
//         }
//     }, [storeProduct?.designData, state.selectedColors, state.selectedSizes, state.primaryColorHex]);

//     useEffect(() => {
//         const colorsToUse = selectedColors.length > 0 ? selectedColors : availableColors;
//         if (colorsToUse.length > 0 && !currentPreviewColor) {
//             setCurrentPreviewColor(colorsToUse[0]);
//         }
//     }, [selectedColors, availableColors, currentPreviewColor]);

//     const getColorHex = (colorName: string): string => {
//         const colorMap: { [key: string]: string } = {
//             'black': '#000000',
//             'white': '#FFFFFF',
//             'red': '#FF0000',
//             'blue': '#0000FF',
//             'green': '#008000',
//             'yellow': '#FFFF00',
//             'orange': '#FFA500',
//             'purple': '#800080',
//             'pink': '#FFC0CB',
//             'brown': '#A52A2A',
//             'grey': '#808080',
//             'gray': '#808080',
//             'navy': '#000080',
//             'maroon': '#800000',
//             'olive': '#808000',
//             'lime': '#00FF00',
//             'aqua': '#00FFFF',
//             'teal': '#008080',
//             'silver': '#C0C0C0',
//             'gold': '#FFD700',
//             'beige': '#F5F5DC',
//             'tan': '#D2B48C',
//             'khaki': '#F0E68C',
//             'coral': '#FF7F50',
//             'salmon': '#FA8072',
//             'turquoise': '#40E0D0',
//             'lavender': '#E6E6FA',
//             'ivory': '#FFFFF0',
//             'cream': '#FFFDD0',
//             'mint': '#98FF98',
//             'peach': '#FFE5B4',
//             'cerulean frost': '#6D9BC3',
//             'cerulean': '#6D9BC3',
//             'cobalt blue': '#0047AB',
//             'amber': '#FFBF00',
//             'frosted': '#E8E8E8',
//             'natural': '#FAF0E6',
//             'beige-gray': '#9F9F9F',
//             'clear': '#FFFFFF',
//             'kraft': '#D4A574',
//         };

//         const normalized = colorName.toLowerCase().trim();
//         return colorMap[normalized] || '#CCCCCC';
//     };

//     const currentPreviewColorHex = currentPreviewColor ? getColorHex(currentPreviewColor) : null;

//     const colorsToDisplay = selectedColors.length > 0 ? selectedColors : availableColors;

//     const filteredMockups = useMemo(() => {
//         let result = sampleMockups.filter((m: any) =>
//             !m.colorKey ||
//             (currentPreviewColor && m.colorKey === currentPreviewColor)
//         );

//         if (currentPreviewColor && variants.length > 0) {
//             const activeVariant = variants.find((v: any) => v.color === currentPreviewColor);
//             if (activeVariant && activeVariant.viewImages) {
//                 (['front', 'back', 'left', 'right'] as const).forEach((view) => {
//                     const variantImageUrl = activeVariant.viewImages[view];
//                     if (!variantImageUrl) return;

//                     const hasMockup = result.some((m: any) => m.viewKey === view);

//                     if (!hasMockup) {
//                         const masterView = designData?.views?.find((v: any) => v.key === view);
//                         const masterPlaceholders = masterView?.placeholders || [];

//                         result.push({
//                             id: `variant-${activeVariant.id}-${view}`,
//                             viewKey: view,
//                             colorKey: currentPreviewColor,
//                             imageUrl: variantImageUrl,
//                             placeholders: masterPlaceholders,
//                             displacementSettings: null,
//                             isVariantFallback: true
//                         });
//                     }
//                 });
//             }
//         }
//         return result;
//     }, [sampleMockups, currentPreviewColor, variants, designData]);

//     const getMockupsForColor = useCallback((color: string) => {
//         let result = sampleMockups.filter((m: any) =>
//             !m.colorKey ||
//             m.colorKey === color
//         );

//         if (variants.length > 0) {
//             const activeVariant = variants.find((v: any) => v.color === color);
//             if (activeVariant && activeVariant.viewImages) {
//                 (['front', 'back', 'left', 'right'] as const).forEach((view) => {
//                     const variantImageUrl = activeVariant.viewImages[view];
//                     if (!variantImageUrl) return;

//                     const hasMockup = result.some((m: any) => m.viewKey === view);
//                     if (!hasMockup) {
//                         const masterView = designData?.views?.find((v: any) => v.key === view);
//                         const masterPlaceholders = masterView?.placeholders || [];
//                         result.push({
//                             id: `variant-${activeVariant._id || activeVariant.id}-${view}-${color.replace(/\s+/g, '-')}`,
//                             viewKey: view,
//                             colorKey: color,
//                             imageUrl: variantImageUrl,
//                             placeholders: masterPlaceholders,
//                             displacementSettings: null,
//                             isVariantFallback: true
//                         });
//                     }
//                 });
//             }
//         }
//         return result;
//     }, [sampleMockups, variants, designData]);

//     const allColorMockups = useMemo(() => {
//         const colors = colorsToDisplay.length > 0 ? colorsToDisplay : [];
//         return colors.map(color => ({
//             color,
//             colorHex: getColorHex(color),
//             mockups: getMockupsForColor(color)
//         }));
//     }, [colorsToDisplay, getMockupsForColor, getColorHex]);

//     const designImagesByView: Record<string, string> = (() => {
//         const result: Record<string, string> = {};

//         if (designData.views && typeof designData.views === 'object') {
//             Object.keys(designData.views).forEach((viewKey) => {
//                 const normalizedKey = viewKey.toLowerCase();
//                 const viewData = designData.views[viewKey];
//                 if (viewData?.imageUrl) {
//                     result[normalizedKey] = viewData.imageUrl;
//                 }
//             });
//         }

//         if (designData.designUrlsByPlaceholder && typeof designData.designUrlsByPlaceholder === 'object') {
//             Object.keys(designData.designUrlsByPlaceholder).forEach((viewKey) => {
//                 const normalizedKey = viewKey.toLowerCase();
//                 const viewDesigns = designData.designUrlsByPlaceholder[viewKey];
//                 if (viewDesigns && typeof viewDesigns === 'object') {
//                     const urls = Object.values(viewDesigns);
//                     if (urls.length > 0 && typeof urls[0] === 'string') {
//                         result[normalizedKey] = urls[0] as string;
//                     }
//                 }
//             });
//         }

//         if (Array.isArray(designData.elements) && designData.elements.length > 0) {
//             designData.elements.forEach((el: any) => {
//                 if (el?.type === 'image' && el?.imageUrl && el?.visible !== false) {
//                     const viewKey = (el.view || 'front').toLowerCase();
//                     if (!result[viewKey]) {
//                         result[viewKey] = el.imageUrl;
//                     }
//                 }
//             });
//         }

//         if (designData.savedPreviewImages && typeof designData.savedPreviewImages === 'object') {
//             Object.keys(designData.savedPreviewImages).forEach((viewKey) => {
//                 const normalizedKey = viewKey.toLowerCase();
//                 if (!result[normalizedKey] && designData.savedPreviewImages[viewKey]) {
//                     result[normalizedKey] = designData.savedPreviewImages[viewKey];
//                 }
//             });
//         }

//         return result;
//     })();

//     useEffect(() => {
//         const generateAllPreviews = async () => {
//             if (sampleMockups.length === 0) {
//                 return;
//             }

//             const hasDesignImages = Object.keys(designImagesByView).length > 0;
//             if (!hasDesignImages) {
//                 return;
//             }

//             if (!catalogPhysicalDimensions) {
//                 return;
//             }

//             const tasks = sampleMockups.map(async (mockup) => {
//                 if (!mockup.id || !mockup.imageUrl) {
//                     return;
//                 }

//                 const rawViewKey = mockup.viewKey || 'front';
//                 const viewKey = rawViewKey.toLowerCase();

//                 const designImageUrl = designImagesByView[viewKey];

//                 if (!designImageUrl) {
//                     return;
//                 }

//                 const cacheKey = `${mockup.id}:${designImageUrl}`;
//                 if (previewCache.current[cacheKey]) {
//                     setPreviewMap(prev => ({ ...prev, [mockup.id]: previewCache.current[cacheKey] }));
//                     return;
//                 }

//                 if (generatingMap[mockup.id]) {
//                     return;
//                 }

//                 try {
//                     setGeneratingMap(prev => ({ ...prev, [mockup.id]: true }));

//                     const placeholder = mockup.placeholders?.[0];
//                     if (!placeholder) {
//                         return;
//                     }

//                     const previewUrl = await generateMockupPreview(
//                         mockup.imageUrl,
//                         designImageUrl,
//                         placeholder,
//                         catalogPhysicalDimensions
//                     );

//                     previewCache.current[cacheKey] = previewUrl;
//                     setPreviewMap(prev => ({ ...prev, [mockup.id]: previewUrl }));
//                 } catch (e) {
//                     console.error(`❌ Failed to generate preview for mockup ${mockup.id}:`, e);
//                 } finally {
//                     setGeneratingMap(prev => ({ ...prev, [mockup.id]: false }));
//                 }
//             });

//             await Promise.all(tasks);
//         };

//         generateAllPreviews();
//     }, [sampleMockups, designImagesByView, catalogPhysicalDimensions]);

//     const captureWebGLPreview = useCallback(async (mockupId: string): Promise<string | null> => {
//         const container = webglContainerRefs.current[mockupId];
//         if (!container) {
//             console.warn(`WebGL container not found for mockup ${mockupId}`);
//             return null;
//         }

//         await new Promise(resolve => setTimeout(resolve, 300));
//         await new Promise(requestAnimationFrame);
//         await new Promise(requestAnimationFrame);

//         let canvas = container.querySelector('canvas');
//         if (!canvas) {
//             const divs = container.querySelectorAll('div');
//             for (const div of Array.from(divs)) {
//                 canvas = div.querySelector('canvas');
//                 if (canvas) break;
//             }
//         }

//         if (!canvas) {
//             console.warn(`Canvas element not found for mockup ${mockupId}`);
//             return null;
//         }

//         return new Promise((resolve) => {
//             canvas!.toBlob(async (blob) => {
//                 if (!blob) {
//                     console.error('Failed to convert canvas to blob');
//                     resolve(null);
//                     return;
//                 }

//                 try {
//                     const formData = new FormData();
//                     formData.append('image', blob, `mockup-preview-${mockupId}.png`);

//                     const API_BASE_URL = RAW_API_URL;
//                     const token = localStorage.getItem('token');

//                     const headers: HeadersInit = {};
//                     if (token) {
//                         headers['Authorization'] = `Bearer ${token}`;
//                     }

//                     const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
//                         method: 'POST',
//                         headers,
//                         body: formData,
//                     });

//                     const data = await response.json();
//                     if (data.success && data.url) {
//                         resolve(data.url);
//                     } else {
//                         console.error('Failed to upload preview:', data.message);
//                         resolve(null);
//                     }
//                 } catch (error) {
//                     console.error('Error uploading preview:', error);
//                     resolve(null);
//                 }
//             }, 'image/png', 1.0);
//         });
//     }, []);

//     const saveMockupPreview = useCallback(async (mockupId: string) => {
//         if (!storeProductId) {
//             toast.error('No store product ID available');
//             return;
//         }

//         setSavingMockups(prev => ({ ...prev, [mockupId]: true }));

//         try {
//             const previewUrl = await captureWebGLPreview(mockupId);
//             if (!previewUrl) {
//                 toast.error('Failed to capture preview');
//                 return;
//             }

//             const mockup = filteredMockups.find((m: any) => m.id === mockupId);
//             const viewKey = mockup?.viewKey || 'front';
//             const colorKey = currentPreviewColor?.toLowerCase().replace(/\s+/g, '-') || 'default';

//             await storeProductsApi.saveMockup(storeProductId, {
//                 mockupType: 'model',
//                 viewKey: viewKey,
//                 colorKey: colorKey,
//                 imageUrl: previewUrl,
//             });

//             setSavedMockupUrls(prev => ({ ...prev, [mockupId]: previewUrl }));
//             toast.success(`Saved model preview for ${colorKey}/${viewKey}`);
//         } catch (error: any) {
//             console.error('Failed to save mockup preview:', error);
//             toast.error(error?.message || 'Failed to save preview');
//         } finally {
//             setSavingMockups(prev => ({ ...prev, [mockupId]: false }));
//         }
//     }, [storeProductId, captureWebGLPreview, filteredMockups, currentPreviewColor]);

//     const saveAllMockupPreviews = useCallback(async () => {
//         if (!storeProductId) {
//             toast.error('No store product ID available');
//             return;
//         }

//         const allMockupsToSave: Array<{ color: string; mockup: any }> = [];
//         for (const { color, mockups } of allColorMockups) {
//             for (const mockup of mockups) {
//                 if (mockup.id) {
//                     allMockupsToSave.push({ color, mockup });
//                 }
//             }
//         }

//         if (allMockupsToSave.length === 0) {
//             toast.warning('No mockups to save');
//             return;
//         }

//         setIsSavingAll(true);
//         const savedUrls: Record<string, string> = {};
//         let successCount = 0;

//         toast.info(`Saving ${allMockupsToSave.length} mockup previews across ${allColorMockups.length} color(s)...`);

//         for (const { color, mockup } of allMockupsToSave) {
//             const mockupKey = `${color}:${mockup.id}`;
//             setSavingMockups(prev => ({ ...prev, [mockupKey]: true }));

//             try {
//                 await new Promise(resolve => setTimeout(resolve, 500));

//                 const previewUrl = await captureWebGLPreview(mockupKey);
//                 if (previewUrl) {
//                     savedUrls[mockupKey] = previewUrl;
//                     successCount++;

//                     const colorKey = color.toLowerCase().replace(/\s+/g, '-');
//                     const viewKey = mockup.viewKey || 'front';

//                     await storeProductsApi.saveMockup(storeProductId, {
//                         mockupType: 'model',
//                         viewKey: viewKey,
//                         colorKey: colorKey,
//                         imageUrl: previewUrl,
//                     });
//                 }
//             } catch (error) {
//                 console.error(`Failed to save mockup ${mockupKey}:`, error);
//             } finally {
//                 setSavingMockups(prev => ({ ...prev, [mockupKey]: false }));
//             }
//         }

//         setSavedMockupUrls(prev => ({ ...prev, ...savedUrls }));
//         setAllSaved(successCount === allMockupsToSave.length);
//         setIsSavingAll(false);

//         if (successCount === allMockupsToSave.length) {
//             toast.success(`All ${successCount} model mockups saved for ${allColorMockups.length} color(s)!`);
//         } else {
//             toast.warning(`Saved ${successCount} of ${allMockupsToSave.length} previews`);
//         }
//     }, [storeProductId, allColorMockups, captureWebGLPreview]);

//     const handleWebGLReady = useCallback((mockupId: string) => {
//         setWebglReadyMap(prev => ({ ...prev, [mockupId]: true }));
//     }, []);

//     useEffect(() => {
//         if (
//             !hasAutoSaved &&
//             storeProductId &&
//             allColorMockups.length > 0 &&
//             Object.keys(designImagesByView).length > 0 &&
//             catalogPhysicalDimensions &&
//             !isSavingAll &&
//             !isLoadingMockups
//         ) {
//             const expectedMockups: string[] = [];

//             allColorMockups.forEach(group => {
//                 group.mockups.forEach((m: any) => {
//                     const viewKey = (m.viewKey || 'front').toLowerCase();
//                     const hasDesignForView = !!designImagesByView[viewKey];
//                     const hasPlaceholder = Array.isArray(m.placeholders) && m.placeholders.length > 0;

//                     if (m.imageUrl && hasDesignForView && hasPlaceholder) {
//                         const mockupKey = `${group.color}:${m.id}`;
//                         expectedMockups.push(mockupKey);
//                     }
//                 });
//             });

//             const allReady = expectedMockups.length > 0 && expectedMockups.every(key => webglReadyMap[key]);

//             if (allReady) {
//                 saveAllMockupPreviews();
//                 setHasAutoSaved(true);
//             }
//         }
//     }, [
//         hasAutoSaved,
//         storeProductId,
//         allColorMockups,
//         designImagesByView,
//         catalogPhysicalDimensions,
//         isSavingAll,
//         isLoadingMockups,
//         saveAllMockupPreviews,
//         webglReadyMap
//     ]);

//     const previewImagesByView: Record<string, string> = designData.previewImagesByView || {};

//     const imageElements: Array<any> = Array.isArray(designData.elements)
//         ? designData.elements.filter((el: any) => el?.type === 'image' && el?.imageUrl)
//         : [];

//     const uniqueDesignImages = useMemo(() => {
//         const seenUrls = new Set<string>();
//         return imageElements.filter(el => {
//             if (!el.imageUrl || seenUrls.has(el.imageUrl)) return false;
//             seenUrls.add(el.imageUrl);
//             return true;
//         });
//     }, [imageElements]);

//     // Calculate save progress - only count mockups with designs
//     const totalMockups = allColorMockups.reduce((sum, { mockups }) => {
//         const mockupsWithDesigns = mockups.filter((mockup: any) => {
//             const viewKey = (mockup.viewKey || 'front').toLowerCase();
//             return !!designImagesByView[viewKey];
//         });
//         return sum + mockupsWithDesigns.length;
//     }, 0);
//     const savedCount = Object.keys(savedMockupUrls).length;
//     const saveProgress = totalMockups > 0 ? (savedCount / totalMockups) * 100 : 0;

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
//             {/* Animated Background Pattern */}
//             <div className="fixed inset-0 opacity-[0.015] pointer-events-none">
//                 <div className="absolute inset-0" style={{
//                     backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
//                     backgroundSize: '40px 40px'
//                 }}></div>
//             </div>

//             <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//                 {/* Header Section */}
//                 <div className="mb-10">
//                     <div className="flex items-center gap-4 mb-6">
//                         <Button 
//                             variant="outline" 
//                             size="icon" 
//                             onClick={() => navigate(-1)} 
//                             className="rounded-full border-2 hover:border-primary transition-all hover:scale-105 shadow-sm"
//                         >
//                             <ArrowLeft className="h-4 w-4" />
//                         </Button>
//                         <div className="flex-1">
//                             <div className="flex items-center gap-3 mb-2">
//                                 <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
//                                     <Package className="h-6 w-6 text-primary" />
//                                 </div>
//                                 <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
//                                     Mockups Library
//                                 </h1>
//                             </div>
//                             <p className="text-slate-600 text-sm ml-14">
//                                 Your design is ready! Preview and save professional mockups for your products
//                             </p>
//                         </div>
//                     </div>

//                     {/* Progress Bar */}
//                     {totalMockups > 0 && (
//                         <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
//                             <div className="flex items-center justify-between mb-3">
//                                 <div className="flex items-center gap-2">
//                                     <Sparkles className="h-4 w-4 text-amber-500" />
//                                     <span className="text-sm font-semibold text-slate-700">Mockup Generation Progress</span>
//                                 </div>
//                                 <span className="text-sm font-bold text-primary">{savedCount}/{totalMockups} saved</span>
//                             </div>
//                             <Progress value={saveProgress} className="h-2" />
//                         </div>
//                     )}
//                 </div>

//                 {error && (
//                     <Card className="mb-6 border-red-200 bg-red-50 shadow-sm">
//                         <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                             <div className="p-2 bg-red-100 rounded-lg">
//                                 <AlertTriangle className="h-5 w-5 text-red-600" />
//                             </div>
//                             <CardTitle className="text-base text-red-900">Error Loading Mockups</CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-sm text-red-700">{error}</CardContent>
//                     </Card>
//                 )}

//                 {isLoading && (
//                     <div className="flex flex-col items-center justify-center py-20">
//                         <div className="relative">
//                             <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-primary"></div>
//                             <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
//                         </div>
//                         <p className="mt-4 text-slate-600 font-medium">Loading your design...</p>
//                     </div>
//                 )}

//                 {!isLoading && !error && storeProduct && (
//                     <div className="space-y-8">
//                         {/* Design Previews Section */}
//                         <Card className="border-slate-200/60 shadow-lg overflow-hidden">
//                             <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/60">
//                                 <CardHeader className="pb-4">
//                                     <div className="flex items-center gap-3">
//                                         <div className="p-2 bg-primary/10 rounded-lg">
//                                             <Eye className="h-5 w-5 text-primary" />
//                                         </div>
//                                         <div>
//                                             <CardTitle className="text-lg">Your Design</CardTitle>
//                                             <CardDescription className="text-xs mt-1">
//                                                 The artwork that will appear on your products
//                                             </CardDescription>
//                                         </div>
//                                     </div>
//                                 </CardHeader>
//                             </div>
//                             <CardContent className="pt-6">
//                                 {uniqueDesignImages.length > 0 ? (
//                                     <div className="flex flex-wrap gap-4">
//                                         {uniqueDesignImages.map((el, idx) => (
//                                             <div 
//                                                 key={idx} 
//                                                 className="group relative"
//                                             >
//                                                 <div className="w-40 h-40 border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
//                                                     <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-white">
//                                                         <img
//                                                             src={el.imageUrl}
//                                                             alt={`Design ${idx + 1}`}
//                                                             className="max-w-full max-h-full object-contain"
//                                                         />
//                                                     </div>
//                                                 </div>
//                                                 {/* Hover Badge */}
//                                                 <div className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
//                                                     Design {idx + 1}
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 ) : (
//                                     <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-12 text-center">
//                                         <ImageIcon className="h-12 w-12 mx-auto mb-4 text-slate-400" />
//                                         <p className="text-sm font-medium text-slate-600 mb-1">No design preview available</p>
//                                         <p className="text-xs text-slate-500">Your design will appear here once generated</p>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>

//                         {/* Mockups Section */}
//                         <Card className="border-slate-200/60 shadow-lg overflow-hidden">
//                             <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-slate-200/60">
//                                 <CardHeader className="pb-4">
//                                     <div className="flex items-center justify-between">
//                                         <div className="flex items-center gap-3">
//                                             <div className="p-2 bg-primary/20 rounded-lg">
//                                                 <Zap className="h-5 w-5 text-primary" />
//                                             </div>
//                                             <div>
//                                                 <CardTitle className="text-lg">Realistic Mockup Previews</CardTitle>
//                                                 <CardDescription className="text-xs mt-1">
//                                                     AI-powered WebGL rendering • {allColorMockups.length} color variant{allColorMockups.length !== 1 ? 's' : ''} • {totalMockups} total mockup{totalMockups !== 1 ? 's' : ''}
//                                                 </CardDescription>
//                                             </div>
//                                         </div>
//                                         {allColorMockups.length > 0 && Object.keys(designImagesByView).length > 0 && (
//                                             <Button
//                                                 onClick={saveAllMockupPreviews}
//                                                 disabled={isSavingAll || allSaved}
//                                                 size="lg"
//                                                 className={cn(
//                                                     "gap-2 px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
//                                                     allSaved 
//                                                         ? "bg-emerald-500 hover:bg-emerald-600" 
//                                                         : "bg-gradient-to-r from-primary to-primary/80"
//                                                 )}
//                                             >
//                                                 {isSavingAll ? (
//                                                     <>
//                                                         <Loader2 className="h-4 w-4 animate-spin" />
//                                                         Saving All...
//                                                     </>
//                                                 ) : allSaved ? (
//                                                     <>
//                                                         <Check className="h-4 w-4" />
//                                                         All Saved!
//                                                     </>
//                                                 ) : (
//                                                     <>
//                                                         <Save className="h-4 w-4" />
//                                                         Save All Previews
//                                                     </>
//                                                 )}
//                                             </Button>
//                                         )}
//                                     </div>
//                                 </CardHeader>
//                             </div>

//                             <CardContent className="pt-8">
//                                 {isLoadingMockups ? (
//                                     <div className="flex flex-col items-center justify-center py-20">
//                                         <div className="relative">
//                                             <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-primary"></div>
//                                             <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
//                                         </div>
//                                         <p className="mt-4 text-slate-600 font-medium">Generating realistic mockups...</p>
//                                         <p className="mt-1 text-xs text-slate-500">This may take a moment</p>
//                                     </div>
//                                 ) : allColorMockups.length > 0 ? (
//                                     <div className="space-y-12">
//                                         {allColorMockups.map(({ color, colorHex, mockups }) => {
//                                             const colorMockupKey = (mockupId: string) => `${color}:${mockupId}`;
//                                             const mockupsWithDesigns = mockups.filter((mockup: any) => {
//                                                 const viewKey = (mockup.viewKey || 'front').toLowerCase();
//                                                 return !!designImagesByView[viewKey];
//                                             });

//                                             if (mockupsWithDesigns.length === 0) return null;

//                                             return (
//                                                 <div key={color} className="space-y-6">
//                                                     {/* Color Section Header */}
//                                                     <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
//                                                         <div 
//                                                             className="w-8 h-8 rounded-full border-4 border-white shadow-lg ring-2 ring-slate-200"
//                                                             style={{ backgroundColor: colorHex }}
//                                                         />
//                                                         <div>
//                                                             <h3 className="text-xl font-bold text-slate-800 capitalize">{color}</h3>
//                                                             <p className="text-xs text-slate-500 font-medium">
//                                                                 {mockupsWithDesigns.length} mockup{mockupsWithDesigns.length !== 1 ? 's' : ''} available
//                                                             </p>
//                                                         </div>
//                                                     </div>

//                                                     {/* Mockups Grid */}
//                                                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                                                         {mockupsWithDesigns.map((mockup: any, index: number) => {
//                                                             const viewKey = (mockup.viewKey || 'front').toLowerCase();
//                                                             const hasPlaceholder = Array.isArray(mockup.placeholders) && mockup.placeholders.length > 0;
//                                                             const mockupKey = colorMockupKey(mockup.id);
//                                                             const isSaving = savingMockups[mockupKey];
//                                                             const isSaved = !!savedMockupUrls[mockupKey];
//                                                             const mockupDisplacement: DisplacementSettings =
//                                                                 mockup.displacementSettings || displacementSettings || defaultDisplacementSettings;

//                                                             const mockupDesignUrls: Record<string, string> = {};
//                                                             const mockupPlacements: Record<string, DesignPlacement> = {};
//                                                             const hasCanvasElements = Array.isArray(designData.elements) &&
//                                                                 designData.elements.some((el: any) => !el.view || el.view === viewKey);

//                                                             if (!hasCanvasElements && designImagesByView[viewKey]) {
//                                                                 const viewPlacements = placementsByView[viewKey] || {};
//                                                                 const viewPlacementValues = Object.values(viewPlacements);
//                                                                 mockup.placeholders.forEach((ph: any, idx: number) => {
//                                                                     if (ph.id) {
//                                                                         mockupDesignUrls[ph.id] = designImagesByView[viewKey];
//                                                                         if (viewPlacementValues[idx]) {
//                                                                             mockupPlacements[ph.id] = {
//                                                                                 ...viewPlacementValues[idx],
//                                                                                 placeholderId: ph.id,
//                                                                             };
//                                                                         }
//                                                                     }
//                                                                 });
//                                                             }

//                                                             return (
//                                                                 <div 
//                                                                     key={mockupKey || index} 
//                                                                     className="group relative bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
//                                                                 >
//                                                                     {/* Card Header Overlay */}
//                                                                     <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
//                                                                         <span className="text-[10px] uppercase font-bold tracking-wider bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded text-slate-600">
//                                                                             {viewKey}
//                                                                         </span>
//                                                                         <Button
//                                                                             size="icon"
//                                                                             variant="ghost"
//                                                                             className="h-7 px-3 w-auto rounded-md bg-white/95 border border-slate-100 shadow-sm pointer-events-auto hover:bg-slate-50 transition-colors"
//                                                                             onClick={() => saveMockupPreview(mockup.id)}
//                                                                             disabled={isSaving}
//                                                                         >
//                                                                             {isSaving ? (
//                                                                                 <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
//                                                                             ) : isSaved ? (
//                                                                                 <Check className="h-3 w-3 text-emerald-500" />
//                                                                             ) : (
//                                                                                 <div className="flex items-center gap-1">
//                                                                                     <Save className="h-3 w-3 text-slate-400" />
//                                                                                     <span className="text-[10px] font-bold text-slate-500">Save</span>
//                                                                                 </div>
//                                                                             )}
//                                                                         </Button>
//                                                                     </div>

//                                                                     {/* Saved Badge */}
//                                                                     {isSaved && (
//                                                                         <div className="absolute top-3 left-3 z-30 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
//                                                                             <Check className="h-3 w-3" />
//                                                                             Saved
//                                                                         </div>
//                                                                     )}

//                                                                     {/* Mockup Image */}
//                                                                     <div className="aspect-square relative bg-white flex items-center justify-center p-6 overflow-hidden">
//                                                                         {mockup.imageUrl && hasPlaceholder && catalogPhysicalDimensions ? (
//                                                                             <div
//                                                                                 ref={(el) => { webglContainerRefs.current[mockupKey] = el; }}
//                                                                                 className="relative w-full h-full"
//                                                                             >
//                                                                                 <RealisticWebGLPreview
//                                                                                     key={`webgl-${mockupKey}-${designImagesByView[viewKey]?.slice(-20) || ''}`}
//                                                                                     mockupImageUrl={mockup.imageUrl}
//                                                                                     activePlaceholder={null}
//                                                                                     placeholders={(mockup.placeholders || []).map((p: any) => ({
//                                                                                         ...p,
//                                                                                         rotationDeg: p.rotationDeg ?? 0,
//                                                                                     }))}
//                                                                                     physicalWidth={catalogPhysicalDimensions.width}
//                                                                                     physicalHeight={catalogPhysicalDimensions.height}
//                                                                                     settings={mockupDisplacement}
//                                                                                     onSettingsChange={(settings) => {
//                                                                                         sampleMockups.forEach((m) => {
//                                                                                             if (m.id === mockup.id) {
//                                                                                                 m.displacementSettings = settings;
//                                                                                             }
//                                                                                         });
//                                                                                     }}
//                                                                                     designUrlsByPlaceholder={mockupDesignUrls}
//                                                                                     designPlacements={mockupPlacements}
//                                                                                     previewMode={true}
//                                                                                     currentView={viewKey}
//                                                                                     canvasPadding={40}
//                                                                                     PX_PER_INCH={Math.min(720 / catalogPhysicalDimensions.width, 520 / catalogPhysicalDimensions.height)}
//                                                                                     onLoad={() => handleWebGLReady(mockupKey)}
//                                                                                     canvasElements={designData.elements || []}
//                                                                                     editorPlaceholders={(() => {
//                                                                                         const masterView = designData.views?.find((v: any) => v.key === viewKey);
//                                                                                         return masterView?.placeholders || [];
//                                                                                     })()}
//                                                                                 />
//                                                                             </div>
//                                                                         ) : mockup.imageUrl ? (
//                                                                             <img
//                                                                                 src={mockup.imageUrl}
//                                                                                 alt="Mockup"
//                                                                                 className="w-full h-full object-contain"
//                                                                                 crossOrigin="anonymous"
//                                                                             />
//                                                                         ) : (
//                                                                             <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
//                                                                                 <ImageIcon className="h-8 w-8 opacity-20" />
//                                                                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Missing</span>
//                                                                             </div>
//                                                                         )}
//                                                                     </div>
//                                                                 </div>
//                                                             );
//                                                         })}
//                                                     </div>
//                                                 </div>
//                                             );
//                                         })}
//                                     </div>
//                                 ) : storeProduct.catalogProductId ? (
//                                     <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-16 text-center">
//                                         <div className="max-w-md mx-auto">
//                                             <ImageIcon className="h-16 w-16 mx-auto mb-6 text-slate-400" />
//                                             <h4 className="text-lg font-bold text-slate-700 mb-2">No Sample Mockups Found</h4>
//                                             <p className="text-sm text-slate-600">
//                                                 The product catalog doesn't have sample mockups configured for this item yet.
//                                             </p>
//                                         </div>
//                                     </div>
//                                 ) : (
//                                     <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-12 text-center">
//                                         <p className="text-sm text-slate-600">No catalog product ID available to fetch sample mockups.</p>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>

//                         {/* CTA Button */}
//                         {allColorMockups.length > 0 && Object.keys(savedMockupUrls).length > 0 && (
//                             <div className="flex justify-center pt-8 pb-12">
//                                 <Button
//                                     size="lg"
//                                     className="px-10 py-6 text-lg font-bold gap-3 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
//                                     onClick={() => {
//                                         navigate('/listing-editor', {
//                                             state: {
//                                                 ...state,
//                                                 storeProductId,
//                                                 savedMockupUrls,
//                                             },
//                                         });
//                                     }}
//                                 >
//                                     Continue to Listing Editor
//                                     <ChevronRight className="h-6 w-6" />
//                                 </Button>
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {!isLoading && !error && !storeProduct && (
//                     <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-20 text-center">
//                         <Package className="h-16 w-16 mx-auto mb-4 text-slate-400" />
//                         <h3 className="text-lg font-bold text-slate-700 mb-2">No Store Product Loaded</h3>
//                         <p className="text-sm text-slate-600">Please go back to the design editor and try again.</p>
//                     </div>
//                 )}
//             </main>
//         </div>
//     );
// };

// export default MockupsLibrary;



import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { storeProductsApi, productApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowLeft, Image as ImageIcon, Save, Check, Loader2, Sparkles, ChevronRight, Eye, Download, Zap, Package } from 'lucide-react';
import { RealisticWebGLPreview } from '@/components/admin/RealisticWebGLPreview';
import type { DisplacementSettings, DesignPlacement } from '@/types/product';
import { toast } from 'sonner';
import { RAW_API_URL } from '@/config';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface LocationState {
    storeProductId?: string;
    productId?: string;
    title?: string;
    selectedColors?: string[];
    selectedSizes?: string[];
    primaryColorHex?: string | null;
}

const MockupsLibrary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state || {}) as LocationState;

    const [storeProductId] = useState<string | undefined>(state.storeProductId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [storeProduct, setStoreProduct] = useState<any | null>(null);
    const [sampleMockups, setSampleMockups] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [isLoadingMockups, setIsLoadingMockups] = useState(false);
    const [catalogPhysicalDimensions, setCatalogPhysicalDimensions] = useState<{ width: number; height: number } | null>(null);

    const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
    const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
    const previewCache = useRef<Record<string, string>>({});

    const defaultDisplacementSettings: DisplacementSettings = {
        scaleX: 45,
        scaleY: 45,
        contrastBoost: 2.0,
    };
    const [displacementSettings, setDisplacementSettings] = useState<DisplacementSettings>(defaultDisplacementSettings);
    const webglContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [savedMockupUrls, setSavedMockupUrls] = useState<Record<string, string>>({});
    const [savingMockups, setSavingMockups] = useState<Record<string, boolean>>({});
    const [allSaved, setAllSaved] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [hasAutoSaved, setHasAutoSaved] = useState(false);

    const [webglReadyMap, setWebglReadyMap] = useState<Record<string, boolean>>({});

    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedSizesByColor, setSelectedSizesByColor] = useState<Record<string, string[]>>({});
    const [primaryColorHex, setPrimaryColorHex] = useState<string | null>(null);

    const [availableColors, setAvailableColors] = useState<string[]>([]);
    const [currentPreviewColor, setCurrentPreviewColor] = useState<string | null>(null);

    const convertPlaceholderToPixels = (
        placeholder: any,
        mockupImgWidth: number,
        mockupImgHeight: number,
        physicalDimensions: { width: number; height: number }
    ) => {
        const physW = physicalDimensions.width;
        const physH = physicalDimensions.height;

        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 600;
        const CANVAS_PADDING = 40;
        const EFFECTIVE_W = CANVAS_WIDTH - CANVAS_PADDING * 2;
        const EFFECTIVE_H = CANVAS_HEIGHT - CANVAS_PADDING * 2;

        const pxPerInchCanvas = Math.min(EFFECTIVE_W / physW, EFFECTIVE_H / physH);

        const aspectRatio = mockupImgWidth / mockupImgHeight;
        let imgCanvasW = EFFECTIVE_W;
        let imgCanvasH = imgCanvasW / aspectRatio;
        if (imgCanvasH > EFFECTIVE_H) {
            imgCanvasH = EFFECTIVE_H;
            imgCanvasW = EFFECTIVE_H * aspectRatio;
        }

        const imgStageX = CANVAS_PADDING + (EFFECTIVE_W - imgCanvasW) / 2;
        const imgStageY = CANVAS_PADDING + (EFFECTIVE_H - imgCanvasH) / 2;

        const scaleToRaw = mockupImgWidth / imgCanvasW;

        const usesInches = placeholder.xIn !== undefined || placeholder.widthIn !== undefined;

        if (usesInches) {
            const xIn = placeholder.xIn || 0;
            const yIn = placeholder.yIn || 0;
            const widthIn = placeholder.widthIn || 0;
            const heightIn = placeholder.heightIn || 0;
            const rotation = placeholder.rotationDeg || placeholder.rotation || 0;

            const xStage = CANVAS_PADDING + xIn * pxPerInchCanvas;
            const yStage = CANVAS_PADDING + yIn * pxPerInchCanvas;
            const wStage = widthIn * pxPerInchCanvas;
            const hStage = heightIn * pxPerInchCanvas;

            const xRelStage = xStage - imgStageX;
            const yRelStage = yStage - imgStageY;

            const x = xRelStage * scaleToRaw;
            const y = yRelStage * scaleToRaw;
            const width = wStage * scaleToRaw;
            const height = hStage * scaleToRaw;

            return { x, y, width, height, rotation };
        } else {
            return {
                x: placeholder.x || 0,
                y: placeholder.y || 0,
                width: placeholder.width || 0,
                height: placeholder.height || 0,
                rotation: placeholder.rotationDeg || placeholder.rotation || 0
            };
        }
    };

    const generateMockupPreview = async (
        mockupUrl: string,
        designUrl: string,
        placeholder: any,
        physicalDimensions: { width: number; height: number }
    ): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            const mockupImg = new Image();
            mockupImg.crossOrigin = 'anonymous';

            mockupImg.onload = () => {
                canvas.width = mockupImg.width;
                canvas.height = mockupImg.height;

                ctx.drawImage(mockupImg, 0, 0);

                const designImg = new Image();
                designImg.crossOrigin = 'anonymous';

                designImg.onload = () => {
                    const { x, y, width, height, rotation } = convertPlaceholderToPixels(
                        placeholder,
                        mockupImg.width,
                        mockupImg.height,
                        physicalDimensions
                    );

                    if (width <= 0 || height <= 0) {
                        resolve(canvas.toDataURL('image/png'));
                        return;
                    }

                    ctx.save();

                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate((rotation * Math.PI) / 180);

                    ctx.beginPath();
                    ctx.rect(-width / 2, -height / 2, width, height);
                    ctx.clip();

                    const designAspect = designImg.width / designImg.height;
                    const placeholderAspect = width / height;

                    let drawWidth, drawHeight, drawX, drawY;

                    if (designAspect > placeholderAspect) {
                        drawHeight = height;
                        drawWidth = height * designAspect;
                        drawX = -drawWidth / 2;
                        drawY = -height / 2;
                    } else {
                        drawWidth = width;
                        drawHeight = width / designAspect;
                        drawX = -width / 2;
                        drawY = -drawHeight / 2;
                    }

                    ctx.drawImage(designImg, drawX, drawY, drawWidth, drawHeight);

                    ctx.restore();

                    try {
                        resolve(canvas.toDataURL('image/png'));
                    } catch (e) {
                        console.error('Canvas export failed (likely CORS):', e);
                        reject(e);
                    }
                };

                designImg.onerror = () => reject('Failed to load design image');
                designImg.src = designUrl;
            };

            mockupImg.onerror = () => reject('Failed to load mockup image');
            mockupImg.src = mockupUrl;
        });
    };

    useEffect(() => {
        const load = async () => {
            if (!storeProductId) {
                setError('Missing storeProductId. Please go back to the design editor and try again.');
                return;
            }
            try {
                setIsLoading(true);
                setError(null);
                const resp = await storeProductsApi.getById(storeProductId);
                if (resp && resp.success !== false) {
                    setStoreProduct(resp.data);
                } else {
                    setError('Failed to load store product');
                }
            } catch (e: any) {
                setError(e?.message || 'Failed to load store product');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [storeProductId]);

    useEffect(() => {
        const loadSampleMockups = async () => {
            if (!storeProduct?.catalogProductId) {
                return;
            }

            try {
                setIsLoadingMockups(true);
                const resp = await productApi.getById(storeProduct.catalogProductId);
                if (resp && resp.success !== false && resp.data) {
                    const catalogProduct = resp.data;

                    if (Array.isArray(catalogProduct.availableColors) && catalogProduct.availableColors.length > 0) {
                        setAvailableColors(catalogProduct.availableColors);
                    }

                    if (Array.isArray(catalogProduct.variants)) {
                        setVariants(catalogProduct.variants);
                    }

                    const productDesign = catalogProduct.design || {};
                    const mockups = productDesign.sampleMockups || [];
                    setSampleMockups(mockups);

                    const physDims = productDesign.physicalDimensions;
                    if (physDims) {
                        setCatalogPhysicalDimensions({
                            width: physDims.width || 20,
                            height: physDims.height || 24
                        });
                    } else {
                        setCatalogPhysicalDimensions({ width: 20, height: 24 });
                    }
                }
            } catch (e: any) {
                console.error('❌ Error loading sampleMockups from productcatalogs:', e);
            } finally {
                setIsLoadingMockups(false);
            }
        };

        if (storeProduct?.catalogProductId) {
            loadSampleMockups();
        }
    }, [storeProduct?.catalogProductId]);

    const designData = storeProduct?.designData || {};

    const placementsByView: Record<string, Record<string, DesignPlacement>> =
        (designData.placementsByView && typeof designData.placementsByView === 'object')
            ? designData.placementsByView
            : {};

    useEffect(() => {
        if (storeProduct?.designData) {
            const designData = storeProduct.designData;

            if (Array.isArray(designData.selectedColors)) {
                setSelectedColors(designData.selectedColors);
            } else if (state.selectedColors && Array.isArray(state.selectedColors)) {
                setSelectedColors(state.selectedColors);
            }

            if (Array.isArray(designData.selectedSizes)) {
                setSelectedSizes(designData.selectedSizes);
            } else if (state.selectedSizes && Array.isArray(state.selectedSizes)) {
                setSelectedSizes(state.selectedSizes);
            }

            if (designData.selectedSizesByColor && typeof designData.selectedSizesByColor === 'object') {
                setSelectedSizesByColor(designData.selectedSizesByColor);
            }

            if (typeof designData.primaryColorHex === 'string') {
                setPrimaryColorHex(designData.primaryColorHex);
            } else if (state.primaryColorHex && typeof state.primaryColorHex === 'string') {
                setPrimaryColorHex(state.primaryColorHex);
            }
        }
    }, [storeProduct?.designData, state.selectedColors, state.selectedSizes, state.primaryColorHex]);

    useEffect(() => {
        const colorsToUse = selectedColors.length > 0 ? selectedColors : availableColors;
        if (colorsToUse.length > 0 && !currentPreviewColor) {
            setCurrentPreviewColor(colorsToUse[0]);
        }
    }, [selectedColors, availableColors, currentPreviewColor]);

    const getColorHex = (colorName: string): string => {
        const colorMap: { [key: string]: string } = {
            'black': '#000000',
            'white': '#FFFFFF',
            'red': '#FF0000',
            'blue': '#0000FF',
            'green': '#008000',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'brown': '#A52A2A',
            'grey': '#808080',
            'gray': '#808080',
            'navy': '#000080',
            'maroon': '#800000',
            'olive': '#808000',
            'lime': '#00FF00',
            'aqua': '#00FFFF',
            'teal': '#008080',
            'silver': '#C0C0C0',
            'gold': '#FFD700',
            'beige': '#F5F5DC',
            'tan': '#D2B48C',
            'khaki': '#F0E68C',
            'coral': '#FF7F50',
            'salmon': '#FA8072',
            'turquoise': '#40E0D0',
            'lavender': '#E6E6FA',
            'ivory': '#FFFFF0',
            'cream': '#FFFDD0',
            'mint': '#98FF98',
            'peach': '#FFE5B4',
            'cerulean frost': '#6D9BC3',
            'cerulean': '#6D9BC3',
            'cobalt blue': '#0047AB',
            'amber': '#FFBF00',
            'frosted': '#E8E8E8',
            'natural': '#FAF0E6',
            'beige-gray': '#9F9F9F',
            'clear': '#FFFFFF',
            'kraft': '#D4A574',
        };

        const normalized = colorName.toLowerCase().trim();
        return colorMap[normalized] || '#CCCCCC';
    };

    const currentPreviewColorHex = currentPreviewColor ? getColorHex(currentPreviewColor) : null;

    const colorsToDisplay = selectedColors.length > 0 ? selectedColors : availableColors;

    const filteredMockups = useMemo(() => {
        let result = sampleMockups.filter((m: any) =>
            !m.colorKey ||
            (currentPreviewColor && m.colorKey === currentPreviewColor)
        );

        if (currentPreviewColor && variants.length > 0) {
            const activeVariant = variants.find((v: any) => v.color === currentPreviewColor);
            if (activeVariant && activeVariant.viewImages) {
                (['front', 'back', 'left', 'right'] as const).forEach((view) => {
                    const variantImageUrl = activeVariant.viewImages[view];
                    if (!variantImageUrl) return;

                    const hasMockup = result.some((m: any) => m.viewKey === view);

                    if (!hasMockup) {
                        const masterView = designData?.views?.find((v: any) => v.key === view);
                        const masterPlaceholders = masterView?.placeholders || [];

                        result.push({
                            id: `variant-${activeVariant.id}-${view}`,
                            viewKey: view,
                            colorKey: currentPreviewColor,
                            imageUrl: variantImageUrl,
                            placeholders: masterPlaceholders,
                            displacementSettings: null,
                            isVariantFallback: true
                        });
                    }
                });
            }
        }
        return result;
    }, [sampleMockups, currentPreviewColor, variants, designData]);

    const getMockupsForColor = useCallback((color: string) => {
        let result = sampleMockups.filter((m: any) =>
            !m.colorKey ||
            m.colorKey === color
        );

        if (variants.length > 0) {
            const activeVariant = variants.find((v: any) => v.color === color);
            if (activeVariant && activeVariant.viewImages) {
                (['front', 'back', 'left', 'right'] as const).forEach((view) => {
                    const variantImageUrl = activeVariant.viewImages[view];
                    if (!variantImageUrl) return;

                    const hasMockup = result.some((m: any) => m.viewKey === view);
                    if (!hasMockup) {
                        const masterView = designData?.views?.find((v: any) => v.key === view);
                        const masterPlaceholders = masterView?.placeholders || [];
                        result.push({
                            id: `variant-${activeVariant._id || activeVariant.id}-${view}-${color.replace(/\s+/g, '-')}`,
                            viewKey: view,
                            colorKey: color,
                            imageUrl: variantImageUrl,
                            placeholders: masterPlaceholders,
                            displacementSettings: null,
                            isVariantFallback: true
                        });
                    }
                });
            }
        }
        return result;
    }, [sampleMockups, variants, designData]);

    const allColorMockups = useMemo(() => {
        const colors = colorsToDisplay.length > 0 ? colorsToDisplay : [];
        return colors.map(color => ({
            color,
            colorHex: getColorHex(color),
            mockups: getMockupsForColor(color)
        }));
    }, [colorsToDisplay, getMockupsForColor, getColorHex]);

    const designImagesByView: Record<string, string> = (() => {
        const result: Record<string, string> = {};

        if (designData.views && typeof designData.views === 'object') {
            Object.keys(designData.views).forEach((viewKey) => {
                const normalizedKey = viewKey.toLowerCase();
                const viewData = designData.views[viewKey];
                if (viewData?.imageUrl) {
                    result[normalizedKey] = viewData.imageUrl;
                }
            });
        }

        if (designData.designUrlsByPlaceholder && typeof designData.designUrlsByPlaceholder === 'object') {
            Object.keys(designData.designUrlsByPlaceholder).forEach((viewKey) => {
                const normalizedKey = viewKey.toLowerCase();
                const viewDesigns = designData.designUrlsByPlaceholder[viewKey];
                if (viewDesigns && typeof viewDesigns === 'object') {
                    const urls = Object.values(viewDesigns);
                    if (urls.length > 0 && typeof urls[0] === 'string') {
                        result[normalizedKey] = urls[0] as string;
                    }
                }
            });
        }

        if (Array.isArray(designData.elements) && designData.elements.length > 0) {
            designData.elements.forEach((el: any) => {
                if (el?.type === 'image' && el?.imageUrl && el?.visible !== false) {
                    const viewKey = (el.view || 'front').toLowerCase();
                    if (!result[viewKey]) {
                        result[viewKey] = el.imageUrl;
                    }
                }
            });
        }

        if (designData.savedPreviewImages && typeof designData.savedPreviewImages === 'object') {
            Object.keys(designData.savedPreviewImages).forEach((viewKey) => {
                const normalizedKey = viewKey.toLowerCase();
                if (!result[normalizedKey] && designData.savedPreviewImages[viewKey]) {
                    result[normalizedKey] = designData.savedPreviewImages[viewKey];
                }
            });
        }

        return result;
    })();

    useEffect(() => {
        const generateAllPreviews = async () => {
            if (sampleMockups.length === 0) {
                return;
            }

            const hasDesignImages = Object.keys(designImagesByView).length > 0;
            if (!hasDesignImages) {
                return;
            }

            if (!catalogPhysicalDimensions) {
                return;
            }

            const tasks = sampleMockups.map(async (mockup) => {
                if (!mockup.id || !mockup.imageUrl) {
                    return;
                }

                const rawViewKey = mockup.viewKey || 'front';
                const viewKey = rawViewKey.toLowerCase();

                const designImageUrl = designImagesByView[viewKey];

                if (!designImageUrl) {
                    return;
                }

                const cacheKey = `${mockup.id}:${designImageUrl}`;
                if (previewCache.current[cacheKey]) {
                    setPreviewMap(prev => ({ ...prev, [mockup.id]: previewCache.current[cacheKey] }));
                    return;
                }

                if (generatingMap[mockup.id]) {
                    return;
                }

                try {
                    setGeneratingMap(prev => ({ ...prev, [mockup.id]: true }));

                    const placeholder = mockup.placeholders?.[0];
                    if (!placeholder) {
                        return;
                    }

                    const previewUrl = await generateMockupPreview(
                        mockup.imageUrl,
                        designImageUrl,
                        placeholder,
                        catalogPhysicalDimensions
                    );

                    previewCache.current[cacheKey] = previewUrl;
                    setPreviewMap(prev => ({ ...prev, [mockup.id]: previewUrl }));
                } catch (e) {
                    console.error(`❌ Failed to generate preview for mockup ${mockup.id}:`, e);
                } finally {
                    setGeneratingMap(prev => ({ ...prev, [mockup.id]: false }));
                }
            });

            await Promise.all(tasks);
        };

        generateAllPreviews();
    }, [sampleMockups, designImagesByView, catalogPhysicalDimensions]);

    const captureWebGLPreview = useCallback(async (mockupId: string): Promise<string | null> => {
        const container = webglContainerRefs.current[mockupId];
        if (!container) {
            console.warn(`WebGL container not found for mockup ${mockupId}`);
            return null;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        let canvas = container.querySelector('canvas');
        if (!canvas) {
            const divs = container.querySelectorAll('div');
            for (const div of Array.from(divs)) {
                canvas = div.querySelector('canvas');
                if (canvas) break;
            }
        }

        if (!canvas) {
            console.warn(`Canvas element not found for mockup ${mockupId}`);
            return null;
        }

        return new Promise((resolve) => {
            canvas!.toBlob(async (blob) => {
                if (!blob) {
                    console.error('Failed to convert canvas to blob');
                    resolve(null);
                    return;
                }

                try {
                    const formData = new FormData();
                    formData.append('image', blob, `mockup-preview-${mockupId}.png`);

                    const API_BASE_URL = RAW_API_URL;
                    const token = localStorage.getItem('token');

                    const headers: HeadersInit = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
                        method: 'POST',
                        headers,
                        body: formData,
                    });

                    const data = await response.json();
                    if (data.success && data.url) {
                        resolve(data.url);
                    } else {
                        console.error('Failed to upload preview:', data.message);
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Error uploading preview:', error);
                    resolve(null);
                }
            }, 'image/png', 1.0);
        });
    }, []);

    const saveMockupPreview = useCallback(async (mockupId: string) => {
        if (!storeProductId) {
            toast.error('No store product ID available');
            return;
        }

        setSavingMockups(prev => ({ ...prev, [mockupId]: true }));

        try {
            const previewUrl = await captureWebGLPreview(mockupId);
            if (!previewUrl) {
                toast.error('Failed to capture preview');
                return;
            }

            const mockup = filteredMockups.find((m: any) => m.id === mockupId);
            const viewKey = mockup?.viewKey || 'front';
            const colorKey = currentPreviewColor?.toLowerCase().replace(/\s+/g, '-') || 'default';

            await storeProductsApi.saveMockup(storeProductId, {
                mockupType: 'model',
                viewKey: viewKey,
                colorKey: colorKey,
                imageUrl: previewUrl,
            });

            setSavedMockupUrls(prev => ({ ...prev, [mockupId]: previewUrl }));
            toast.success(`Saved model preview for ${colorKey}/${viewKey}`);
        } catch (error: any) {
            console.error('Failed to save mockup preview:', error);
            toast.error(error?.message || 'Failed to save preview');
        } finally {
            setSavingMockups(prev => ({ ...prev, [mockupId]: false }));
        }
    }, [storeProductId, captureWebGLPreview, filteredMockups, currentPreviewColor]);

    const saveAllMockupPreviews = useCallback(async () => {
        if (!storeProductId) {
            toast.error('No store product ID available');
            return;
        }

        const allMockupsToSave: Array<{ color: string; mockup: any }> = [];
        for (const { color, mockups } of allColorMockups) {
            for (const mockup of mockups) {
                if (mockup.id) {
                    allMockupsToSave.push({ color, mockup });
                }
            }
        }

        if (allMockupsToSave.length === 0) {
            toast.warning('No mockups to save');
            return;
        }

        setIsSavingAll(true);
        const savedUrls: Record<string, string> = {};
        let successCount = 0;

        toast.info(`Saving ${totalMockups} mockup previews across ${allColorMockups.length} color(s)...`);

        for (const { color, mockup } of allMockupsToSave) {
            const mockupKey = `${color}:${mockup.id}`;
            setSavingMockups(prev => ({ ...prev, [mockupKey]: true }));

            try {
                await new Promise(resolve => setTimeout(resolve, 500));

                const previewUrl = await captureWebGLPreview(mockupKey);
                if (previewUrl) {
                    savedUrls[mockupKey] = previewUrl;
                    successCount++;

                    const colorKey = color.toLowerCase().replace(/\s+/g, '-');
                    const viewKey = mockup.viewKey || 'front';

                    await storeProductsApi.saveMockup(storeProductId, {
                        mockupType: 'model',
                        viewKey: viewKey,
                        colorKey: colorKey,
                        imageUrl: previewUrl,
                    });
                }
            } catch (error) {
                console.error(`Failed to save mockup ${mockupKey}:`, error);
            } finally {
                setSavingMockups(prev => ({ ...prev, [mockupKey]: false }));
            }
        }

        setSavedMockupUrls(prev => ({ ...prev, ...savedUrls }));
        setAllSaved(successCount === allMockupsToSave.length);
        setIsSavingAll(false);

        if (successCount === allMockupsToSave.length) {
            toast.success(`All ${successCount} model mockups saved for ${allColorMockups.length} color(s)!`);
        } else {
            toast.warning(`Saved ${successCount} of ${totalMockups} previews`);
        }
    }, [storeProductId, allColorMockups, captureWebGLPreview]);

    const handleWebGLReady = useCallback((mockupId: string) => {
        setWebglReadyMap(prev => ({ ...prev, [mockupId]: true }));
    }, []);

    useEffect(() => {
        if (
            !hasAutoSaved &&
            storeProductId &&
            allColorMockups.length > 0 &&
            Object.keys(designImagesByView).length > 0 &&
            catalogPhysicalDimensions &&
            !isSavingAll &&
            !isLoadingMockups
        ) {
            const expectedMockups: string[] = [];

            allColorMockups.forEach(group => {
                group.mockups.forEach((m: any) => {
                    const viewKey = (m.viewKey || 'front').toLowerCase();
                    const hasDesignForView = !!designImagesByView[viewKey];
                    const hasPlaceholder = Array.isArray(m.placeholders) && m.placeholders.length > 0;

                    if (m.imageUrl && hasDesignForView && hasPlaceholder) {
                        const mockupKey = `${group.color}:${m.id}`;
                        expectedMockups.push(mockupKey);
                    }
                });
            });

            const allReady = expectedMockups.length > 0 && expectedMockups.every(key => webglReadyMap[key]);

            if (allReady) {
                saveAllMockupPreviews();
                setHasAutoSaved(true);
            }
        }
    }, [
        hasAutoSaved,
        storeProductId,
        allColorMockups,
        designImagesByView,
        catalogPhysicalDimensions,
        isSavingAll,
        isLoadingMockups,
        saveAllMockupPreviews,
        webglReadyMap
    ]);

    const previewImagesByView: Record<string, string> = designData.previewImagesByView || {};

    const imageElements: Array<any> = Array.isArray(designData.elements)
        ? designData.elements.filter((el: any) => el?.type === 'image' && el?.imageUrl)
        : [];

    const uniqueDesignImages = useMemo(() => {
        const seenUrls = new Set<string>();
        return imageElements.filter(el => {
            if (!el.imageUrl || seenUrls.has(el.imageUrl)) return false;
            seenUrls.add(el.imageUrl);
            return true;
        });
    }, [imageElements]);

    // Calculate save progress - only count mockups with designs
    const totalMockups = allColorMockups.reduce((sum, { mockups }) => {
        const mockupsWithDesigns = mockups.filter((mockup: any) => {
            const viewKey = (mockup.viewKey || 'front').toLowerCase();
            return !!designImagesByView[viewKey];
        });
        return sum + mockupsWithDesigns.length;
    }, 0);
    const savedCount = Object.keys(savedMockupUrls).length;
    const saveProgress = totalMockups > 0 ? (savedCount / totalMockups) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Animated Background Pattern */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}></div>
            </div>

            <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="rounded-full border-2 hover:border-primary transition-all hover:scale-105 shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                                    <Package className="h-6 w-6 text-primary" />
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                                    Mockups Library
                                </h1>
                            </div>
                            <p className="text-slate-600 text-sm ml-14">
                                Your design is ready! Preview and save professional mockups for your products
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {totalMockups > 0 && (
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-700">Mockup Generation Progress</span>
                                </div>
                                <span className="text-sm font-bold text-primary">{savedCount}/{totalMockups} saved</span>
                            </div>
                            <Progress value={saveProgress} className="h-2" />
                        </div>
                    )}
                </div>

                {error && (
                    <Card className="mb-6 border-red-200 bg-red-50 shadow-sm">
                        <CardHeader className="flex flex-row items-center gap-3 pb-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <CardTitle className="text-base text-red-900">Error Loading Mockups</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-red-700">{error}</CardContent>
                    </Card>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-primary"></div>
                            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="mt-4 text-slate-600 font-medium">Loading your design...</p>
                    </div>
                )}

                {!isLoading && !error && storeProduct && (
                    <div className="space-y-8">
                        {/* Design Previews Section */}
                        <Card className="border-slate-200/60 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/60">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Eye className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Your Design</CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                The artwork that will appear on your products
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </div>
                            <CardContent className="pt-6">
                                {uniqueDesignImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-4">
                                        {uniqueDesignImages.map((el, idx) => (
                                            <div
                                                key={idx}
                                                className="group relative"
                                            >
                                                <div className="w-40 h-40 border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
                                                    <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-white">
                                                        <img
                                                            src={el.imageUrl}
                                                            alt={`Design ${idx + 1}`}
                                                            className="max-w-full max-h-full object-contain"
                                                        />
                                                    </div>
                                                </div>
                                                {/* Hover Badge */}
                                                <div className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Design {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-12 text-center">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-600 mb-1">No design preview available</p>
                                        <p className="text-xs text-slate-500">Your design will appear here once generated</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Mockups Section */}
                        <Card className="border-slate-200/60 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-slate-200/60">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/20 rounded-lg">
                                                <Zap className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">Realistic Mockup Previews</CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    AI-powered WebGL rendering • {allColorMockups.length} color variant{allColorMockups.length !== 1 ? 's' : ''} • {totalMockups} total mockup{totalMockups !== 1 ? 's' : ''}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        {allColorMockups.length > 0 && Object.keys(designImagesByView).length > 0 && (
                                            <Button
                                                onClick={saveAllMockupPreviews}
                                                disabled={isSavingAll || allSaved}
                                                size="lg"
                                                className={cn(
                                                    "gap-2 px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
                                                    allSaved
                                                        ? "bg-emerald-500 hover:bg-emerald-600"
                                                        : "bg-gradient-to-r from-primary to-primary/80"
                                                )}
                                            >
                                                {isSavingAll ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving All...
                                                    </>
                                                ) : allSaved ? (
                                                    <>
                                                        <Check className="h-4 w-4" />
                                                        All Saved!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        Save All Previews
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                            </div>

                            <CardContent className="pt-8">
                                {isLoadingMockups ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="relative">
                                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-primary"></div>
                                            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                        </div>
                                        <p className="mt-4 text-slate-600 font-medium">Generating realistic mockups...</p>
                                        <p className="mt-1 text-xs text-slate-500">This may take a moment</p>
                                    </div>
                                ) : allColorMockups.length > 0 ? (
                                    <div className="space-y-12">
                                        {allColorMockups.map(({ color, colorHex, mockups }) => {
                                            const colorMockupKey = (mockupId: string) => `${color}:${mockupId}`;
                                            const mockupsWithDesigns = mockups.filter((mockup: any) => {
                                                const viewKey = (mockup.viewKey || 'front').toLowerCase();
                                                return !!designImagesByView[viewKey];
                                            });

                                            if (mockupsWithDesigns.length === 0) return null;

                                            return (
                                                <div key={color} className="space-y-6">
                                                    {/* Color Section Header */}
                                                    <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
                                                        <div
                                                            className="w-8 h-8 rounded-full border-4 border-white shadow-lg ring-2 ring-slate-200"
                                                            style={{ backgroundColor: colorHex }}
                                                        />
                                                        <div>
                                                            <h3 className="text-xl font-bold text-slate-800 capitalize">{color}</h3>
                                                            <p className="text-xs text-slate-500 font-medium">
                                                                {mockupsWithDesigns.length} mockup{mockupsWithDesigns.length !== 1 ? 's' : ''} available
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Mockups Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {mockupsWithDesigns.map((mockup: any, index: number) => {
                                                            const viewKey = (mockup.viewKey || 'front').toLowerCase();
                                                            const hasPlaceholder = Array.isArray(mockup.placeholders) && mockup.placeholders.length > 0;
                                                            const mockupKey = colorMockupKey(mockup.id);
                                                            const isSaving = savingMockups[mockupKey];
                                                            const isSaved = !!savedMockupUrls[mockupKey];
                                                            const mockupDisplacement: DisplacementSettings =
                                                                mockup.displacementSettings || displacementSettings || defaultDisplacementSettings;

                                                            const mockupDesignUrls: Record<string, string> = {};
                                                            const mockupPlacements: Record<string, DesignPlacement> = {};
                                                            const hasCanvasElements = Array.isArray(designData.elements) &&
                                                                designData.elements.some((el: any) => !el.view || el.view === viewKey);

                                                            if (!hasCanvasElements && designImagesByView[viewKey]) {
                                                                const viewPlacements = placementsByView[viewKey] || {};
                                                                const viewPlacementValues = Object.values(viewPlacements);
                                                                mockup.placeholders.forEach((ph: any, idx: number) => {
                                                                    if (ph.id) {
                                                                        mockupDesignUrls[ph.id] = designImagesByView[viewKey];
                                                                        if (viewPlacementValues[idx]) {
                                                                            mockupPlacements[ph.id] = {
                                                                                ...viewPlacementValues[idx],
                                                                                placeholderId: ph.id,
                                                                            };
                                                                        }
                                                                    }
                                                                });
                                                            }

                                                            return (
                                                                <div
                                                                    key={mockupKey || index}
                                                                    className="group relative bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                                                                >
                                                                    {/* Card Header Overlay */}
                                                                    <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                                                                        <span className="text-[10px] uppercase font-bold tracking-wider bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded text-slate-600">
                                                                            {viewKey}
                                                                        </span>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 px-3 w-auto rounded-md bg-white/95 border border-slate-100 shadow-sm pointer-events-auto hover:bg-slate-50 transition-colors"
                                                                            onClick={() => saveMockupPreview(mockup.id)}
                                                                            disabled={isSaving}
                                                                        >
                                                                            {isSaving ? (
                                                                                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                                                            ) : isSaved ? (
                                                                                <Check className="h-3 w-3 text-emerald-500" />
                                                                            ) : (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Save className="h-3 w-3 text-slate-400" />
                                                                                    <span className="text-[10px] font-bold text-slate-500">Save</span>
                                                                                </div>
                                                                            )}
                                                                        </Button>
                                                                    </div>

                                                                    {/* Saved Badge */}
                                                                    {isSaved && (
                                                                        <div className="absolute top-3 left-3 z-30 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                                                            <Check className="h-3 w-3" />
                                                                            Saved
                                                                        </div>
                                                                    )}

                                                                    {/* Mockup Image - Larger with 4:5 aspect ratio */}
                                                                    <div className="aspect-[4/5] relative bg-white overflow-hidden">
                                                                        {mockup.imageUrl && hasPlaceholder && catalogPhysicalDimensions ? (
                                                                            <div
                                                                                ref={(el) => { webglContainerRefs.current[mockupKey] = el; }}
                                                                                className="relative w-full h-full"
                                                                            >
                                                                                <RealisticWebGLPreview
                                                                                    key={`webgl-${mockupKey}-${designImagesByView[viewKey]?.slice(-20) || ''}`}
                                                                                    mockupImageUrl={mockup.imageUrl}
                                                                                    activePlaceholder={null}
                                                                                    placeholders={(mockup.placeholders || []).map((p: any) => ({
                                                                                        ...p,
                                                                                        rotationDeg: p.rotationDeg ?? 0,
                                                                                    }))}
                                                                                    physicalWidth={catalogPhysicalDimensions.width}
                                                                                    physicalHeight={catalogPhysicalDimensions.height}
                                                                                    settings={mockupDisplacement}
                                                                                    onSettingsChange={(settings) => {
                                                                                        sampleMockups.forEach((m) => {
                                                                                            if (m.id === mockup.id) {
                                                                                                m.displacementSettings = settings;
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    designUrlsByPlaceholder={mockupDesignUrls}
                                                                                    designPlacements={mockupPlacements}
                                                                                    previewMode={true}
                                                                                    currentView={viewKey}
                                                                                    canvasPadding={40}
                                                                                    PX_PER_INCH={Math.min(720 / catalogPhysicalDimensions.width, 520 / catalogPhysicalDimensions.height)}
                                                                                    onLoad={() => handleWebGLReady(mockupKey)}
                                                                                    canvasElements={designData.elements || []}
                                                                                    editorPlaceholders={(() => {
                                                                                        const masterView = designData.views?.find((v: any) => v.key === viewKey);
                                                                                        return masterView?.placeholders || [];
                                                                                    })()}
                                                                                />
                                                                            </div>
                                                                        ) : mockup.imageUrl ? (
                                                                            <img
                                                                                src={mockup.imageUrl}
                                                                                alt="Mockup"
                                                                                className="w-full h-full object-cover"
                                                                                crossOrigin="anonymous"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                                                                                <ImageIcon className="h-8 w-8 opacity-20" />
                                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Missing</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : storeProduct.catalogProductId ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-16 text-center">
                                        <div className="max-w-md mx-auto">
                                            <ImageIcon className="h-16 w-16 mx-auto mb-6 text-slate-400" />
                                            <h4 className="text-lg font-bold text-slate-700 mb-2">No Sample Mockups Found</h4>
                                            <p className="text-sm text-slate-600">
                                                The product catalog doesn't have sample mockups configured for this item yet.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-12 text-center">
                                        <p className="text-sm text-slate-600">No catalog product ID available to fetch sample mockups.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* CTA Button */}
                        {allColorMockups.length > 0 && Object.keys(savedMockupUrls).length > 0 && (
                            <div className="flex justify-end pt-8 pb-12">
                                <Button
                                    size="lg"
                                    className="px-10 py-6 text-lg font-bold gap-3 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
                                    onClick={() => {
                                        navigate('/listing-editor', {
                                            state: {
                                                ...state,
                                                storeProductId,
                                                savedMockupUrls,
                                            },
                                        });
                                    }}
                                >
                                    Continue
                                    <ChevronRight className="h-6 w-6" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {!isLoading && !error && !storeProduct && (
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-20 text-center">
                        <Package className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-700 mb-2">No Store Product Loaded</h3>
                        <p className="text-sm text-slate-600">Please go back to the design editor and try again.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MockupsLibrary;