import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Stage, Layer, Text, TextPath, Image, Rect, Group, Transformer, Line, Shape, Circle, RegularPolygon, Star } from 'react-konva';
import Konva from 'konva';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload, Type, Image as ImageIcon, Folder, Sparkles, Undo2, Redo2,
  ZoomIn, ZoomOut, Move, Copy, Trash2, X, Plus, Package, Menu, Save, Layers, Eye, EyeOff,
  Lock, Unlock, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Underline, Palette, Grid, Ruler, Download, Settings, Settings2, ChevronRight,
  ChevronLeft, Maximize2, Minimize2, RotateCw, Square, Circle as CircleIcon, Triangle, Sparkles as SparklesIcon, Wand2,
  Heart, Star as StarIcon, ArrowRight, Search, Filter, SortAsc, FolderOpen, ArrowLeft, ArrowUp, ArrowDown, Pen, Camera, Layout
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { productApi, storeApi, storeProductsApi } from '@/lib/api';
import TextPanel from '@/components/designer/TextPanel';
import { ProductInfoPanel } from '@/components/designer/ProductsInfoPanel';
import { RealisticWebGLPreview } from '@/components/admin/RealisticWebGLPreview';
import { UploadPanel } from '@/components/designer/UploadPanel';
import { DisplacementSettingsPanel } from '@/components/designer/DisplacementSettingsPanel';
import type { DisplacementSettings, DesignPlacement, ViewKey } from '@/types/product';
import { API_BASE_URL, RAW_API_URL } from '@/config';
import { pixelsToNormalized, createDefaultPlacement, type PrintAreaPixels } from '@/lib/placementUtils';
import { generateDefaultStoreData } from '@/utils/storeNameGenerator';


// Types
interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'group';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  zIndex: number;
  name?: string; // Human-readable name
  view?: string; // Store which view this element belongs to (e.g., 'front', 'back')
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontStyle?: string;
  align?: string;
  letterSpacing?: number;
  curved?: boolean;
  curveRadius?: number;
  curveShape?: 'arch-down' | 'arch-up' | 'circle';
  // Image specific
  imageUrl?: string;
  placeholderId?: string; // Store which placeholder this image belongs to
  // Shape specific
  shapeType?: 'rect' | 'circle' | 'triangle' | 'star' | 'heart' | 'line' | 'arrow';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // Advanced image properties
  flipX?: boolean;
  flipY?: boolean;
  scaleX?: number;
  scaleY?: number;
  lockAspectRatio?: boolean;
  skewX?: number; // Warping/distortion -180 to 180
  skewY?: number; // Warping/distortion -180 to 180
  // Filters
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  hue?: number; // 0 to 360
  blur?: number; // 0 to 20
  // Shadow
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  // Border
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed';
  // Blend mode
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
}

interface HistoryState {
  elements: CanvasElement[];
  view: string; // Track which view this history state belongs to
  timestamp: number;
}

interface Placeholder {
  id: string;
  name?: string;
  color?: string;
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
  rotationDeg?: number;
  scale?: number;
  lockSize?: boolean;
  dpi?: number;
  // For polygon/magnetic lasso placeholders
  polygonPoints?: Array<{ xIn: number; yIn: number }>;
  shapeType?: 'rect' | 'polygon';
}

interface ProductView {
  key: string;
  mockupImageUrl: string;
  placeholders: Placeholder[];
}

interface Product {
  _id?: string;
  id?: string;
  catalogue?: {
    name?: string;
    description?: string;
    basePrice?: number;
  };

  design?: {
    views?: ProductView[];
    dpi?: number;
    physicalDimensions?: {
      width?: number;  // in inches
      height?: number; // in inches
      length?: number; // in inches
    };
    displacementSettings?: DisplacementSettings;
  };
  galleryImages?: Array<{ url: string; isPrimary?: boolean }>;
  availableColors?: string[];
  availableSizes?: string[];
}

// Helper to measure text width
const getTextWidth = (text: string, fontSize: number, fontFamily: string) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  context.font = `${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
};

// Helper to calculate rotated bounding box
const calculateRotatedBounds = (x: number, y: number, width: number, height: number, rotation: number) => {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 4 corners relative to (x,y)
  // (0,0), (w,0), (w,h), (0,h)
  // Rotate: x' = x*cos - y*sin, y' = x*sin + y*cos
  const vertices = [
    { x: 0, y: 0 },
    { x: width * cos, y: width * sin },
    { x: width * cos - height * sin, y: width * sin + height * cos },
    { x: -height * sin, y: height * cos }
  ];

  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);

  return {
    minX: Math.min(...xs) + x,
    maxX: Math.max(...xs) + x,
    minY: Math.min(...ys) + y,
    maxY: Math.max(...ys) + y,
    // Relative min/max for drag constraining
    relMinX: Math.min(...xs),
    relMaxX: Math.max(...xs),
    relMinY: Math.min(...ys),
    relMaxY: Math.max(...ys)
  };
};

const DesignEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Canvas state
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const webglCanvasRef = useRef<HTMLDivElement | null>(null);
  // Track whether we've restored design state from sessionStorage
  const restoredFromSessionRef = useRef(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 1000 });

  // Tool state
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'upload' | 'graphics' | 'patterns' | 'logos' | 'ai' | 'library' | 'shapes' | 'templates'>('select');
  const [textInput, setTextInput] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#000000');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showRightPanel, setShowRightPanel] = useState(window.innerWidth >= 1024);
  const [showLeftPanel, setShowLeftPanel] = useState(window.innerWidth >= 1024);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<{ url: string; name: string }[]>([]);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<string>('product');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileToolStage, setMobileToolStage] = useState<'none' | 'menu' | 'detail'>('none');
  const [fetchedPlaceholders, setFetchedPlaceholders] = useState<Placeholder[]>([]);

  // Track if selection is from adding an asset (to prevent auto-opening properties on mobile)
  const isAddingAssetRef = useRef(false);

  // Handle window resize for isMobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
        setMobileToolStage('none');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mobile layer selection -> NO AUTO-OPEN as per user request
  useEffect(() => {
    if (isMobile && selectedIds.length > 0) {
      // Reset the flag after handling - we no longer auto-open properties
      isAddingAssetRef.current = false;
    }
  }, [selectedIds, isMobile]);

  // Touch gesture state for mobile pan/zoom
  const touchStateRef = useRef({
    distance: 0,
    lastPos: { x: 0, y: 0 },
    isPinching: false,
    isPanning: false
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));

      touchStateRef.current = {
        ...touchStateRef.current,
        distance: dist,
        isPinching: true,
        isPanning: false
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        ...touchStateRef.current,
        lastPos: { x: t.clientX, y: t.clientY },
        isPinching: false,
        isPanning: true
      };
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;

    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));

      const scaleChange = dist / touchStateRef.current.distance;
      if (Math.abs(scaleChange - 1) > 0.01) {
        setZoom(prev => Math.min(500, Math.max(10, prev * scaleChange)));
        touchStateRef.current.distance = dist;
      }
    } else if (e.touches.length === 1 && touchStateRef.current.isPanning) {
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.lastPos.x;
      const dy = t.clientY - touchStateRef.current.lastPos.y;

      setStagePos(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      touchStateRef.current.lastPos = { x: t.clientX, y: t.clientY };
    }
  }, [isMobile, zoom]);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current.isPinching = false;
    touchStateRef.current.isPanning = false;
  }, []);

  // Use ref to track selected placeholder for callback
  const selectedPlaceholderIdRef = useRef<string | null>(null);

  // Update ref when state changes
  useEffect(() => {
    selectedPlaceholderIdRef.current = selectedPlaceholderId;
    console.log('selectedPlaceholderId updated:', selectedPlaceholderId);
  }, [selectedPlaceholderId]);

  // History - proper undo/redo stack pattern
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const maxHistory = 50;
  const historySaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringHistoryRef = useRef(false); // Prevent saving history while restoring

  // View state
  const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeves'>('front');
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); // true = hide overlay/panels, show only WebGL mockup
  const [primaryColorHex, setPrimaryColorHex] = useState<string | null>(null);
  const previewModeRef = useRef(false); // Ref to ensure previewMode persists across view changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if there are unsaved changes

  // Sync ref with state
  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  const fetchUserPreviews = useCallback(async () => {
    try {
      if (!id) return;
      const token = localStorage.getItem('token');
      const resp = await fetch(`${RAW_API_URL}/api/auth/me/previews/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json?.success) {
        const previews = (json.data || {}) as Record<string, string>;
        setSavedPreviewImages(previews);
      }
    } catch (e) {
      console.error('Failed to fetch user preview images:', e);
    }
  }, [id]);

  // Design URLs by placeholder ID for WebGL preview - stored per view
  const [designUrlsByPlaceholder, setDesignUrlsByPlaceholder] = useState<Record<string, Record<string, string>>>({});

  // Design placements by placeholder ID - stores normalized (0-1) positions within print areas
  // Structure: { viewKey: { placeholderId: DesignPlacement } }
  const [placementsByView, setPlacementsByView] = useState<Record<string, Record<string, DesignPlacement>>>({});

  // Helper functions for view-specific designUrlsByPlaceholder
  const getDesignUrlsForView = useCallback((view: string): Record<string, string> => {
    return designUrlsByPlaceholder[view] || {};
  }, [designUrlsByPlaceholder]);

  // Helper to create a simple hash of design URLs for key generation
  const getDesignUrlsHash = useCallback((view: string): string => {
    const urls = getDesignUrlsForView(view);
    const keys = Object.keys(urls).sort();
    if (keys.length === 0) return 'no-designs';
    // Create a simple hash from placeholder IDs and URL lengths
    return keys.map(k => `${k.slice(0, 4)}-${urls[k]?.slice(-10) || ''}`).join('_');
  }, [getDesignUrlsForView]);

  const setDesignUrlForView = useCallback((view: string, placeholderId: string, designUrl: string) => {
    setDesignUrlsByPlaceholder(prev => ({
      ...prev,
      [view]: {
        ...(prev[view] || {}),
        [placeholderId]: designUrl,
      },
    }));
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    // Mark this specific view as dirty for design changes
    setDirtyViewsForDesign(prev => new Set([...prev, view]));
    console.log('Design changed for view, marking dirty:', view);
  }, []);

  const removeDesignUrlForView = useCallback((view: string, placeholderId: string) => {
    setDesignUrlsByPlaceholder(prev => {
      const viewDesigns = prev[view] || {};
      const updated = { ...viewDesigns };
      delete updated[placeholderId];
      return {
        ...prev,
        [view]: updated,
      };
    });
    // Also remove placement
    setPlacementsByView(prev => {
      const viewPlacements = prev[view] || {};
      const updated = { ...viewPlacements };
      delete updated[placeholderId];
      return {
        ...prev,
        [view]: updated,
      };
    });
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  }, []);

  // Get placements for a specific view
  const getPlacementsForView = useCallback((view: string): Record<string, DesignPlacement> => {
    return placementsByView[view] || {};
  }, [placementsByView]);

  // Set placement for a specific placeholder in a view
  const setPlacementForView = useCallback((view: string, placeholderId: string, placement: DesignPlacement) => {
    setPlacementsByView(prev => ({
      ...prev,
      [view]: {
        ...(prev[view] || {}),
        [placeholderId]: placement,
      },
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleTextDblClick = useCallback((id: string) => {
    setEditingTextId(id);
  }, []);

  // Compute normalized placement from an element's pixel coordinates
  // This is called whenever an image element is added or transformed


  const computePlacementFromElement = useCallback((
    element: CanvasElement,
    viewPlaceholders: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ): DesignPlacement | null => {
    if (!element.placeholderId || !element.width || !element.height) {
      return null;
    }

    const placeholder = viewPlaceholders.find(p => p.id === element.placeholderId);
    if (!placeholder) {
      return null;
    }

    // Print area in pixels
    const printArea: PrintAreaPixels = {
      x: placeholder.x,
      y: placeholder.y,
      w: placeholder.width,
      h: placeholder.height,
    };

    // Element bounds in pixels
    const designBounds = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0,
    };

    // Convert to normalized placement
    const viewKey = (element.view || currentView) as ViewKey;
    return pixelsToNormalized(designBounds, printArea, viewKey, element.placeholderId);
  }, [currentView]);

  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  // Store mockup images per view to prevent losing previous mockups when switching
  const [mockupImagesByView, setMockupImagesByView] = useState<Record<string, HTMLImageElement | null>>({});
  const [imageSizesByView, setImageSizesByView] = useState<Record<string, { width: number; height: number; x: number; y: number }>>({});

  // Current view's mockup (derived from mockupImagesByView)
  const mockupImage = mockupImagesByView[currentView] || null;
  const imageSize = imageSizesByView[currentView] || { width: 0, height: 0, x: 0, y: 0 };
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]); // Keep for backward compatibility
  const [selectedSizesByColor, setSelectedSizesByColor] = useState<Record<string, string[]>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [displacementSettings, setDisplacementSettings] = useState<DisplacementSettings>({
    scaleX: 20,
    scaleY: 20,
    contrastBoost: 1.5,
  });
  const [savedPreviewImages, setSavedPreviewImages] = useState<Record<string, string>>({});

  // Preview cache with proper keying: viewKey|garmentTintHex|designSig|settingsSig
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});

  // Dirty flags: track which views need regeneration
  const [dirtyViewsForColor, setDirtyViewsForColor] = useState<Set<string>>(new Set());
  const [dirtyViewsForDesign, setDirtyViewsForDesign] = useState<Set<string>>(new Set());

  // --- VARIANT VALIDATION ---
  const variantValidation = useMemo(() => {
    if (selectedColors.length === 0) {
      return { isValid: false, message: 'Please select at least one color variant' };
    }

    // Check if any sizes are selected across all selected colors
    // Use the same logic as handlePublishToStore for size resolution
    const hasAnySize = selectedColors.some(color => {
      const sizes = selectedSizesByColor[color] || selectedSizes;
      return sizes.length > 0;
    });

    if (!hasAnySize) {
      return { isValid: false, message: 'Please select at least one size variant' };
    }

    return { isValid: true };
  }, [selectedColors, selectedSizes, selectedSizesByColor]);

  // Generate cache key: viewKey|garmentTintHex|designSig|settingsSig
  const getPreviewCacheKey = useCallback((viewKey: string): string => {
    const colorKey = primaryColorHex || 'no-color';
    const designSig = getDesignUrlsHash(viewKey);
    // Include canvas elements in design signature - match WebGL filtering logic exactly
    // Elements without view property appear on all views, so include them for all views
    const viewElements = elements.filter(el =>
      el.view === viewKey || (!el.view) // Match WebGL: el.view === currentView || !el.view
    );
    const elementsSig = viewElements.length > 0
      ? viewElements.map(el => `${el.id}-${el.type}-${el.imageUrl?.slice(-10) || ''}`).join('|')
      : 'no-elements';
    const combinedDesignSig = `${designSig}|${elementsSig}`;
    const settingsSig = `${displacementSettings.scaleX}|${displacementSettings.scaleY}|${displacementSettings.contrastBoost}`;
    return `${viewKey}|${colorKey}|${combinedDesignSig}|${settingsSig}`;
  }, [primaryColorHex, getDesignUrlsHash, elements, displacementSettings]);

  // Wrapper for displacement settings that marks unsaved changes
  const handleDisplacementSettingsChange = useCallback((settings: DisplacementSettings) => {
    setDisplacementSettings(settings);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    // Mark current view as dirty for design changes (settings affect preview)
    setDirtyViewsForDesign(prev => new Set([...prev, currentView]));
  }, [currentView]);

  // Handle global color change - mark ALL views dirty
  useEffect(() => {
    if (product?.design?.views) {
      const allViewKeys = product.design.views.map((v: ProductView) => v.key);
      setDirtyViewsForColor(new Set(allViewKeys));
      console.log('[DesignEditor] Global color changed:', {
        primaryColorHex,
        currentView,
        allViewKeys,
        elementsCount: elements.length,
        elementsByView: {
          front: elements.filter(e => e.view === 'front' || !e.view).length,
          back: elements.filter(e => e.view === 'back').length,
        },
        designUrlsByPlaceholder: Object.keys(designUrlsByPlaceholder).reduce((acc, view) => {
          acc[view] = Object.keys(designUrlsByPlaceholder[view] || {}).length;
          return acc;
        }, {} as Record<string, number>),
      });
    }
  }, [primaryColorHex, product?.design?.views]);

  // Instrumentation + single-renderer assertion
  useEffect(() => {
    const container = webglCanvasRef.current;
    if (!container) return;
    const allCanvases = container.querySelectorAll('canvas');
    const visibleCanvases = Array.from(allCanvases).filter(c => {
      const style = window.getComputedStyle(c.parentElement || c);
      return style.display !== 'none';
    });
    console.log(`[ASSERT] previewMode=${previewMode}, total canvases=${allCanvases.length}, visible=${visibleCanvases.length}`);

    // Count Konva text nodes
    if (stageRef.current) {
      const texts = stageRef.current.find('Text');
      console.log(`[INSTRUMENTATION DesignEditor] Konva Text nodes: ${texts.length}, expected: ${elements.filter(e => e.type === 'text').length}`);
    }
  }, [previewMode, elements]);


  const tools = [
    {
      icon: Upload,
      label: 'Upload',
      toolKey: 'upload' as const,
      onClick: () => {
        setActiveTool('upload');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Type,
      label: 'Text',
      toolKey: 'text' as const,
      onClick: () => {
        setActiveTool('text');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Sparkles,
      label: 'Shapes',
      toolKey: 'shapes' as const,
      onClick: () => {
        setActiveTool('shapes');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Palette,
      label: 'Graphics',
      toolKey: 'graphics' as const,
      onClick: () => {
        setActiveTool('graphics');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Wand2,
      label: 'Patterns',
      toolKey: 'patterns' as const,
      onClick: () => {
        setActiveTool('patterns');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: ImageIcon,
      label: 'Logos',
      toolKey: 'logos' as const,
      onClick: () => {
        setActiveTool('logos');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Folder,
      label: 'Library',
      toolKey: 'library' as const,
      onClick: () => {
        setActiveTool('library');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    },
    {
      icon: Layout,
      label: 'Templates',
      toolKey: 'templates' as const,
      onClick: () => {
        setActiveTool('templates');
        setShowLeftPanel(true);
        if (isMobile) setMobileToolStage('detail');
      }
    }
  ];

  // Canvas dimensions - fixed size like admin
  const canvasWidth = 800;
  const canvasHeight = 600;
  const canvasPadding = 40;
  const effectiveCanvasWidth = canvasWidth - (canvasPadding * 2);
  const effectiveCanvasHeight = canvasHeight - (canvasPadding * 2);

  // Ensure Stage is sized immediately so Konva placeholder outlines appear instantly
  useEffect(() => {
    setStageSize({ width: canvasWidth, height: canvasHeight });
  }, [canvasWidth, canvasHeight]);

  // Function to load mockup for a specific view
  const loadMockupForView = useCallback((viewKey: string, views: ProductView[]) => {
    const view = views.find((v: ProductView) => v.key === viewKey);

    if (view?.mockupImageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Store mockup image per view
        setMockupImagesByView(prev => ({
          ...prev,
          [viewKey]: img
        }));

        // Calculate size to fit canvas while maintaining aspect ratio with padding
        const aspectRatio = img.width / img.height;
        const maxWidth = effectiveCanvasWidth;
        const maxHeight = effectiveCanvasHeight;

        let width = maxWidth;
        let height = maxWidth / aspectRatio;

        // If height exceeds, fit to height instead
        if (height > maxHeight) {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }

        // Center the image
        const x = canvasPadding + (maxWidth - width) / 2;
        const y = canvasPadding + (maxHeight - height) / 2;

        const calculatedSize = { width, height, x, y };
        // Store image size per view
        setImageSizesByView(prev => ({
          ...prev,
          [viewKey]: calculatedSize
        }));
        setStageSize({ width: canvasWidth, height: canvasHeight });

        console.log(`Mockup image loaded for ${viewKey} view:`, {
          original: { width: img.width, height: img.height },
          displayed: calculatedSize,
          canvas: { width: canvasWidth, height: canvasHeight }
        });
      };
      img.onerror = () => {
        toast.error(`Failed to load mockup image for ${viewKey} view`);
        console.error(`Failed to load mockup for ${viewKey} view`);
        // Store null to prevent retrying
        setMockupImagesByView(prev => ({
          ...prev,
          [viewKey]: null
        }));
        setImageSizesByView(prev => ({
          ...prev,
          [viewKey]: { width: 0, height: 0, x: 0, y: 0 }
        }));
      };
      img.src = `${view.mockupImageUrl}?t=${Date.now()}`;
    } else {
      // No mockup available for this view
      console.warn(`No mockup image found for ${viewKey} view`);
      setMockupImagesByView(prev => ({
        ...prev,
        [viewKey]: null
      }));
      setImageSizesByView(prev => ({
        ...prev,
        [viewKey]: { width: 0, height: 0, x: 0, y: 0 }
      }));
    }
  }, [effectiveCanvasWidth, effectiveCanvasHeight, canvasPadding, canvasWidth, canvasHeight]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setIsLoadingProduct(false);
        return;
      }

      try {
        setIsLoadingProduct(true);
        const response = await productApi.getById(id);
        if (response && response.data) {
          console.log('Fetched product data:', {
            product: response.data,
            design: response.data.design,
            views: response.data.design?.views,
            physicalDimensions: response.data.design?.physicalDimensions
          });

          setProduct(response.data);
          const previews = (response.data.design as any)?.previewImages || {};
          if (previews && typeof previews === 'object') {
            setSavedPreviewImages(previews);
          }

          // Load mockup image for current view
          if (response.data.design?.views) {
            loadMockupForView(currentView, response.data.design.views);
          }

          // Initialize displacement settings from product design (if present)
          if (response.data.design?.displacementSettings) {
            setDisplacementSettings(response.data.design.displacementSettings);
          }

          // Reset unsaved changes flag when product is loaded (no changes yet)
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Failed to load product data');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [id, canvasWidth, canvasHeight, effectiveCanvasWidth, effectiveCanvasHeight, canvasPadding, loadMockupForView]);

  // Restore design state from sessionStorage after product loads
  useEffect(() => {
    if (!id || !product) return;

    try {
      const savedState = sessionStorage.getItem(`designer_state_${id}`);
      if (savedState) {
        const designState = JSON.parse(savedState);
        if (designState.elements && Array.isArray(designState.elements)) {
          setElements(designState.elements);
          // Initialize history with restored elements (filter by current view)
          const currentViewElements = designState.elements.filter((el: CanvasElement) => !el.view || el.view === currentView);
          const initialState: HistoryState = {
            elements: JSON.parse(JSON.stringify(currentViewElements)),
            view: currentView,
            timestamp: Date.now()
          };
          setUndoStack([initialState]);
          setRedoStack([]);
        }
        if (designState.selectedColors && Array.isArray(designState.selectedColors)) {
          setSelectedColors(designState.selectedColors);
        }
        if (designState.selectedSizes && Array.isArray(designState.selectedSizes)) {
          setSelectedSizes(designState.selectedSizes);
        }
        if (designState.selectedSizesByColor && typeof designState.selectedSizesByColor === 'object') {
          setSelectedSizesByColor(designState.selectedSizesByColor);
        }
        if (designState.currentView && ['front', 'back', 'sleeves'].includes(designState.currentView)) {
          setCurrentView(designState.currentView);
        }
        if (designState.designUrlsByPlaceholder && typeof designState.designUrlsByPlaceholder === 'object') {
          setDesignUrlsByPlaceholder(designState.designUrlsByPlaceholder);
        }
        if (designState.placementsByView && typeof designState.placementsByView === 'object') {
          setPlacementsByView(designState.placementsByView);
        }
        if (designState.savedPreviewImages && typeof designState.savedPreviewImages === 'object') {
          setSavedPreviewImages(designState.savedPreviewImages);
        }
        if (designState.displacementSettings && typeof designState.displacementSettings === 'object') {
          setDisplacementSettings(designState.displacementSettings);
        }
        if (typeof designState.primaryColorHex === 'string' || designState.primaryColorHex === null) {
          setPrimaryColorHex(designState.primaryColorHex);
        }
        // Mark that we restored from session so other effects don't wipe selections
        restoredFromSessionRef.current = true;
        // Clear the saved state after restoring
        sessionStorage.removeItem(`designer_state_${id}`);
      } else {
        // Initialize history with empty elements if no saved state
        const initialState: HistoryState = {
          elements: [],
          view: currentView,
          timestamp: Date.now()
        };
        setUndoStack([initialState]);
        setRedoStack([]);
      }
    } catch (err) {
      console.error('Failed to restore design state:', err);
      // Initialize history even on error
      const initialState: HistoryState = {
        elements: [],
        view: currentView,
        timestamp: Date.now()
      };
      setUndoStack([initialState]);
      setRedoStack([]);
    }
  }, [id, product]);

  // Fetch placeholders from new collection
  useEffect(() => {
    const fetchPlaceholders = async () => {
      if (!product?._id || !currentView) return;
      try {
        const response = await fetch(`${API_BASE_URL}/placeholders?productId=${product._id}&view=${currentView}`);
        const data = await response.json();
        if (data.success && data.data) {
          const mappedPlaceholders = data.data.map((ph: any) => ({
            id: ph.placeholderId,
            name: ph.placeholderName,
            color: ph.placeholderColor,
            xIn: ph.xIn,
            yIn: ph.yIn,
            widthIn: ph.widthIn,
            heightIn: ph.heightIn,
            rotationDeg: ph.rotationDeg,
            scale: ph.scale,
            lockSize: ph.lockSize,
            shapeType: ph.shapeType,
            polygonPoints: ph.polygonPoints,
            renderPolygonPoints: ph.renderPolygonPoints,
            shapeRefinement: ph.shapeRefinement
          }));
          setFetchedPlaceholders(mappedPlaceholders);
        }
      } catch (err) {
        console.error('Error fetching placeholders:', err);
      }
    };
    fetchPlaceholders();
  }, [product?._id, currentView]);

  // Load mockup when view changes (if not already loaded)
  useEffect(() => {
    if (product?.design?.views) {
      // Only load if not already loaded for this view
      const existingMockup = mockupImagesByView[currentView];
      if (!existingMockup) {
        console.log(`Loading mockup for view: ${currentView}`);
        loadMockupForView(currentView, product.design.views);
      } else {
        console.log(`Using existing mockup for view: ${currentView}`);
        // Update stage size when switching to a view that already has a mockup
        const size = imageSizesByView[currentView];
        if (size && size.width > 0) {
          setStageSize({ width: canvasWidth, height: canvasHeight });
        }
      }
    }
  }, [currentView, product?.design?.views, loadMockupForView, mockupImagesByView, imageSizesByView, canvasWidth, canvasHeight]);

  // Reset selections when product changes (but not if we just restored from session)
  useEffect(() => {
    if (restoredFromSessionRef.current) return;
    setSelectedColors([]);
    setSelectedSizes([]);
  }, [product?._id]);

  // Track if we're currently saving a preview to avoid duplicate saves
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [storeProductId, setStoreProductId] = useState<string | null>(null);

  // Get current view data
  const currentViewData = useMemo(() => {
    if (!product?.design?.views) return null;
    return product.design.views.find((v: ProductView) => v.key === currentView);
  }, [product, currentView]);

  // Use the same default physical dimensions as the admin ProductImageConfigurator
  const DEFAULT_PHYSICAL_WIDTH = 20;
  const DEFAULT_PHYSICAL_HEIGHT = 24;
  const DEFAULT_PHYSICAL_LENGTH = 18;

  // Calculate PX_PER_INCH based on physical dimensions (matches CanvasMockup.tsx exactly)
  const PX_PER_INCH = useMemo(() => {
    // Prefer persisted physicalDimensions from the product.
    // If they are missing (older products), fall back to the same defaults
    // that the admin ProductImageConfigurator uses so both UIs stay in sync.
    const physicalWidth =
      product?.design?.physicalDimensions?.width ?? DEFAULT_PHYSICAL_WIDTH;
    const physicalHeight =
      product?.design?.physicalDimensions?.height ?? DEFAULT_PHYSICAL_HEIGHT;

    if (!physicalWidth || !physicalHeight || physicalWidth <= 0 || physicalHeight <= 0) {
      console.warn('Could not determine physical dimensions, using hardcoded fallback PX_PER_INCH');
      return 10; // Very last-resort fallback
    }

    const scaleX = effectiveCanvasWidth / physicalWidth;
    const scaleY = effectiveCanvasHeight / physicalHeight;
    const pxPerInch = Math.min(scaleX, scaleY);

    console.log('Calculated PX_PER_INCH (DesignEditor):', {
      physicalWidth,
      physicalHeight,
      effectiveCanvasWidth,
      effectiveCanvasHeight,
      scaleX,
      scaleY,
      pxPerInch
    });

    return pxPerInch;
  }, [product?.design?.physicalDimensions, effectiveCanvasWidth, effectiveCanvasHeight]);

  // Helper function to convert inches to pixels (matches CanvasMockup.tsx)
  const inchesToPixels = useCallback((inches: number): number => {
    return inches * PX_PER_INCH;
  }, [PX_PER_INCH]);

  // Get all placeholders for current view - EXACT LOGIC FROM CanvasMockup.tsx
  const placeholders = useMemo(() => {
    const sourcePlaceholders = fetchedPlaceholders.length > 0
      ? fetchedPlaceholders
      : (currentViewData?.placeholders || []); // Fallback for backward compat if DB empty

    if (!sourcePlaceholders || sourcePlaceholders.length === 0) {
      console.log('No placeholders found for current view');
      return [];
    }

    const visualColors = ['#ec4899', '#8ce2f5', '#a3ffc6', '#f4fea9', '#ffe2db']; // light blue, light green, light yellow, light pink

    const converted = sourcePlaceholders.map((placeholder: Placeholder, index: number) => {
      const visualColor = visualColors[index % visualColors.length];
      const scale = placeholder.scale ?? 1.0;
      const isPolygon = placeholder.shapeType === 'polygon' && placeholder.polygonPoints && placeholder.polygonPoints.length >= 3;

      // Convert inches to pixels for display, then apply scale
      // ADD canvas padding just like CanvasMockup.tsx
      const xPx = canvasPadding + inchesToPixels(placeholder.xIn);
      const yPx = canvasPadding + inchesToPixels(placeholder.yIn);
      const widthPx = inchesToPixels(placeholder.widthIn) * scale;
      const heightPx = inchesToPixels(placeholder.heightIn) * scale;

      // For polygons, convert polygon points from inches to pixels
      const polygonPointsPx = isPolygon
        ? placeholder.polygonPoints!.map((pt) => [
          canvasPadding + inchesToPixels(pt.xIn) * scale,
          canvasPadding + inchesToPixels(pt.yIn) * scale,
        ]).flat()
        : undefined;

      console.log(`Placeholder ${placeholder.id} conversion (matching CanvasMockup):`, {
        input: {
          xIn: placeholder.xIn,
          yIn: placeholder.yIn,
          widthIn: placeholder.widthIn,
          heightIn: placeholder.heightIn,
          scale,
          isPolygon,
          polygonPointsCount: placeholder.polygonPoints?.length
        },
        calculation: {
          PX_PER_INCH,
          canvasPadding,
          formula: `${canvasPadding} + (${placeholder.xIn} * ${PX_PER_INCH})`
        },
        output: {
          x: xPx,
          y: yPx,
          width: widthPx,
          height: heightPx,
          rotation: placeholder.rotationDeg || 0,
          polygonPointsPx
        }
      });

      return {
        id: placeholder.id,
        x: xPx,
        y: yPx,
        width: widthPx,
        height: heightPx,
        rotation: placeholder.rotationDeg || 0,
        scale,
        lockSize: placeholder.lockSize || false,
        original: { ...placeholder, color: visualColor }, // Overwrite color for UI only
        isPolygon,
        polygonPointsPx
      };
    });

    console.log('All placeholders converted:', converted);

    return converted;
  }, [fetchedPlaceholders, currentViewData, PX_PER_INCH, inchesToPixels, canvasPadding]);

  // Primary print area (first placeholder or default)
  const printArea = useMemo(() => {
    if (placeholders.length > 0) {
      const placeholder = placeholders[0];
      return {
        x: placeholder.x,
        y: placeholder.y,
        width: placeholder.width,
        height: placeholder.height
      };
    }
    // Default print area
    return {
      x: stageSize.width * 0.1,
      y: stageSize.height * 0.15,
      width: stageSize.width * 0.8,
      height: stageSize.height * 0.6
    };
  }, [placeholders, stageSize]);

  // Available views from product
  const availableViews = useMemo(() => {
    if (!product?.design?.views) return [];
    return product.design.views.map((v: ProductView) => v.key);
  }, [product]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      saveToHistory(true); // Immediate save for auto-save
    }, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [elements]);

  // Attach transformer to selected element
  useEffect(() => {
    if (selectedIds.length === 1 && transformerRef.current && stageRef.current && !previewMode) {
      const stage = stageRef.current;
      const selectedId = selectedIds[0];
      const selectedNode = stage.findOne(`#${selectedId}`);

      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedIds, previewMode, elements]); // Add elements to dependency to update transformer when text changes



  // History management - proper undo/redo stack pattern
  // Get elements for current view only
  const getCurrentViewElements = useCallback(() => {
    return elements.filter(el => !el.view || el.view === currentView);
  }, [elements, currentView]);

  // Save history state (debounced for rapid updates like dragging)
  const saveToHistory = useCallback((immediate = false) => {
    // Don't save if we're currently restoring history
    if (isRestoringHistoryRef.current) {
      return;
    }

    const currentViewElements = getCurrentViewElements();
    const newState: HistoryState = {
      elements: JSON.parse(JSON.stringify(currentViewElements)),
      view: currentView,
      timestamp: Date.now()
    };

    const saveAction = () => {
      setUndoStack(prev => {
        const newStack = [...prev, newState];
        // Limit stack size
        if (newStack.length > maxHistory) {
          newStack.shift();
        }
        return newStack;
      });
      // Clear redo stack when new action is performed
      setRedoStack([]);
    };

    if (immediate) {
      // Clear any pending debounced save
      if (historySaveTimeoutRef.current) {
        clearTimeout(historySaveTimeoutRef.current);
        historySaveTimeoutRef.current = null;
      }
      saveAction();
    } else {
      // Debounce rapid updates (like dragging)
      if (historySaveTimeoutRef.current) {
        clearTimeout(historySaveTimeoutRef.current);
      }
      historySaveTimeoutRef.current = setTimeout(() => {
        saveAction();
        historySaveTimeoutRef.current = null;
      }, 300); // 300ms debounce for drag/transform operations
    }
  }, [elements, currentView, getCurrentViewElements]);

  // Undo: pop from undoStack, push to redoStack, restore state
  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;

      const stateToRestore = prev[prev.length - 1];
      const newUndoStack = prev.slice(0, -1);

      // Push current state to redo stack before restoring
      const currentViewElements = getCurrentViewElements();
      const currentState: HistoryState = {
        elements: JSON.parse(JSON.stringify(currentViewElements)),
        view: currentView,
        timestamp: Date.now()
      };

      setRedoStack(prevRedo => [...prevRedo, currentState]);

      // Restore the state
      isRestoringHistoryRef.current = true;

      // Merge restored elements with elements from other views
      setElements(prevElements => {
        const otherViewElements = prevElements.filter(el => el.view && el.view !== stateToRestore.view);
        const restoredElements = stateToRestore.elements.map((el: CanvasElement) => ({
          ...el,
          view: stateToRestore.view
        }));
        return [...otherViewElements, ...restoredElements];
      });

      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 0);

      return newUndoStack;
    });
  }, [currentView, getCurrentViewElements]);

  // Redo: pop from redoStack, push to undoStack, restore state
  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;

      const stateToRestore = prev[prev.length - 1];
      const newRedoStack = prev.slice(0, -1);

      // Push current state to undo stack before restoring
      const currentViewElements = getCurrentViewElements();
      const currentState: HistoryState = {
        elements: JSON.parse(JSON.stringify(currentViewElements)),
        view: currentView,
        timestamp: Date.now()
      };

      setUndoStack(prevUndo => [...prevUndo, currentState]);

      // Restore the state
      isRestoringHistoryRef.current = true;

      // Merge restored elements with elements from other views
      setElements(prevElements => {
        const otherViewElements = prevElements.filter(el => el.view && el.view !== stateToRestore.view);
        const restoredElements = stateToRestore.elements.map((el: CanvasElement) => ({
          ...el,
          view: stateToRestore.view
        }));
        return [...otherViewElements, ...restoredElements];
      });

      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 0);

      return newRedoStack;
    });
  }, [currentView, getCurrentViewElements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'c':
            e.preventDefault();
            copySelected();
            break;
          case 'v':
            e.preventDefault();
            paste();
            break;
          case 'd':
            e.preventDefault();
            duplicateSelected();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) ungroupSelected();
            else groupSelected();
            break;
          case '0':
            e.preventDefault();
            setZoom(100);
            break;
          case '1':
            e.preventDefault();
            fitToScreen();
            break;
          case '=':
          case '+':
            e.preventDefault();
            setZoom(prev => Math.min(500, prev + 10));
            break;
          case '-':
            e.preventDefault();
            setZoom(prev => Math.max(10, prev - 10));
            break;
        }
      } else if (e.key === 'Delete') {
        // Only Delete key deletes layers, not Backspace
        // Backspace is reserved for text editing
        deleteSelected();
      } else if (e.key === 'Backspace') {
        // Backspace should only work for text editing, not layer deletion
        // Check if user is in an input field - if so, don't delete layer
        const activeElement = document.activeElement;
        const isInInput = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable
        );
        // Only delete layer if NOT in an input field
        // This prevents accidental deletion when editing text
        if (!isInInput) {
          deleteSelected();
        }
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        nudgeSelected(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements]);

  // Element manipulation
  const addElement = (element: Omit<CanvasElement, 'id' | 'zIndex'>): string => {
    let finalName = element.name || (element.type === 'image' ? 'Image' : element.type === 'text' ? 'Text' : 'Shape');
    if (finalName) {
      const baseNameStr = finalName as string;
      const existingNames = elements
        .filter(e => e.view === element.view && e.placeholderId === element.placeholderId && e.name)
        .map(e => e.name as string);

      let counter = 1;
      let checkName = baseNameStr;
      while (existingNames.includes(checkName)) {
        checkName = `${baseNameStr} (${counter})`;
        counter++;
      }
      finalName = checkName;
    }

    const newElement: CanvasElement = {
      ...element,
      name: finalName,
      id: Math.random().toString(36).substr(2, 9),
      zIndex: elements.length,
      visible: element.visible !== false,
      locked: element.locked || false,
      opacity: element.opacity ?? 1,
      rotation: element.rotation || 0
    };
    setElements(prev => [...prev, newElement]);
    setSelectedIds([newElement.id]);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    // Mark views as dirty: if element has no view, it appears on all views
    if (newElement.view) {
      setDirtyViewsForDesign(prev => new Set([...prev, newElement.view!]));
    } else {
      // Element without view appears on all views - mark all views dirty
      if (product?.design?.views) {
        const allViewKeys = product.design.views.map((v: ProductView) => v.key);
        setDirtyViewsForDesign(prev => new Set([...prev, ...allViewKeys]));
      }
    }
    // Save immediately for add action
    setTimeout(() => saveToHistory(true), 0);
    return newElement.id;
  };

  // Helper to constrain text element to print area when properties change
  const constrainTextToPrintArea = (element: CanvasElement, updates: Partial<CanvasElement>): Partial<CanvasElement> => {
    // Only constrain text elements (allow empty text)
    if (element.type !== 'text') return updates;

    // Find the placeholder for this element
    const placeholder = element.placeholderId
      ? placeholders.find((p) => p.id === element.placeholderId)
      : undefined;

    if (!placeholder) return updates;

    const printArea = {
      x: placeholder.x,
      y: placeholder.y,
      width: placeholder.width,
      height: placeholder.height,
    };

    // Calculate new text bounds with updated properties
    const newFontSize = updates.fontSize !== undefined ? updates.fontSize : element.fontSize || 24;
    const newLetterSpacing = updates.letterSpacing !== undefined ? updates.letterSpacing : element.letterSpacing || 0;
    const newRotation = updates.rotation !== undefined ? updates.rotation : element.rotation || 0;
    const newText = updates.text !== undefined ? updates.text : (element.text || '');

    // Calculate bounds - use minimum for empty text
    let rotatedWidth: number;
    let rotatedHeight: number;

    if (newText) {
      // Create a temporary canvas to measure text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return updates;

      ctx.font = `${newFontSize}px ${updates.fontFamily || element.fontFamily || 'Arial'}`;
      const metrics = ctx.measureText(newText);
      // Add letter spacing to width (approximate: letterSpacing * (charCount - 1))
      const textWidth = metrics.width + (newLetterSpacing * Math.max(0, newText.length - 1));
      const textHeight = newFontSize * 1.2;

      // Account for rotation - calculate bounding box of rotated text
      const rad = (newRotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      rotatedWidth = textWidth * cos + textHeight * sin;
      rotatedHeight = textWidth * sin + textHeight * cos;
    } else {
      // Minimum bounds for empty text
      const minWidth = newFontSize * 0.5;
      const minHeight = newFontSize;
      const rad = (newRotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      rotatedWidth = minWidth * cos + minHeight * sin;
      rotatedHeight = minWidth * sin + minHeight * cos;
    }

    // Constrain position if it would overflow
    const currentX = updates.x !== undefined ? updates.x : element.x;
    const currentY = updates.y !== undefined ? updates.y : element.y;

    let constrainedX = currentX;
    let constrainedY = currentY;

    // Only constrain if position is being updated or if size-affecting properties changed
    const sizeChanged = updates.fontSize !== undefined || updates.letterSpacing !== undefined ||
      updates.rotation !== undefined || updates.text !== undefined || updates.fontFamily !== undefined;

    if (sizeChanged) {
      constrainedX = Math.max(printArea.x, Math.min(currentX, printArea.x + printArea.width - rotatedWidth));
      constrainedY = Math.max(printArea.y, Math.min(currentY, printArea.y + printArea.height - rotatedHeight));
    } else {
      // Just constrain position if it's being moved
      if (updates.x !== undefined || updates.y !== undefined) {
        constrainedX = Math.max(printArea.x, Math.min(currentX, printArea.x + printArea.width - rotatedWidth));
        constrainedY = Math.max(printArea.y, Math.min(currentY, printArea.y + printArea.height - rotatedHeight));
      }
    }

    // Return updates with constrained position if needed
    if (constrainedX !== currentX || constrainedY !== currentY) {
      return { ...updates, x: constrainedX, y: constrainedY };
    }

    return updates;
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>, saveHistory = true) => {
    // Track the updated element for placement calculation
    let updatedElement: CanvasElement | null = null;

    setElements(prev => {
      const updated = prev.map(el => {
        if (el.id === id) {
          // Apply constraints for text elements
          const constrainedUpdates = el.type === 'text' ? constrainTextToPrintArea(el, updates) : updates;
          const updatedEl = { ...el, ...constrainedUpdates };
          // Mark views as dirty: if element has no view, it appears on all views
          if (updatedEl.view) {
            setDirtyViewsForDesign(prevDirty => new Set([...prevDirty, updatedEl.view!]));
          } else {
            // Element without view appears on all views - mark all views dirty
            if (product?.design?.views) {
              const allViewKeys = product.design.views.map((v: ProductView) => v.key);
              setDirtyViewsForDesign(prevDirty => new Set([...prevDirty, ...allViewKeys]));
            }
          }
          updatedElement = updatedEl;
          return updatedEl;
        }
        return el;
      });
      return updated;
    });
    setHasUnsavedChanges(true); // Mark as having unsaved changes

    // Update placement if this is an image element with a placeholderId and position/size changed
    const positionOrSizeChanged =
      updates.x !== undefined || updates.y !== undefined ||
      updates.width !== undefined || updates.height !== undefined ||
      updates.rotation !== undefined;

    // Use updatedElement which was captured during the state update
    if (updatedElement && positionOrSizeChanged) {
      const el = updatedElement;
      if (el.type === 'image' && el.placeholderId && el.width && el.height) {
        const placeholder = placeholders.find(p => p.id === el.placeholderId);
        if (placeholder) {
          const printAreaPx: PrintAreaPixels = {
            x: placeholder.x,
            y: placeholder.y,
            w: placeholder.width,
            h: placeholder.height,
          };
          const placement = pixelsToNormalized(
            {
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation || 0
            },
            printAreaPx,
            (el.view || currentView) as ViewKey,
            el.placeholderId
          );
          // Preserve aspect ratio from original
          placement.aspectRatio = el.width / el.height;
          setPlacementForView(el.view || currentView, el.placeholderId, placement);

          console.log('📐 Updated placement after element transform:', {
            elementId: el.id,
            placeholderId: el.placeholderId,
            placement,
          });
        }
      }
    }

    // Save to history (debounced for rapid updates like dragging)
    if (saveHistory) {
      saveToHistory(false); // Use debounced save for property updates
    }

    // Force transformer to update when text changes (for proper bounding box)
    if (updates.text !== undefined && selectedIds.includes(id) && transformerRef.current) {
      setTimeout(() => {
        if (transformerRef.current && stageRef.current) {
          const selectedNode = stageRef.current.findOne(`#${id}`);
          if (selectedNode) {
            transformerRef.current.nodes([selectedNode]);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }
      }, 0);
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      setElements(prev => {
        const toDelete = prev.filter(el => selectedIds.includes(el.id));
        // Mark views of deleted elements as dirty
        toDelete.forEach(el => {
          if (el.view) {
            setDirtyViewsForDesign(prevDirty => new Set([...prevDirty, el.view!]));
          } else {
            // Element without view appears on all views - mark all views dirty
            if (product?.design?.views) {
              const allViewKeys = product.design.views.map((v: ProductView) => v.key);
              setDirtyViewsForDesign(prevDirty => new Set([...prevDirty, ...allViewKeys]));
            }
          }
        });
        return prev.filter(el => !selectedIds.includes(el.id));
      });
      setSelectedIds([]);
      setHasUnsavedChanges(true); // Mark as having unsaved changes
      setTimeout(() => saveToHistory(true), 0); // Immediate save for delete
    }
  };

  const copySelected = () => {
    // Implementation for copy
    toast.info('Copy functionality');
  };

  const paste = () => {
    // Implementation for paste
    toast.info('Paste functionality');
  };

  const duplicateSelected = () => {
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const newElements = selected.map(el => ({
      ...el,
      id: Math.random().toString(36).substr(2, 9),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: elements.length
    }));
    setElements(prev => [...prev, ...newElements]);
    setSelectedIds(newElements.map(el => el.id));
    setTimeout(() => saveToHistory(true), 0); // Immediate save for duplicate
  };

  const selectAll = () => {
    setSelectedIds(elements.map(el => el.id));
  };

  const groupSelected = () => {
    if (selectedIds.length > 1) {
      // Group implementation
      toast.info('Group functionality');
    }
  };

  const ungroupSelected = () => {
    // Ungroup implementation
    toast.info('Ungroup functionality');
  };

  const nudgeSelected = (direction: string) => {
    const delta = 1;
    const updates: { x?: number; y?: number } = {};
    if (direction === 'ArrowLeft') updates.x = -delta;
    if (direction === 'ArrowRight') updates.x = delta;
    if (direction === 'ArrowUp') updates.y = -delta;
    if (direction === 'ArrowDown') updates.y = delta;

    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      if (element) {
        updateElement(id, {
          x: (element.x || 0) + (updates.x || 0),
          y: (element.y || 0) + (updates.y || 0)
        });
      }
    });
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...elements.map(el => el.zIndex));
    updateElement(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const minZ = Math.min(...elements.map(el => el.zIndex));
    updateElement(id, { zIndex: minZ - 1 });
  };

  const fitToScreen = () => {
    // Better fit to screen logic
    const container = webglCanvasRef.current?.parentElement;
    if (container) {
      const padding = 20;
      const availableWidth = container.clientWidth - (padding * 2);
      const availableHeight = container.clientHeight - (padding * 2);

      const scaleX = availableWidth / canvasWidth;
      const scaleY = availableHeight / canvasHeight;
      const fitZoom = Math.min(scaleX, scaleY, 1.0) * 100;

      if (isMobile) {
        setZoom(75); // Fixed 75% for mobile as requested
      } else {
        setZoom(Math.floor(fitZoom));
      }
    } else {
      setZoom(isMobile ? 75 : 100);
    }
    setStagePos({ x: 0, y: 0 });
  };

  // Fit to screen on mount or when product finishes loading
  useEffect(() => {
    if (!isLoadingProduct && product) {
      // Small delay to ensure container dims are ready
      const timer = setTimeout(() => {
        fitToScreen();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingProduct, product]);

  // Fit to screen on window resize
  useEffect(() => {
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  // Add image to canvas from URL
  const addImageToCanvas = useCallback((imageUrl: string, assetName?: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Use selected placeholder if available, otherwise use first placeholder or printArea
      let targetPlaceholder = null;

      // Get the latest selected placeholder ID from ref
      const currentSelectedId = selectedPlaceholderIdRef.current;
      console.log('addImageToCanvas - selectedPlaceholderId (from ref):', currentSelectedId);
      console.log('addImageToCanvas - selectedPlaceholderId (from state):', selectedPlaceholderId);
      console.log('addImageToCanvas - available placeholders:', placeholders.map(p => p.id));

      if (currentSelectedId) {
        targetPlaceholder = placeholders.find(p => p.id === currentSelectedId) || null;
        console.log('Found placeholder by selectedPlaceholderId:', targetPlaceholder);
      }

      if (!targetPlaceholder && placeholders.length > 0) {
        targetPlaceholder = placeholders[0];
        console.log('Using first placeholder as fallback:', targetPlaceholder);
      }

      const targetArea = targetPlaceholder || printArea;
      console.log('Final target area for image:', {
        x: targetArea.x,
        y: targetArea.y,
        width: targetArea.width,
        height: targetArea.height,
        isPlaceholder: !!targetPlaceholder,
        placeholderId: targetPlaceholder?.id
      });

      // Calculate aspect ratios
      const imageAspect = img.width / img.height;
      const placeholderAspect = targetArea.width / targetArea.height;

      // Fit image within placeholder while maintaining aspect ratio
      let finalWidth: number;
      let finalHeight: number;

      if (imageAspect > placeholderAspect) {
        // Image is wider - fit to width
        finalWidth = targetArea.width;
        finalHeight = targetArea.width / imageAspect;
      } else {
        // Image is taller - fit to height
        finalHeight = targetArea.height;
        finalWidth = targetArea.height * imageAspect;
      }

      // Ensure image doesn't exceed placeholder dimensions
      finalWidth = Math.min(finalWidth, targetArea.width);
      finalHeight = Math.min(finalHeight, targetArea.height);

      // Center the image within the placeholder
      const x = targetArea.x + (targetArea.width - finalWidth) / 2;
      const y = targetArea.y + (targetArea.height - finalHeight) / 2;

      // Apply placeholder rotation if any
      const rotation = targetPlaceholder?.rotation || 0;

      console.log('Adding image to placeholder:', {
        placeholder: targetArea,
        imageSize: { width: img.width, height: img.height },
        finalSize: { width: finalWidth, height: finalHeight },
        position: { x, y },
        rotation
      });

      const elementId = addElement({
        type: 'image',
        imageUrl,
        name: assetName,
        x,
        y,
        width: finalWidth,
        height: finalHeight,
        rotation,
        placeholderId: targetPlaceholder?.id || undefined,
        view: currentView // Store which view this image belongs to
      });

      // Compute and store normalized placement if adding to a placeholder
      if (targetPlaceholder?.id) {
        const printAreaPx: PrintAreaPixels = {
          x: targetArea.x,
          y: targetArea.y,
          w: targetArea.width,
          h: targetArea.height,
        };
        const placement = pixelsToNormalized(
          { x, y, width: finalWidth, height: finalHeight, rotation },
          printAreaPx,
          currentView as ViewKey,
          targetPlaceholder.id
        );
        placement.aspectRatio = imageAspect;
        setPlacementForView(currentView, targetPlaceholder.id, placement);
        console.log('📐 Stored normalized placement for image:', {
          placeholderId: targetPlaceholder.id,
          view: currentView,
          placement,
        });
      }

      // Select the newly added image
      setSelectedIds([elementId]);

      // On mobile: close menu, show canvas, DON'T open properties automatically
      if (isMobile) {
        isAddingAssetRef.current = true; // Mark as asset addition to prevent auto-opening properties
        setIsMobileMenuOpen(false);
        setMobileToolStage('none');
        setShowRightPanel(false);
        setShowLeftPanel(false);
      } else {
        // Desktop: open properties as before
        setRightPanelTab('properties');
        setShowRightPanel(true);
      }

      toast.success('Image added to canvas');
    };
    img.onerror = () => {
      toast.error('Failed to load image');
    };
    img.src = imageUrl;
  }, [placeholders, printArea, addElement, currentView, setPlacementForView]);

  // Toggle color selection
  const handleColorToggle = useCallback((color: string) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) {
        // When deselecting a color, clear its size selection
        setSelectedSizesByColor(prevSizes => {
          const newSizes = { ...prevSizes };
          delete newSizes[color];
          return newSizes;
        });
        return prev.filter(c => c !== color);
      } else {
        // When selecting a color, make it the primary (first) color while preserving others
        const withoutColor = prev.filter(c => c !== color);
        return [color, ...withoutColor];
      }
    });
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  }, []);

  // Toggle size selection (backward compatibility - for standalone size selection)
  const handleSizeToggle = useCallback((size: string) => {
    setSelectedSizes(prev => {
      if (prev.includes(size)) {
        return prev.filter(s => s !== size);
      } else {
        return [...prev, size];
      }
    });
  }, []);

  // Toggle size selection for a specific color (allows multiple sizes per color)
  const handleSizeToggleForColor = useCallback((color: string, size: string) => {
    setSelectedSizesByColor(prev => {
      const colorSizes = prev[color] || [];
      // If size is already selected, remove it; otherwise, add it
      const updatedSizes = colorSizes.includes(size)
        ? colorSizes.filter(s => s !== size)
        : [...colorSizes, size];
      return {
        ...prev,
        [color]: updatedSizes,
      };
    });
  }, []);

  // File upload - always adds to preview library for manual selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;

    // Process each selected file
    Array.from(files).forEach((file) => {
      // Validation
      const maxSize = file.type === 'image/svg+xml' ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds ${maxSize / 1024 / 1024}MB limit`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // Always add to preview library - user must click to add to canvas
        setUploadedImagePreview(prev => [...prev, { url: imageUrl, name: file.name }]);

        // Immediately add to canvas
        addImageToCanvas(imageUrl, file.name);

        successCount++;
        if (successCount === Array.from(files).length) {
          toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added to library and canvas`);
        }
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same files can be selected again
    e.target.value = '';
  };

  // Handle image click from upload panel - apply to selected placeholder
  const handleImageClick = (imageUrl: string) => {
    if (selectedPlaceholderId) {
      setDesignUrlForView(currentView, selectedPlaceholderId, imageUrl);
      toast.success('Design applied to placeholder');
    } else if (placeholders.length === 1) {
      // Auto-select if only one placeholder
      setSelectedPlaceholderId(placeholders[0].id);
      selectedPlaceholderIdRef.current = placeholders[0].id;
      setDesignUrlForView(currentView, placeholders[0].id, imageUrl);
      toast.success('Design applied to placeholder');
    } else {
      toast.error('Please select a placeholder first');
    }
  };

  // Add text
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text');
      return;
    }

    // Require a placeholder - text must be created within a print area
    const targetPlaceholder = selectedPlaceholderIdRef.current
      ? placeholders.find(p => p.id === selectedPlaceholderIdRef.current)
      : (placeholders.length > 0 ? placeholders[0] : null);

    if (!targetPlaceholder) {
      toast.error('Please select a print area (placeholder) before adding text');
      return;
    }

    const targetArea = {
      x: targetPlaceholder.x,
      y: targetPlaceholder.y,
      width: targetPlaceholder.width,
      height: targetPlaceholder.height,
    };

    addElement({
      type: 'text',
      text: textInput,
      x: targetArea.x + targetArea.width / 2,
      y: targetArea.y + targetArea.height / 2,
      fontSize,
      fontFamily: selectedFont,
      fill: textColor,
      align: 'center',
      view: currentView,
      placeholderId: targetPlaceholder.id
    });
    setTextInput('');
    toast.success('Text added');
  };

  // Add text with params (for new TextPanel)
  const handleAddTextWithParams = (text: string, font: string) => {
    if (!text.trim()) return;

    // Require a placeholder - text must be created within a print area
    const targetPlaceholder = selectedPlaceholderIdRef.current
      ? placeholders.find(p => p.id === selectedPlaceholderIdRef.current)
      : (placeholders.length > 0 ? placeholders[0] : null);

    if (!targetPlaceholder) {
      toast.error('Please select a print area (placeholder) before adding text');
      return;
    }

    const targetArea = {
      x: targetPlaceholder.x,
      y: targetPlaceholder.y,
      width: targetPlaceholder.width,
      height: targetPlaceholder.height,
    };

    addElement({
      type: 'text',
      text: text,
      x: targetArea.x,
      y: targetArea.y + targetArea.height / 2 - 12, // Center vertically (half of default fontSize 24)
      width: targetArea.width, // Constrain text to placeholder width
      fontSize: 24,
      fontFamily: font,
      fill: '#000000',
      align: 'center',
      view: currentView,
      placeholderId: targetPlaceholder.id
    });

    // Select the newly added text (addElement already sets selectedIds)
    // On mobile: close menu, show canvas, DON'T open properties automatically
    if (isMobile) {
      isAddingAssetRef.current = true; // Mark as asset addition to prevent auto-opening properties
      setIsMobileMenuOpen(false);
      setMobileToolStage('none');
      setShowRightPanel(false);
      setShowLeftPanel(false);
    } else {
      // Desktop: open properties as before
      setRightPanelTab('properties');
      setShowRightPanel(true);
    }

    toast.success('Text added');
  };

  // Add shape
  const handleAddShape = (shapeType: CanvasElement['shapeType']) => {
    // Use selected placeholder if available, otherwise use first placeholder or printArea
    const targetPlaceholder = selectedPlaceholderIdRef.current
      ? placeholders.find(p => p.id === selectedPlaceholderIdRef.current)
      : (placeholders.length > 0 ? placeholders[0] : null);
    const targetArea = targetPlaceholder || printArea;

    // Calculate size to fit within placeholder (max 100px or 80% of placeholder size)
    const maxSize = Math.min(100, Math.min(targetArea.width, targetArea.height) * 0.8);

    addElement({
      type: 'shape',
      shapeType,
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Shape`,
      x: targetArea.x + targetArea.width / 2 - maxSize / 2,
      y: targetArea.y + targetArea.height / 2 - maxSize / 2,
      width: maxSize,
      height: maxSize,
      fillColor: '#000000',
      strokeColor: '#000000',
      strokeWidth: 2,
      view: currentView,
      placeholderId: targetPlaceholder?.id || undefined
    });

    // On mobile: close menu, show canvas, DON'T open properties automatically
    if (isMobile) {
      isAddingAssetRef.current = true; // Mark as asset addition to prevent auto-opening properties
      setIsMobileMenuOpen(false);
      setMobileToolStage('none');
      setShowRightPanel(false);
      setShowLeftPanel(false);
    } else {
      // Desktop: open properties as before
      setRightPanelTab('properties');
      setShowRightPanel(true);
    }
  };

  // Export
  const handleExport = (format: 'png' | 'jpg' | 'svg') => {
    if (!stageRef.current) return;

    const dataURL = stageRef.current.toDataURL({
      mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      quality: 1,
      pixelRatio: 2
    });

    const link = document.createElement('a');
    link.download = `design.${format}`;
    link.href = dataURL;
    link.click();
    toast.success(`Design exported as ${format.toUpperCase()}`);
  };

  const handleExportPreview = async (format: 'png' | 'jpg' = 'png') => {
    try {
      if (!webglCanvasRef.current) {
        toast.error('Preview is not available to export');
        return;
      }

      let canvas = webglCanvasRef.current.querySelector('canvas');
      if (!canvas) {
        const divs = webglCanvasRef.current.querySelectorAll('div');
        for (const div of Array.from(divs)) {
          canvas = div.querySelector('canvas');
          if (canvas) break;
        }
      }

      if (!canvas) {
        toast.error('Could not find preview canvas to export');
        return;
      }

      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = 1.0;

      // Ensure the latest frame is rendered before reading pixels
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error('Failed to generate image');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `preview.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          toast.success(`Preview exported as ${format.toUpperCase()}`);
        },
        mime,
        quality
      );
    } catch (err) {
      console.error('Error exporting preview image:', err);
      toast.error('Error exporting preview image');
    }
  };



  // Capture preview image from WebGL canvas
  // Supports:
  // - Guest mode: uploads via public guest endpoint and returns S3 URL
  // - Authenticated mode: uploads to authenticated endpoint and returns S3 URL
  const capturePreviewImage = useCallback(async (viewKey?: string): Promise<string | null> => {
    try {
      if (!webglCanvasRef.current) {
        console.warn('WebGL canvas ref not available');
        return null;
      }

      // Wait a bit for canvas to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find the canvas element inside the WebGL container
      // The canvas might be directly in the div or nested
      let canvas = webglCanvasRef.current.querySelector('canvas');

      // If not found, try finding it in child elements
      if (!canvas) {
        const divs = webglCanvasRef.current.querySelectorAll('div');
        for (const div of Array.from(divs)) {
          canvas = div.querySelector('canvas');
          if (canvas) break;
        }
      }

      if (!canvas) {
        console.warn('Canvas element not found in WebGL container');
        return null;
      }

      // Convert canvas to blob and upload (guest or authenticated)
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error('Failed to convert canvas to blob');
            resolve(null);
            return;
          }

          try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            const fileName = viewKey ? `preview-${viewKey}.png` : 'preview.png';
            formData.append('image', blob, fileName);

            let url = `${RAW_API_URL}/api/upload/guest-image`;
            const headers: HeadersInit = {};

            // Authenticated: use protected upload endpoint
            if (token) {
              url = `${RAW_API_URL}/api/upload/image`;
              headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: formData,
            });

            const data = await response.json();
            if (data.success && data.url) {
              console.log(`Preview image uploaded successfully for ${viewKey || 'current'} view:`, data.url);
              resolve(data.url);
            } else {
              console.error('Failed to upload preview image:', data.message || 'Unknown error');
              resolve(null);
            }
          } catch (error) {
            console.error('Error uploading preview image:', error);
            resolve(null);
          }
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error capturing preview image:', error);
      return null;
    }
  }, []);

  // Capture preview images for all views
  const captureAllViewPreviews = useCallback(async (): Promise<Record<string, string>> => {
    const previewsByView: Record<string, string> = {};
    const views = product?.design?.views || [];

    if (views.length === 0) {
      console.warn('No views available to capture');
      return previewsByView;
    }

    // Store original view to restore later
    const originalView = currentView;

    for (const view of views) {
      const viewKey = view.key;
      toast.info(`Capturing preview for ${viewKey} view...`);

      // Switch to this view
      setCurrentView(viewKey as any);

      // Wait for view to switch and WebGL to render
      // Longer wait to ensure mockup loads and WebGL renders
      await new Promise(resolve => setTimeout(resolve, 800));

      // Additional frame wait to ensure canvas is fully rendered
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      // Capture the preview for this view
      const previewUrl = await capturePreviewImage(viewKey);

      if (previewUrl) {
        previewsByView[viewKey] = previewUrl;
        console.log(`Captured preview for ${viewKey}:`, previewUrl);
      } else {
        console.warn(`Failed to capture preview for ${viewKey} view`);
      }
    }

    // Restore original view
    setCurrentView(originalView as any);

    return previewsByView;
  }, [product?.design?.views, currentView, capturePreviewImage]);

  // Auto-save preview when entering Preview mode ONLY if design IMAGE changes (not color)
  useEffect(() => {
    if (!previewMode) return;
    if (isSavingPreview) return; // Avoid duplicate saves

    const cacheKey = getPreviewCacheKey(currentView);
    const isDirtyForDesign = dirtyViewsForDesign.has(currentView);

    // Only auto-save preview when the design IMAGE changes
    // Do NOT save just because color changed - design must change
    if (!isDirtyForDesign) {
      // No design image changes - don't auto-save
      return;
    }

    // Clear dirty flag since we're about to save
    setDirtyViewsForDesign(prev => {
      const next = new Set(prev);
      next.delete(currentView);
      return next;
    });

    // Auto-save preview to AWS and backend when design image changes
    const autoSavePreview = async () => {
      console.log(`Design image change detected for ${currentView} view, auto-saving preview...`);

      // Wait for WebGL to render
      await new Promise(resolve => setTimeout(resolve, 500));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      setIsSavingPreview(true);
      try {
        const previewUrl = await capturePreviewImage(currentView);
        if (previewUrl) {
          console.log(`Auto-saved preview for ${currentView}:`, previewUrl);

          // Update local cache
          setPreviewCache(prev => ({
            ...prev,
            [cacheKey]: previewUrl
          }));
          setSavedPreviewImages(prev => ({
            ...prev,
            [currentView]: previewUrl
          }));

          // Save to backend if we have a storeProductId
          if (storeProductId) {
            try {
              // Use new saveMockup API with 'flat' type to separate from model mockups
              await storeProductsApi.saveMockup(storeProductId, {
                mockupType: 'flat',
                viewKey: currentView,
                imageUrl: previewUrl,
              });
              console.log(`Flat mockup saved to backend for ${currentView}`);
            } catch (err) {
              console.error('Failed to save flat mockup to backend:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error auto-saving preview:', err);
      } finally {
        setIsSavingPreview(false);
      }
    };

    autoSavePreview();
  }, [previewMode, currentView, getPreviewCacheKey, dirtyViewsForDesign, capturePreviewImage, isSavingPreview, storeProductId, elements, designUrlsByPlaceholder]);

  // Auto-save flat mockups when design images are added (even in Edit mode)
  // This triggers when elements change and there are image elements with dirty views
  useEffect(() => {
    if (previewMode) return; // Skip if already in preview mode (handled by other effect)
    if (isSavingPreview) return;
    // Don't require storeProductId for local preview updates/toast
    if (dirtyViewsForDesign.size === 0) return;

    // Check if there are any image elements in the current view
    const hasImageElements = elements.some(el =>
      el.type === 'image' &&
      (el.view === currentView || !el.view)
    );

    if (!hasImageElements) return;

    // Debounce: wait 1.5s after last change before saving
    const timeoutId = setTimeout(async () => {
      if (isSavingPreview) return;

      console.log(`Auto-saving flat mockup for ${currentView} after design upload...`);
      setIsSavingPreview(true);

      try {
        // Wait for canvas to render
        await new Promise(resolve => setTimeout(resolve, 500));
        await new Promise(requestAnimationFrame);

        // Use captured preview from WebGL (same as Export)
        const previewUrl = await capturePreviewImage(currentView);
        if (previewUrl) {
          setSavedPreviewImages(prev => ({
            ...prev,
            [currentView]: previewUrl
          }));

          // Save flat mockup to backend if storeProductId is available
          if (storeProductId) {
            await storeProductsApi.saveMockup(storeProductId, {
              mockupType: 'flat',
              viewKey: currentView,
              imageUrl: previewUrl,
            });
            console.log(`Flat mockup saved to backend for ${currentView} after design upload`);
          } else {
            console.log(`Flat mockup captured locally for ${currentView} (no storeProductId yet)`);
          }

          // Show toast with image
          // Show toast with image and link
          // toast.custom((t) => (
          //   <div className="flex items-center gap-3 bg-background border border-border rounded-lg shadow-lg p-3 w-full max-w-sm pointer-events-auto">
          //     <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-muted border border-border">
          //       <img src={previewUrl} alt="Saved mockup" className="h-full w-full object-cover" />
          //     </div>
          {/* <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Mockup Auto-Saved</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate capitalize flex-1">{currentView} view updated</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div> */}
          //   </div>
          // ), { duration: 3000 });

          // Clear dirty flag for this view
          setDirtyViewsForDesign(prev => {
            const next = new Set(prev);
            next.delete(currentView);
            return next;
          });
        }
      } catch (err) {
        console.error('Error auto-saving flat mockup after upload:', err);
      } finally {
        setIsSavingPreview(false);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [elements, currentView, storeProductId, dirtyViewsForDesign, previewMode, isSavingPreview, capturePreviewImage]);

  // Publish current product + design to the merchant's store
  const handlePublishToStore = useCallback(async () => {
    try {
      if (!user) {
        // Save current design state to sessionStorage for restoration after login
        if (id) {
          try {
            const designState = {
              elements,
              selectedColors,
              selectedSizes,
              selectedSizesByColor,
              currentView,
              designUrlsByPlaceholder,
              placementsByView,
              savedPreviewImages,
              displacementSettings,
              primaryColorHex,
            };
            sessionStorage.setItem(`designer_state_${id}`, JSON.stringify(designState));
          } catch (err) {
            console.error('Failed to save design state:', err);
          }
        }

        // Redirect to auth page with return path
        navigate('/auth', {
          state: {
            from: {
              pathname: `/designer/${id}`,
            },
          },
        });
        return;
      }

      // --- VERIFICATION GATE ---
      // Save design state before any verification redirect so it can be restored
      const saveDesignStateForVerification = () => {
        if (!id) return;
        try {
          const designState = {
            elements,
            selectedColors,
            selectedSizes,
            selectedSizesByColor,
            currentView,
            designUrlsByPlaceholder,
            placementsByView,
            savedPreviewImages,
            displacementSettings,
            primaryColorHex,
          };
          sessionStorage.setItem(`designer_state_${id}`, JSON.stringify(designState));
        } catch (err) {
          console.error('Failed to save design state before verification redirect:', err);
        }
      };

      if (!user.isEmailVerified && !user.isPhoneVerified) {
        // Both unverified — go to email first, then phone
        saveDesignStateForVerification();
        toast.info('Please verify your email and phone before adding a product.');
        navigate('/verify-email', {
          state: {
            returnTo: `/designer/${id}`,
            nextVerification: 'phone', // after email, chain to phone
            triggerPublish: true,
          },
        });
        return;
      }

      if (!user.isEmailVerified) {
        saveDesignStateForVerification();
        toast.info('Please verify your email to continue.');
        navigate('/verify-email', {
          state: {
            returnTo: `/designer/${id}`,
            triggerPublish: true,
          },
        });
        return;
      }

      if (!user.isPhoneVerified) {
        saveDesignStateForVerification();
        toast.info('Please verify your phone number to continue.');
        navigate('/verify-phone', {
          state: {
            returnTo: `/designer/${id}`,
            triggerPublish: true,
          },
        });
        return;
      }
      // --- END VERIFICATION GATE ---

      if (!['merchant', 'superadmin'].includes(user.role)) {
        toast.error('Only merchants or superadmins can publish');
        return;
      }
      if (!product) {
        toast.error('No product loaded');
        return;
      }

      // Ensure the merchant has at least one store before creating a draft
      try {
        const storesResp = await storeApi.listMyStores();
        const hasStore = storesResp?.success && Array.isArray(storesResp.data) && storesResp.data.length > 0;

        if (!hasStore) {
          try {
            const defaultData = generateDefaultStoreData();
            await storeApi.create({
              name: defaultData.name,
              description: 'My first store'
            });
            toast.success('Default store created automatically.');
          } catch (err) {
            console.error('Failed to create default store:', err);
            // Persist current design state so it can be restored after creating a store
            if (id) {
              try {
                const designState = {
                  elements,
                  selectedColors,
                  selectedSizes,
                  selectedSizesByColor,
                  currentView,
                  designUrlsByPlaceholder,
                  placementsByView,
                  savedPreviewImages,
                  displacementSettings,
                  primaryColorHex,
                };
                sessionStorage.setItem(`designer_state_${id}`, JSON.stringify(designState));
              } catch (err) {
                console.error('Failed to save design state before navigating to stores:', err);
              }
            }

            toast.info('Please create a store to publish this product.');
            navigate('/stores', {
              state: {
                fromDesigner: {
                  pathname: `/designer/${id}`,
                },
              },
            });
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check stores before publishing:', err);
        // If store check fails, continue to attempt draft creation;
        // backend will still enforce store existence.
      }

      setIsPublishing(true);

      // Define required variables from product and state
      const catalogProductId = product._id || product.id;
      const basePrice = product.catalogue?.basePrice || 0;
      const sellingPrice = basePrice > 0 ? parseFloat((basePrice / 0.6).toFixed(2)) : 0;
      const galleryImages = product.galleryImages || [];

      // Build design payload with current design state
      const designPayload = {
        views: product.design?.views || [],
        designUrlsByPlaceholder,
        placementsByView, // Include normalized placements
        elements: elements.map(el => ({
          ...el,
          // Include only serializable properties
        })),
        savedPreviewImages,
        displacementSettings,
      };

      // Build variants from selected colors and sizes
      const listingVariants: Array<{ color: string; size: string; price: number }> = [];
      selectedColors.forEach(color => {
        const sizesForColor = selectedSizesByColor[color] || selectedSizes;
        sizesForColor.forEach(size => {
          listingVariants.push({
            color,
            size,
            price: sellingPrice,
          });
        });
      });

      // --- VARIANT VALIDATION ---
      if (!variantValidation.isValid) {
        toast.error(variantValidation.message);
        return;
      }

      // --- CREATE DRAFT IN DATABASE ---
      // Create a draft store product with the entire elements array
      const draftPayload = {
        catalogProductId,
        sellingPrice,
        status: 'draft' as const,
        designData: {
          elements: elements, // Save entire elements array (do not rename fields)
          designUrlsByPlaceholder,
          placementsByView, // Include normalized placements for accurate mockup rendering
          views: product.design?.views || [],
          savedPreviewImages,
          displacementSettings,
          selectedColors, // Save selected colors
          selectedSizes, // Save selected sizes
          selectedSizesByColor, // Save size selections per color
          primaryColorHex, // Save primary color for garment tinting
        },
        // Optional: include basic product info if available
        title: product?.catalogue?.name,
        description: product?.catalogue?.description,
      };

      const draftResponse = await storeProductsApi.create(draftPayload);
      if (!draftResponse || !draftResponse.success) {
        toast.error('Failed to create draft: ' + (draftResponse?.message || 'Unknown error'));
        return;
      }

      const storeProductId = draftResponse.data?.storeProduct?._id || draftResponse.data?._id;
      if (!storeProductId) {
        toast.error('Failed to get draft ID from server response');
        return;
      }

      console.log('Draft created with storeProductId:', storeProductId);

      // --- NEW MOCKUP GENERATION FLOW ---

      // Check if product has sample mockups
      const sampleMockups = (product.design as any)?.sampleMockups || [];
      const hasSampleMockups = sampleMockups.length > 0;
      console.log('Mockup Generation Init:', { hasSampleMockups, count: sampleMockups.length, selectedColors });

      // Navigate to MockupsLibrary if sample mockups exist
      if (hasSampleMockups) {
        toast.success('Proceeding to library to select mockups.');

        navigate('/mockups-library', {
          state: {
            storeProductId, // Pass the draft ID
            productId: catalogProductId,
            baseSellingPrice: sellingPrice,
            title: product?.catalogue?.name,
            description: product?.catalogue?.description,
            galleryImages,
            designData: designPayload,
            variants: listingVariants,
            // Pass minimal data needed for composition
            sampleMockups,
            displacementSettings: product.design?.displacementSettings
          }
        });
      } else {
        // Fallback to legacy behavior if no sample mockups
        toast.success('Design ready. Continue in Listing editor to finish publishing.');
        navigate('/listing-editor', {
          state: {
            storeProductId, // Pass the draft ID
            productId: catalogProductId,
            baseSellingPrice: sellingPrice,
            title: product?.catalogue?.name,
            description: product?.catalogue?.description,
            galleryImages,
            designData: designPayload,
            variants: listingVariants,
          },
        });
      }

    } catch (e: any) {
      console.error('Publish error:', e);
      toast.error(e?.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  }, [user, product, elements, currentView, selectedColors, selectedSizes, selectedSizesByColor, placeholders, PX_PER_INCH, stageSize, canvasPadding, navigate, savedPreviewImages, designUrlsByPlaceholder, placementsByView, displacementSettings]);

  const handleSave = async () => {
    try {
      if (!webglCanvasRef.current || !id) {
        toast.error('Preview is not available to save');
        return;
      }

      let canvas = webglCanvasRef.current.querySelector('canvas');
      if (!canvas) {
        const divs = webglCanvasRef.current.querySelectorAll('div');
        for (const div of Array.from(divs)) {
          canvas = div.querySelector('canvas');
          if (canvas) break;
        }
      }

      if (!canvas) {
        toast.error('Could not find preview canvas to save');
        return;
      }

      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      await new Promise<void>((resolve, reject) => {
        canvas!.toBlob(async (blob) => {
          if (!blob) {
            toast.error('Failed to generate image');
            reject(new Error('blob null'));
            return;
          }

          try {
            const formData = new FormData();
            formData.append('image', blob, `preview-${currentView}.png`);

            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const uploadResp = await fetch(`${RAW_API_URL}/api/upload/image`, {
              method: 'POST',
              headers,
              body: formData,
              credentials: 'include',
            });
            const uploadJson = await uploadResp.json().catch(() => ({}));
            const uploadedUrl = uploadJson?.url as string | undefined;
            if (uploadResp.ok && uploadJson?.success && uploadedUrl) {
              const nextPreviewImages = { ...savedPreviewImages, [currentView]: uploadedUrl } as Record<string, string>;
              setSavedPreviewImages(nextPreviewImages);

              const saveResp = await fetch(`${RAW_API_URL}/api/auth/me/previews/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ previews: { [currentView]: uploadedUrl } }),
              });
              const saveJson = await saveResp.json().catch(() => ({}));
              if (saveResp.ok && saveJson?.success) {
                toast.custom((t) => (
                  <div className="flex items-center gap-3 bg-background border border-border rounded-lg shadow-lg p-3 w-full max-w-sm pointer-events-auto">
                    <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-muted border border-border">
                      <img src={uploadedUrl} alt="Saved preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Preview Saved</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground truncate capitalize flex-1">{currentView} view updated</p>
                        <a
                          href={uploadedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ), { duration: 3000 });
                setHasUnsavedChanges(false); // Reset unsaved changes flag after successful save

                // Cache the preview with proper key
                const cacheKey = getPreviewCacheKey(currentView);
                setPreviewCache(prev => ({
                  ...prev,
                  [cacheKey]: uploadedUrl
                }));

                // Also update savedPreviewImages for backward compatibility
                const nextPreviewImages = { ...savedPreviewImages, [currentView]: uploadedUrl } as Record<string, string>;
                setSavedPreviewImages(nextPreviewImages);

                resolve();
              } else {
                toast.error('Uploaded image, but failed to save to user previews');
                resolve();
              }
            } else {
              toast.error('Failed to upload preview image');
              resolve();
            }
          } catch (e) {
            console.error('Error saving preview image:', e);
            toast.error('Error saving preview image');
            resolve();
          }
        }, 'image/png', 1.0);
      });
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Failed to save');
    }
  };

  const handleViewSwitch = (viewKey: string) => {
    // Log view switch for debugging
    console.log('[DesignEditor] View switch:', {
      from: currentView,
      to: viewKey,
      previewMode,
      primaryColorHex,
      elementsCount: elements.length,
      elementsForNewView: elements.filter(e => e.view === viewKey || !e.view).length,
      designUrlsForNewView: Object.keys(designUrlsByPlaceholder[viewKey] || {}).length,
    });

    // Explicitly preserve previewMode when switching views
    const currentPreviewMode = previewModeRef.current;
    setCurrentView(viewKey as any);
    // Restore previewMode after view change to ensure it persists
    if (currentPreviewMode !== previewMode) {
      setPreviewMode(currentPreviewMode);
    }
    // Clear selected placeholder when switching views
    setSelectedPlaceholderId(null);
    selectedPlaceholderIdRef.current = null;
    setSelectedIds([]);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden selection:bg-primary/20 no-scrollbar">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 15px 2px rgba(var(--primary), 0.3); }
          50% { box-shadow: 0 0 25px 5px rgba(var(--primary), 0.5); }
        }
        
        .cta-pulse {
          position: relative;
        }
        
        .cta-pulse::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: hsl(var(--primary));
          border-radius: 50%;
          z-index: -1;
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        
        .stop-pulse::before {
          animation: none;
          display: none;
        }
      `}</style>
      {/* Top Bar */}
      <div className="h-[60px] border-b flex items-center justify-between px-4 bg-background z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent">
            {isMobile ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
          {!isMobile && (
            <>
              <div className="w-px h-6 bg-border mx-2" />
              <Button variant="ghost" size="icon" onClick={undo} disabled={undoStack.length === 0}>
                <Undo2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.length === 0}>
                <Redo2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
          <Button
            variant={!previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(false)}
            className="h-8 rounded-md text-xs font-medium"
          >
            Edit
          </Button>
          <Button
            variant={previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="h-8 rounded-md text-xs font-medium"
          >
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isMobile ? (
            <Button
              variant="default"
              size="sm"
              onClick={handlePublishToStore}
              disabled={isPublishing}
              className={`rounded-full h-9 px-4 font-semibold text-xs shadow-sm shadow-primary/20 ${!variantValidation.isValid ? 'opacity-50 grayscale' : ''}`}
            >
              {isPublishing ? '...' : 'Add Product'}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} className="hidden sm:flex">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="default" size="sm" onClick={() => handleExportPreview('png')}>
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline ml-1">Export</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Views Selector Hub (Top) */}
      {isMobile && !previewMode && availableViews.length > 0 && (
        <div className="flex-shrink-0 border-b bg-background flex justify-center z-10 w-full overflow-hidden">
          <div className="flex items-center gap-6 p-2 overflow-x-auto no-scrollbar px-6 h-11 justify-center min-w-full">
            {availableViews.map((viewKey) => (
              <button
                key={viewKey}
                onClick={() => handleViewSwitch(viewKey)}
                className={`text-[13px] font-bold transition-all relative pb-2 whitespace-nowrap ${currentView === viewKey
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {viewKey.charAt(0).toUpperCase() + viewKey.slice(1)}
                {currentView === viewKey && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Desktop Only (hidden in preview mode) */}
        {!isMobile && !previewMode && (
          <aside className="w-[80px] border-r flex flex-col">
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {tools.map((tool) => (
                  <Button
                    key={tool.label}
                    variant={activeTool === tool.toolKey ? 'default' : 'outline'}
                    size="icon"
                    onClick={tool.onClick}
                    className="h-16 w-20 rounded-none border-none"
                    title={tool.label}
                  >
                    <tool.icon className="w-10 h-10" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Mobile Tools Panel (Drawer based) */}
        {isMobile && !previewMode && (
          <Drawer
            open={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
            modal={false}
            snapPoints={[0.66, 0.8]}
          >
            <DrawerContent className="min-h-[66vh]" showOverlay={false}>
              <DrawerHeader className="text-left border-b pb-4">
                <div className="flex items-center justify-between">
                  <DrawerTitle>
                    {mobileToolStage === 'menu' ? 'Add design' : activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
                  </DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                      <X className="w-5 h-5" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              {mobileToolStage === 'menu' ? (
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                  <div className="grid grid-cols-2 gap-4">
                    {tools.map((tool) => (
                      <button
                        key={tool.label}
                        onClick={() => {
                          tool.onClick();
                          setMobileToolStage('detail');
                        }}
                        className="flex flex-col items-center justify-center gap-4 bg-background p-8 rounded-2xl shadow-sm border border-border/50 transition-all active:scale-95 group hover:border-primary/30"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-active:bg-primary/20 transition-colors">
                          <tool.icon className="w-8 h-8 text-primary" />
                        </div>
                        <span className="font-bold text-sm tracking-tight text-foreground">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col bg-background">
                  <div className="border-b bg-muted/5 overflow-x-auto no-scrollbar flex-shrink-0">
                    <div className="flex items-center p-3 gap-3 min-w-max px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobileToolStage('menu')}
                        className="rounded-full gap-1 h-8 px-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </Button>
                      {tools.map((tool) => (
                        <button
                          key={tool.label}
                          onClick={tool.onClick}
                          className={`px-5 py-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shadow-sm border ${activeTool === tool.toolKey
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:bg-accent'
                            }`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 no-scrollbar">
                    {activeTool === 'upload' && (
                      <UploadPanel
                        onFileUpload={handleFileUpload}
                        onUploadClick={() => document.getElementById('file-upload')?.click()}
                        imagePreview={uploadedImagePreview}
                        onImageClick={addImageToCanvas}
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders.map(p => ({
                          id: p.id,
                          x: p.x,
                          y: p.y,
                          width: p.width,
                          height: p.height,
                          rotation: p.rotation,
                        }))}
                      />
                    )}
                    {activeTool === 'text' && (
                      <TextPanel
                        onAddText={(text, font) => handleAddTextWithParams(text, font)}
                        onClose={() => setIsMobileMenuOpen(false)}
                      />
                    )}
                    {activeTool === 'shapes' && (
                      <ShapesPanel
                        onAddShape={handleAddShape}
                        onAddAsset={addImageToCanvas}
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders}
                      />
                    )}
                    {activeTool === 'library' && (
                      <LibraryPanel
                        onAddAsset={addImageToCanvas}
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders}
                      />
                    )}
                    {activeTool === 'graphics' && (
                      <GraphicsPanel
                        onAddAsset={addImageToCanvas}
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders}
                      />
                    )}
                    {activeTool === 'patterns' && (
                      <AssetPanel
                        onAddAsset={addImageToCanvas}
                        category="patterns"
                        title="Patterns"
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders}
                      />
                    )}
                    {activeTool === 'logos' && (
                      <LogosPanel
                        onAddAsset={addImageToCanvas}
                        selectedPlaceholderId={selectedPlaceholderId}
                        placeholders={placeholders}
                      />
                    )}
                    {activeTool === 'templates' && <TemplatesPanel />}
                  </ScrollArea>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        )}

        {/* Left Panel - Desktop Only (hidden in preview mode) */}
        {!isMobile && !previewMode && showLeftPanel && (
          <div className="w-[250px] border-r bg-background flex flex-col">
            <ScrollArea className="flex-1">
              {activeTool === 'upload' && (
                <UploadPanel
                  onFileUpload={handleFileUpload}
                  onUploadClick={() => document.getElementById('file-upload')?.click()}
                  imagePreview={uploadedImagePreview}
                  // Add uploaded images to canvas like other asset panels
                  onImageClick={addImageToCanvas}
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders.map(p => ({
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    width: p.width,
                    height: p.height,
                    rotation: p.rotation,
                  }))}
                />
              )}
              {activeTool === 'text' && (
                <TextPanel
                  onAddText={(text, font) => {
                    handleAddTextWithParams(text, font);
                  }}
                  onClose={() => setShowLeftPanel(false)}
                />
              )}
              {activeTool === 'shapes' && (
                <ShapesPanel
                  onAddShape={handleAddShape}
                  onAddAsset={addImageToCanvas}
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                />
              )}
              {activeTool === 'library' && (
                <LibraryPanel
                  onAddAsset={addImageToCanvas}
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                />
              )}
              {activeTool === 'graphics' && (
                <GraphicsPanel
                  onAddAsset={addImageToCanvas}
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                />
              )}
              {activeTool === 'patterns' && (
                <AssetPanel
                  onAddAsset={addImageToCanvas}
                  category="patterns"
                  title="Patterns"
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                />
              )}
              {activeTool === 'logos' && (
                <LogosPanel
                  onAddAsset={addImageToCanvas}
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                />
              )}
              {activeTool === 'templates' && (
                <TemplatesPanel />
              )}
            </ScrollArea>
          </div>
        )}

        {/* Main Canvas Area - Always WebGL with Konva Overlay */}
        <div
          className="flex-1 min-h-0 flex flex-col items-center bg-muted/30 relative overflow-hidden touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLoadingProduct ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading product...</p>
              </div>
            </div>
          ) : currentViewData ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                ref={webglCanvasRef}
                className="relative bg-white shadow-lg overflow-hidden flex-shrink-0"
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${zoom / 100})`,
                  transformOrigin: 'center',
                }}
              >
                {previewMode && (() => {
                  const cacheKey = getPreviewCacheKey(currentView);
                  const cachedPreview = previewCache[cacheKey];
                  const isDirtyForColor = dirtyViewsForColor.has(currentView);
                  const isDirtyForDesign = dirtyViewsForDesign.has(currentView);

                  // Show cached preview only if view is clean AND cache exists
                  if (!isDirtyForColor && !isDirtyForDesign && cachedPreview) {
                    return (
                      <img
                        src={cachedPreview}
                        alt="Cached preview"
                        className="block max-w-full max-h-full"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    );
                  }

                  // Otherwise show live WebGL (rendered below)
                  return null;
                })()}
                {/* Pixi always visible (renders garment). Canvas elements only in preview mode. */}
                <div>
                  <RealisticWebGLPreview
                    key={`preview-${currentView}-${currentViewData?.mockupImageUrl ? currentViewData.mockupImageUrl.slice(-20) : 'no-mockup'}-${getDesignUrlsHash(currentView)}`}
                    mockupImageUrl={
                      currentViewData?.mockupImageUrl &&
                        typeof currentViewData.mockupImageUrl === 'string' &&
                        currentViewData.mockupImageUrl.trim() !== ''
                        ? currentViewData.mockupImageUrl
                        : null
                    }
                    activePlaceholder={
                      currentViewData.placeholders?.find(
                        (p) => p.id === selectedPlaceholderId,
                      )
                        ? ({
                          ...currentViewData.placeholders.find(
                            (p) => p.id === selectedPlaceholderId,
                          )!,
                          rotationDeg:
                            currentViewData.placeholders.find(
                              (p) => p.id === selectedPlaceholderId,
                            )?.rotationDeg ?? 0,
                        } as any)
                        : null
                    }
                    placeholders={
                      (currentViewData.placeholders || []).map((p) => ({
                        ...p,
                        rotationDeg: p.rotationDeg ?? 0,
                      })) as any
                    }
                    physicalWidth={
                      product?.design?.physicalDimensions?.width ??
                      DEFAULT_PHYSICAL_WIDTH
                    }
                    physicalHeight={
                      product?.design?.physicalDimensions?.height ??
                      DEFAULT_PHYSICAL_HEIGHT
                    }
                    settings={displacementSettings}
                    onSettingsChange={handleDisplacementSettingsChange}
                    onDesignUpload={(placeholderId, designUrl) => {
                      setDesignUrlForView(currentView, placeholderId, designUrl);
                    }}
                    designUrlsByPlaceholder={getDesignUrlsForView(currentView)}
                    designPlacements={getPlacementsForView(currentView)}
                    onPlacementChange={(placeholderId, placement) => {
                      setPlacementForView(currentView, placeholderId, placement);
                      console.log('📐 Placement updated from WebGL preview:', {
                        view: currentView,
                        placeholderId,
                        placement,
                      });
                    }}
                    onSelectPlaceholder={(id) => {
                      if (id) {
                        console.log('Placeholder selected via WebGL:', id);
                        setSelectedPlaceholderId(id);
                        selectedPlaceholderIdRef.current = id;
                        toast.info(`Placeholder ${id.slice(0, 8)}... selected`);
                      } else {
                        setSelectedPlaceholderId(null);
                        selectedPlaceholderIdRef.current = null;
                      }
                    }}
                    previewMode={previewMode}
                    garmentTintHex={primaryColorHex}
                    enableGarmentTint={true}
                    canvasElements={previewMode ? elements : []}  // GHOSTING FIX: only render canvas elements in preview
                    currentView={currentView}
                    canvasPadding={canvasPadding}
                    PX_PER_INCH={PX_PER_INCH}
                  />
                </div>

                {/* Konva Overlay - Just for Grid & Rulers now */}
                {!previewMode && (
                  <div
                    className="absolute inset-0 pointer-events-auto"
                  >
                    <Stage
                      ref={stageRef}
                      width={stageSize.width}
                      height={stageSize.height}
                      onMouseDown={(e: any) => {
                        const clickedOnEmpty = e.target === e.target.getStage();
                        if (clickedOnEmpty) {
                          setSelectedIds([]);
                          if (isMobile) {
                            setShowRightPanel(false);
                            setIsMobileMenuOpen(false);
                          }
                        }
                      }}
                      onTouchStart={(e: any) => {
                        const clickedOnEmpty = e.target === e.target.getStage();
                        if (clickedOnEmpty) {
                          setSelectedIds([]);
                          if (isMobile) {
                            setShowRightPanel(false);
                            setIsMobileMenuOpen(false);
                          }
                        }
                      }}
                    >
                      <Layer listening={false}>
                        {/* Grid */}
                        {showGrid && (
                          <>
                            {Array.from({ length: Math.ceil(stageSize.width / 20) }).map((_, i) => (
                              <Line
                                key={`v-${i}`}
                                points={[i * 20, 0, i * 20, stageSize.height]}
                                stroke="#e0e0e0"
                                strokeWidth={0.5}
                              />
                            ))}
                            {Array.from({ length: Math.ceil(stageSize.height / 20) }).map((_, i) => (
                              <Line
                                key={`h-${i}`}
                                points={[0, i * 20, stageSize.width, i * 20]}
                                stroke="#e0e0e0"
                                strokeWidth={0.5}
                              />
                            ))}
                          </>
                        )}

                        {/* Rulers */}
                        {showRulers && (
                          <>
                            {/* Ruler backgrounds */}
                            <Rect x={0} y={0} width={stageSize.width} height={24} fill="#f8fafc" stroke="#e5e7eb" strokeWidth={1} listening={false} />
                            <Rect x={0} y={0} width={24} height={stageSize.height} fill="#f8fafc" stroke="#e5e7eb" strokeWidth={1} listening={false} />

                            {/* Unit labels */}
                            <Text x={4} y={6} text={"in"} fontSize={10} fill="#64748b" listening={false} />
                            <Text x={4} y={4} text={"in"} fontSize={10} fill="#64748b" listening={false} />

                            {/* Top ruler ticks and labels (inches) */}
                            {Array.from({ length: Math.ceil((stageSize.width - canvasPadding * 2) / PX_PER_INCH) + 1 }).map((_, i) => {
                              const x = Math.round(canvasPadding + i * PX_PER_INCH);
                              const isMajor = true; // inch marks only
                              return (
                                <Group key={`rt-${i}`} listening={false}>
                                  <Line points={[x, 24, x, 14]} stroke="#94a3b8" strokeWidth={1} />
                                  <Text x={x + 2} y={6} text={`${i}"`} fontSize={10} fill="#64748b" />
                                </Group>
                              );
                            })}

                            {/* Left ruler ticks and labels (inches) */}
                            {Array.from({ length: Math.ceil((stageSize.height - canvasPadding * 2) / PX_PER_INCH) + 1 }).map((_, i) => {
                              const y = Math.round(canvasPadding + i * PX_PER_INCH);
                              return (
                                <Group key={`rl-${i}`} listening={false}>
                                  <Line points={[24, y, 14, y]} stroke="#94a3b8" strokeWidth={1} />
                                  <Text x={4} y={y + 2} text={`${i}"`} fontSize={10} fill="#64748b" />
                                </Group>
                              );
                            })}
                          </>
                        )}
                      </Layer>

                      {/* Placeholder Outlines Layer (Konva) - independent of WebGL */}
                      <Layer>
                        {placeholders.map((ph) => {
                          const isSelected = selectedPlaceholderId === ph.id;
                          const baseColor = ph.original.color || '#f472b6';

                          const hexToRgba = (hex: string, alpha: number) => {
                            if (!hex.startsWith('#') || hex.length !== 7) return `rgba(251, 207, 232, ${alpha})`;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };

                          const stroke = baseColor;
                          const strokeWidth = isSelected ? 2 : 1;
                          const fill = hexToRgba(baseColor, isSelected ? 0.25 : 0.15);

                          const commonHandlers = {
                            onClick: () => {
                              setSelectedPlaceholderId(ph.id);
                              selectedPlaceholderIdRef.current = ph.id;
                              toast.info(`${ph.original.name || 'Placeholder'} selected`);
                            },
                            onTap: () => {
                              setSelectedPlaceholderId(ph.id);
                              selectedPlaceholderIdRef.current = ph.id;
                              toast.info(`${ph.original.name || 'Placeholder'} selected`);
                            },
                          } as any;

                          if (ph.isPolygon && ph.polygonPointsPx && ph.polygonPointsPx.length >= 6) {
                            return (
                              <Line
                                key={ph.id}
                                points={ph.polygonPointsPx}
                                closed
                                stroke={stroke}
                                strokeWidth={strokeWidth}
                                fill={fill}
                                listening
                                perfectDrawEnabled={false}
                                {...commonHandlers}
                              />
                            );
                          }

                          return (
                            <Rect
                              key={ph.id}
                              x={ph.x}
                              y={ph.y}
                              width={ph.width}
                              height={ph.height}
                              stroke={stroke}
                              strokeWidth={strokeWidth}
                              fill={fill}
                              listening
                              {...commonHandlers}
                            />
                          );
                        })}
                      </Layer>

                      {/* Interactive Elements Layer */}
                      <Layer>
                        {elements
                          .filter((el) => el.view === currentView && el.visible !== false)
                          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                          .map((el) => {
                            const placeholder = el.placeholderId
                              ? placeholders.find((p) => p.id === el.placeholderId)
                              : undefined;
                            const elPrintArea = placeholder
                              ? {
                                x: placeholder.x,
                                y: placeholder.y,
                                width: placeholder.width,
                                height: placeholder.height,
                                isPolygon: placeholder.isPolygon,
                                polygonPointsPx: placeholder.polygonPointsPx,
                              }
                              : printArea;

                            if (el.type === 'image') {
                              return (
                                <ImageElement
                                  key={el.id}
                                  element={el}
                                  isSelected={selectedIds.includes(el.id)}
                                  onSelect={() => setSelectedIds([el.id])}
                                  onUpdate={(updates, saveImmediately = false) => {
                                    updateElement(el.id, updates, !saveImmediately);
                                    if (saveImmediately) {
                                      setTimeout(() => saveToHistory(true), 0);
                                    }
                                  }}
                                  printArea={elPrintArea}
                                  isEditMode={!previewMode && !el.locked}
                                />
                              );
                            }
                            if (el.type === 'text') {
                              return (
                                <TextElement
                                  key={el.id}
                                  element={el}
                                  isSelected={selectedIds.includes(el.id)}
                                  onSelect={() => setSelectedIds([el.id])}
                                  onDblClick={() => handleTextDblClick(el.id)}
                                  isEditing={editingTextId === el.id}
                                  onUpdate={(updates, saveImmediately = false) => {
                                    updateElement(el.id, updates, !saveImmediately);
                                    if (saveImmediately) {
                                      setTimeout(() => saveToHistory(true), 0);
                                    }
                                  }}
                                  printArea={elPrintArea}
                                  isEditMode={!previewMode && !el.locked}
                                />
                              );
                            }
                            return null;
                          })}

                        {/* Text Editing Overlay */}
                        {editingTextId && (() => {
                          const el = elements.find(e => e.id === editingTextId);
                          if (!el || el.type !== 'text') return null;
                          return (
                            <div
                              style={{
                                position: 'absolute',
                                left: el.x,
                                top: el.y - ((el.fontSize || 24) * 0.15),
                                transform: `rotate(${el.rotation || 0}deg)`,
                                transformOrigin: 'top left',
                                zIndex: 1000,
                              }}
                            >
                              <textarea
                                value={el.text}

                                onBlur={() => setEditingTextId(null)}
                                autoFocus
                                style={{
                                  fontSize: `${el.fontSize || 24}px`,
                                  fontFamily: el.fontFamily || 'Arial',
                                  color: el.fill || '#000000',
                                  background: 'transparent',
                                  border: '1px dashed #9ca3af',
                                  padding: 0,
                                  margin: 0,
                                  outline: 'none',
                                  resize: 'none',
                                  overflow: 'hidden',
                                  whiteSpace: 'pre',
                                  width: `${getTextWidth(el.text || '', el.fontSize || 24, el.fontFamily || 'Arial') + 20}px`,
                                  height: `${(el.fontSize || 24) * 1.2}px`,
                                  lineHeight: 1.2,
                                }}
                                ref={(ref) => {
                                  if (ref) {
                                    ref.style.width = '0px';
                                    ref.style.width = (ref.scrollWidth + 10) + 'px';
                                    ref.style.height = '0px';
                                    ref.style.height = (ref.scrollHeight) + 'px';
                                    if (document.activeElement !== ref) {
                                      ref.focus();
                                      ref.select();
                                    }
                                  }
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.width = '0px';
                                  target.style.width = (target.scrollWidth + 10) + 'px';
                                  target.style.height = '0px';
                                  target.style.height = (target.scrollHeight) + 'px';
                                }}
                                onChange={(e) => {
                                  const newText = e.target.value;

                                  // Validate if new text fits in print area
                                  const placeholder = el.placeholderId
                                    ? placeholders.find(p => p.id === el.placeholderId)
                                    : undefined;

                                  const checkArea = placeholder
                                    ? { x: placeholder.x, y: placeholder.y, width: placeholder.width, height: placeholder.height }
                                    : printArea;

                                  if (checkArea) {
                                    const fontSize = el.fontSize || 24;
                                    const fontFamily = el.fontFamily || 'Arial';
                                    const letterSpacing = el.letterSpacing || 0;
                                    const textWidth = getTextWidth(newText, fontSize, fontFamily) + (letterSpacing * Math.max(0, newText.length - 1));
                                    const textHeight = fontSize * 1.2;

                                    const bounds = calculateRotatedBounds(el.x, el.y, textWidth, textHeight, el.rotation || 0);

                                    // Allow if fully contained (with small tolerance)
                                    const tolerance = 1;
                                    const fitsX = bounds.minX >= checkArea.x - tolerance && bounds.maxX <= checkArea.x + checkArea.width + tolerance;
                                    const fitsY = bounds.minY >= checkArea.y - tolerance && bounds.maxY <= checkArea.y + checkArea.height + tolerance;

                                    // If text is shrinking, always allow
                                    if (newText.length < (el.text || '').length) {
                                      updateElement(el.id, { text: newText });
                                      return;
                                    }

                                    if (!fitsX || !fitsY) {
                                      return; // Block input
                                    }
                                  }

                                  updateElement(el.id, { text: newText });
                                }}
                              />
                            </div>
                          );
                        })()}

                        {/* X/Y axis guides and handles for active image (edit mode only) */}
                        {(!previewMode && selectedIds.length === 1) && (() => {
                          const sel = elements.find(e => e.id === selectedIds[0]);
                          if (!sel || sel.type !== 'image' || !sel.width || !sel.height) return null;
                          const ph = sel.placeholderId
                            ? placeholders.find(p => p.id === sel.placeholderId)
                            : undefined;
                          const area = ph
                            ? { x: ph.x, y: ph.y, width: ph.width, height: ph.height }
                            : printArea;
                          if (!area) return null;
                          const centerX = (sel.x || 0) + (sel.width || 0) / 2;
                          const centerY = (sel.y || 0) + (sel.height || 0) / 2;

                          const horizY = Math.max(area.y, Math.min(centerY, area.y + area.height));
                          const vertX = Math.max(area.x, Math.min(centerX, area.x + area.width));

                          const handleSize = 12;
                          const halfH = (sel.height || 0) / 2;
                          const halfW = (sel.width || 0) / 2;

                          const rightHandleX = centerX + halfW - handleSize / 2;
                          const topHandleY = centerY - halfH - handleSize / 2;

                          return (
                            <>
                              {/* Guide lines */}
                              <Line points={[area.x, horizY, area.x + area.width, horizY]} stroke="#ef4444" strokeWidth={1} dash={[6, 6]} listening={false} />
                              <Line points={[vertX, area.y, vertX, area.y + area.height]} stroke="#ef4444" strokeWidth={1} dash={[6, 6]} listening={false} />

                              {/* Horizontal resize handle (adjust width symmetrically) */}
                              <Rect
                                x={rightHandleX}
                                y={centerY - handleSize / 2}
                                width={handleSize}
                                height={handleSize}
                                fill="#22c55e"
                                stroke="#16a34a"
                                strokeWidth={1}
                                cornerRadius={2}
                                draggable
                                dragBoundFunc={(pos) => {
                                  // lock Y to center, constrain X inside area
                                  const y = centerY - handleSize / 2;
                                  const minX = area.x - handleSize / 2;
                                  const maxX = area.x + area.width - handleSize / 2;
                                  return { x: Math.max(minX, Math.min(pos.x, maxX)), y };
                                }}
                                onDragMove={(e) => {
                                  const handleX = e.target.x() + handleSize / 2;
                                  const newHalfW = Math.abs(handleX - centerX);
                                  let newW = Math.max(10, Math.min(newHalfW * 2, area.width));
                                  // Constrain so image stays within area horizontally
                                  const newX = Math.max(area.x, Math.min(centerX - newW / 2, area.x + area.width - newW));
                                  updateElement(sel.id, { width: newW, x: newX });
                                }}
                              />

                              {/* Vertical resize handle (adjust height symmetrically) */}
                              <Rect
                                x={centerX - handleSize / 2}
                                y={topHandleY}
                                width={handleSize}
                                height={handleSize}
                                fill="#22c55e"
                                stroke="#16a34a"
                                strokeWidth={1}
                                cornerRadius={2}
                                draggable
                                dragBoundFunc={(pos) => {
                                  // lock X to center, constrain Y inside area
                                  const x = centerX - handleSize / 2;
                                  const minY = area.y - handleSize / 2;
                                  const maxY = area.y + area.height - handleSize / 2;
                                  return { x, y: Math.max(minY, Math.min(pos.y, maxY)) };
                                }}
                                onDragMove={(e) => {
                                  const handleY = e.target.y() + handleSize / 2;
                                  const newHalfH = Math.abs(handleY - centerY);
                                  let newH = Math.max(10, Math.min(newHalfH * 2, area.height));
                                  // Constrain so image stays within area vertically
                                  const newY = Math.max(area.y, Math.min(centerY - newH / 2, area.y + area.height - newH));
                                  updateElement(sel.id, { height: newH, y: newY });
                                }}
                              />
                            </>
                          );
                        })()}

                        {/* Transformer for selected element - always visible when selected */}
                        {selectedIds.length === 1 && !previewMode && (
                          <Transformer
                            ref={transformerRef}
                            rotateEnabled={true}
                            borderEnabled={true}
                            borderStroke="#22c55e"
                            borderStrokeWidth={2}
                            anchorFill="#ffffff"
                            anchorStroke="#22c55e"
                            anchorStrokeWidth={2}
                            anchorSize={isMobile ? 14 : 10}
                            anchorCornerRadius={isMobile ? 7 : 4}
                            keepRatio={false}
                            boundBoxFunc={(oldBox, newBox) => {
                              // Constrain transformer to print area if element has placeholder
                              const selectedElement = elements.find(e => e.id === selectedIds[0]);
                              if (selectedElement && selectedElement.placeholderId) {
                                const placeholder = placeholders.find(p => p.id === selectedElement.placeholderId);
                                if (placeholder) {
                                  const minX = placeholder.x;
                                  const minY = placeholder.y;
                                  const maxX = placeholder.x + placeholder.width;
                                  const maxY = placeholder.y + placeholder.height;

                                  return {
                                    ...newBox,
                                    x: Math.max(minX, Math.min(newBox.x, maxX - newBox.width)),
                                    y: Math.max(minY, Math.min(newBox.y, maxY - newBox.height)),
                                    width: Math.min(newBox.width, maxX - Math.max(minX, newBox.x)),
                                    height: Math.min(newBox.height, maxY - Math.max(minY, newBox.y)),
                                  };
                                }
                              }
                              return newBox;
                            }}
                          />
                        )}
                      </Layer>
                    </Stage>
                  </div>
                )}
              </div>

              {/* View Switcher - Desktop Only */}
              {!isMobile && availableViews.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background rounded-lg p-1 border shadow-lg z-10 transition-all hover:shadow-xl">
                  {availableViews.map((viewKey) => (
                    <Button
                      key={viewKey}
                      variant={currentView === viewKey ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleViewSwitch(viewKey)}
                      className="px-4"
                    >
                      {viewKey.charAt(0).toUpperCase() + viewKey.slice(1)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Design Area - Centered with background and shadow */
            <div
              className="flex-1 relative bg-[#f1f1f1] overflow-hidden flex items-center justify-center p-4"
              onClick={() => {
                if (isMobile) {
                  setSelectedIds([]);
                  setSelectedPlaceholderId(null);
                  setShowRightPanel(false);
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              <div
                ref={webglCanvasRef}
                onClick={(e) => e.stopPropagation()}
                className="relative shadow-2xl transition-all duration-300 bg-white"
                style={{
                  borderRadius: '2px', // Very subtle rounding
                  overflow: 'hidden'
                }}
              >
                {/* Fallback canvas content if WebGL is not rendering yet */}
                {!previewMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    {/* This space will be occupied by the WebGL canvas */}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Desktop) */}
        {!previewMode && showRightPanel && !isMobile && (
          <div className="w-[350px] border-l bg-background flex flex-col h-full">
            <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full rounded-none border-b flex-shrink-0">
                <TabsTrigger value="product" className="flex-1">Product</TabsTrigger>
                <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
                <TabsTrigger value="layers" className="flex-1">Layers</TabsTrigger>
              </TabsList>

              <TabsContent value="product" className="flex-1 overflow-y-auto p-4 min-h-0">
                <ProductInfoPanel
                  product={product}
                  isLoading={isLoadingProduct}
                  selectedColors={selectedColors}
                  selectedSizes={selectedSizes}
                  selectedSizesByColor={selectedSizesByColor}
                  onColorToggle={handleColorToggle}
                  onSizeToggle={handleSizeToggle}
                  onSizeToggleForColor={handleSizeToggleForColor}
                  onPrimaryColorHexChange={(hex) => {
                    setPrimaryColorHex(hex);
                    setHasUnsavedChanges(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="properties" className="flex-1 overflow-y-auto p-4 min-h-0">
                <PropertiesPanel
                  selectedPlaceholderId={selectedPlaceholderId}
                  placeholders={placeholders}
                  designUrlsByPlaceholder={getDesignUrlsForView(currentView)}
                  onDesignUpload={(placeholderId, designUrl) => {
                    setDesignUrlForView(currentView, placeholderId, designUrl);
                  }}
                  onDesignRemove={(placeholderId) => {
                    removeDesignUrlForView(currentView, placeholderId);
                  }}
                  displacementSettings={displacementSettings}
                  onDisplacementSettingsChange={handleDisplacementSettingsChange}
                  selectedElementIds={selectedIds}
                  elements={elements}
                  onElementUpdate={(updates) => {
                    selectedIds.forEach(id => updateElement(id, updates, false));
                    setTimeout(() => saveToHistory(true), 0); // Immediate save for property updates
                  }}
                  onElementDelete={(id) => {
                    setElements(prev => prev.filter(el => el.id !== id));
                    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
                    setHasUnsavedChanges(true);
                    setTimeout(() => saveToHistory(true), 0); // Immediate save for delete
                  }}
                  PX_PER_INCH={PX_PER_INCH}
                  canvasPadding={canvasPadding}
                />
              </TabsContent>

              <TabsContent value="layers" className="flex-1 overflow-y-auto p-4 min-h-0">
                <LayersPanel
                  placeholders={placeholders}
                  selectedPlaceholderId={selectedPlaceholderId}
                  onSelectPlaceholder={(id) => {
                    setSelectedPlaceholderId(id);
                    selectedPlaceholderIdRef.current = id;
                    setSelectedIds([]);
                  }}
                  designUrlsByPlaceholder={getDesignUrlsForView(currentView)}
                  onDesignRemove={(placeholderId) => {
                    removeDesignUrlForView(currentView, placeholderId);
                  }}
                  elements={elements}
                  selectedIds={selectedIds}
                  onSelectElement={(id) => {
                    setSelectedIds([id]);
                    setSelectedPlaceholderId(null);
                    selectedPlaceholderIdRef.current = null;
                  }}
                  onUpdate={updateElement}
                  onDelete={(id) => {
                    setElements(prev => prev.filter(el => el.id !== id));
                    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
                    setHasUnsavedChanges(true); // Mark as having unsaved changes
                    setTimeout(() => saveToHistory(true), 0); // Immediate save for delete
                  }}
                  onReorder={(newOrder) => {
                    setElements(newOrder);
                    setHasUnsavedChanges(true); // Mark as having unsaved changes
                    setTimeout(() => saveToHistory(true), 0); // Immediate save for reorder
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Mobile Panels - Drawer based */}
        {isMobile && !previewMode && (
          <Drawer
            open={showRightPanel}
            onOpenChange={setShowRightPanel}
            modal={false}
            snapPoints={[0.3, 0.6, 0.8]}
          >
            <DrawerContent className="h-full border-t border-border/50 shadow-2xl" showOverlay={false}>
              <DrawerHeader className="text-left border-b pb-4">
                <div className="flex items-center justify-between">
                  <DrawerTitle className="capitalize">
                    {rightPanelTab}
                  </DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                      <X className="w-5 h-5" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {rightPanelTab === 'product' && (
                  <ProductInfoPanel
                    product={product}
                    isLoading={isLoadingProduct}
                    selectedColors={selectedColors}
                    selectedSizes={selectedSizes}
                    selectedSizesByColor={selectedSizesByColor}
                    onColorToggle={handleColorToggle}
                    onSizeToggle={handleSizeToggle}
                    onSizeToggleForColor={handleSizeToggleForColor}
                    onPrimaryColorHexChange={(hex) => {
                      setPrimaryColorHex(hex);
                      setHasUnsavedChanges(true);
                    }}
                  />
                )}

                {rightPanelTab === 'layers' && (
                  <LayersPanel
                    placeholders={placeholders}
                    selectedPlaceholderId={selectedPlaceholderId}
                    onSelectPlaceholder={(id) => {
                      setSelectedPlaceholderId(id);
                      selectedPlaceholderIdRef.current = id;
                      setSelectedIds([]);
                    }}
                    designUrlsByPlaceholder={getDesignUrlsForView(currentView)}
                    onDesignRemove={(placeholderId) => {
                      removeDesignUrlForView(currentView, placeholderId);
                    }}
                    elements={elements}
                    selectedIds={selectedIds}
                    onSelectElement={(id) => {
                      setSelectedIds([id]);
                      setSelectedPlaceholderId(null);
                      selectedPlaceholderIdRef.current = null;
                    }}
                    onUpdate={updateElement}
                    onDelete={(id) => {
                      setElements(prev => prev.filter(el => el.id !== id));
                      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
                      setHasUnsavedChanges(true);
                      setTimeout(() => saveToHistory(true), 0);
                    }}
                    onReorder={(newOrder) => {
                      setElements(newOrder);
                      setHasUnsavedChanges(true);
                      setTimeout(() => saveToHistory(true), 0);
                    }}
                    // Props for Mobile Properties Integration
                    isMobile={true}
                    displacementSettings={displacementSettings}
                    onDisplacementSettingsChange={handleDisplacementSettingsChange}
                    onDesignUpload={(placeholderId, designUrl) => {
                      setDesignUrlForView(currentView, placeholderId, designUrl);
                    }}
                    PX_PER_INCH={PX_PER_INCH}
                    canvasPadding={canvasPadding}
                  />
                )}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      {/* Bottom Bar (hidden in preview mode) */}
      {/* Bottom Bar (hidden in preview mode) */}
      {!previewMode && (
        <div className={`${isMobile ? 'h-[75px] pb-2' : 'h-[50px]'} border-t flex items-center justify-between px-4 bg-background z-30`}>
          {isMobile ? (
            <div className="w-full flex items-center justify-around relative px-4">
              {/* Mobile Left Group */}
              <div className="flex items-center opacity-80">
                <button
                  onClick={() => {
                    setRightPanelTab('product');
                    setShowRightPanel(true);
                    setShowLeftPanel(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 group transition-all active:scale-95 ${rightPanelTab === 'product' && showRightPanel ? 'text-primary scale-105' : 'text-muted-foreground'}`}
                >
                  <div className={`p-1.5 rounded-md ${rightPanelTab === 'product' && showRightPanel ? 'bg-primary/10' : 'group-active:bg-muted'}`}>
                    <Package className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Products</span>
                </button>
              </div>

              {/* Space for the Floating Plus Button */}
              <div className="w-20" />

              {/* Floating Plus Button (Absolute context) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-12">
                <div className={`cta-pulse ${isMobileMenuOpen ? 'stop-pulse' : ''}`}>
                  <Button
                    size="icon"
                    onClick={() => {
                      setIsMobileMenuOpen(true);
                      setMobileToolStage('menu');
                      setShowRightPanel(false);
                      setShowLeftPanel(false);
                    }}
                    className="w-18 h-18 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-primary hover:bg-primary/95 border-4 border-background flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-20"
                    style={{
                      width: '72px',
                      height: '72px',
                      boxShadow: '0 10px 25px -5px rgba(var(--primary), 0.4), 0 8px 10px -6px rgba(var(--primary), 0.4)'
                    }}
                  >
                    <Plus className="w-10 h-10 text-primary-foreground stroke-[3]" />
                  </Button>
                </div>
              </div>

              {/* Mobile Right Group */}
              <div className="flex items-center opacity-80">
                <button
                  onClick={() => {
                    setRightPanelTab('layers');
                    setShowRightPanel(true);
                    setShowLeftPanel(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 group transition-all active:scale-95 ${rightPanelTab === 'layers' && showRightPanel ? 'text-primary scale-105' : 'text-muted-foreground'}`}
                >
                  <div className={`p-1.5 rounded-md ${rightPanelTab === 'layers' && showRightPanel ? 'bg-primary/10' : 'group-active:bg-muted'}`}>
                    <Layers className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Layers</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(prev => Math.max(10, prev - 10))}
                  className="h-8 w-8"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-16 text-center tabular-nums">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(prev => Math.min(500, prev + 10))}
                  className="h-8 w-8"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={fitToScreen} className="h-8 text-xs">Fit</Button>
                <Button variant="ghost" size="sm" onClick={() => setZoom(100)} className="h-8 text-xs">100%</Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowGrid(!showGrid)}
                  className="h-8 w-8 shadow-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={showRulers ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowRulers(!showRulers)}
                  className="h-8 w-8 shadow-none"
                >
                  <Ruler className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center">
                <Button
                  variant="default"
                  className={`px-8 h-9 text-xs font-semibold ${!variantValidation.isValid ? 'opacity-50 grayscale' : ''}`}
                  onClick={handlePublishToStore}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Add Product'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Components
// Custom hook for loading images
const useImageLoader = (url: string | undefined) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
  }, [url]);

  return image;
};

const ImageElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>, saveImmediately?: boolean) => void;
  printArea?: { x: number; y: number; width: number; height: number; isPolygon?: boolean; polygonPointsPx?: number[] };
  isEditMode?: boolean;
}> = ({ element, isSelected, onSelect, onUpdate, printArea, isEditMode = true }) => {
  const image = useImageLoader(element.imageUrl);

  if (!image) return null;

  // Constrain image to print area when dragging
  const handleDragEnd = (e: any) => {
    let newX = e.target.x();
    let newY = e.target.y();

    if (printArea && element.width && element.height) {
      // Constrain position to keep image within print area
      newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.width - element.width));
      newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.height - element.height));
    }

    onUpdate({
      x: newX,
      y: newY
    }, true); // Save immediately for drag end
  };

  // Constrain image size and position when transforming
  const handleTransformEnd = (e: any) => {
    const node = e.target;
    let newWidth = node.width() * node.scaleX();
    let newHeight = node.height() * node.scaleY();
    let newX = node.x();
    let newY = node.y();

    if (printArea) {
      // Constrain size to print area
      newWidth = Math.min(newWidth, printArea.width);
      newHeight = Math.min(newHeight, printArea.height);

      // Constrain position
      newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.width - newWidth));
      newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.height - newHeight));
    }

    onUpdate({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
      scaleX: 1,
      scaleY: 1
    }, true); // Save immediately for transform end
    node.scaleX(1);
    node.scaleY(1);
  };

  // Calculate flip scales
  const flipScaleX = element.flipX ? -1 : 1;
  const flipScaleY = element.flipY ? -1 : 1;

  // Calculate effective position for flipped images
  const effectiveX = element.flipX ? element.x + (element.width || 0) : element.x;
  const effectiveY = element.flipY ? element.y + (element.height || 0) : element.y;

  // Build filter array for Konva
  const filters: any[] = [];
  const filterConfig: any = {};

  // Apply filters if any are set
  if (element.brightness !== undefined && element.brightness !== 0) {
    filterConfig.brightness = element.brightness / 100; // -1 to 1
  }
  if (element.contrast !== undefined && element.contrast !== 0) {
    filterConfig.contrast = element.contrast; // -100 to 100
  }
  if (element.saturation !== undefined && element.saturation !== 0) {
    // Saturation is typically 0-2 range, where 1 is normal
    // For realistic blending, we want more control
    filterConfig.saturation = 1 + (element.saturation / 100);
  }
  if (element.blur !== undefined && element.blur > 0) {
    filterConfig.blurRadius = element.blur;
  }

  // Map blend mode to Konva's globalCompositeOperation
  const blendModeMap: Record<string, string> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };

  const compositeOperation = element.blendMode
    ? blendModeMap[element.blendMode] || 'source-over'
    : 'source-over';

  // Enhanced shadow with realistic opacity
  // Calculate shadow opacity based on shadowOpacity property
  const shadowAlpha = element.shadowOpacity !== undefined
    ? element.shadowOpacity
    : (element.shadowBlur && element.shadowBlur > 0 ? 0.5 : 0);

  // Convert shadow color with opacity for more realistic shadows
  const shadowColorWithAlpha = element.shadowColor
    ? (() => {
      // If shadowColor is hex, add alpha channel
      if (element.shadowColor.startsWith('#')) {
        const alphaHex = Math.round(shadowAlpha * 255).toString(16).padStart(2, '0');
        return element.shadowColor + alphaHex;
      }
      return element.shadowColor;
    })()
    : `rgba(0, 0, 0, ${shadowAlpha})`;

  // Constrain dragging within print area
  const dragBoundFunc = printArea && element.width && element.height
    ? (pos: { x: number; y: number }) => {
      const constrainedX = Math.max(printArea.x, Math.min(pos.x, printArea.x + printArea.width - element.width!));
      const constrainedY = Math.max(printArea.y, Math.min(pos.y, printArea.y + printArea.height - element.height!));
      return { x: constrainedX, y: constrainedY };
    }
    : undefined;

  // Common image props
  const imageProps = {
    id: element.id,
    image: image,
    x: effectiveX,
    y: effectiveY,
    width: element.width,
    height: element.height,
    scaleX: flipScaleX,
    scaleY: flipScaleY,
    opacity: element.opacity !== undefined ? element.opacity : 1,
    rotation: element.rotation,
    draggable: isEditMode && !element.locked,
    onClick: isEditMode ? onSelect : undefined,
    onDragEnd: isEditMode ? handleDragEnd : undefined,
    onTransformEnd: isEditMode ? handleTransformEnd : undefined,
    dragBoundFunc: isEditMode ? dragBoundFunc : undefined,
    // Enhanced shadow properties with realistic opacity
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowColor: shadowColorWithAlpha,
    shadowOpacity: shadowAlpha,
    // Blend mode support
    globalCompositeOperation: compositeOperation,
    // Border properties (using stroke)
    stroke: (element.borderWidth || 0) > 0 ? element.borderColor : undefined,
    strokeWidth: element.borderWidth || 0,
    dash: element.borderStyle === 'dashed' ? [10, 5] : undefined,
    // Filters
    ...(Object.keys(filterConfig).length > 0 ? filterConfig : {}),
  };

  // Use Group with clipping to visually clip image to print area
  if (printArea) {
    // If polygon clip is available, use it
    if (printArea.isPolygon && printArea.polygonPointsPx && printArea.polygonPointsPx.length >= 6) {
      const pts = printArea.polygonPointsPx;
      return (
        <Group
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) {
              ctx.lineTo(pts[i], pts[i + 1]);
            }
            ctx.closePath();
          }}
        >
          <Image {...imageProps} />
        </Group>
      );
    }

    // Fallback: rectangular clip (existing behavior)
    return (
      <Group
        clipX={printArea.x}
        clipY={printArea.y}
        clipWidth={printArea.width}
        clipHeight={printArea.height}
      >
        <Image {...imageProps} />
      </Group>
    );
  }

  return <Image {...imageProps} />;
};

const TextElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>, saveImmediately?: boolean) => void;
  printArea?: { x: number; y: number; width: number; height: number; isPolygon?: boolean; polygonPointsPx?: number[] };
  isEditMode?: boolean;
  onDblClick?: () => void;
  isEditing?: boolean;
}> = ({ element, isSelected, onSelect, onUpdate, printArea, isEditMode = true, onDblClick, isEditing }) => {
  if (isEditing) return null;
  // Helper to calculate text bounding box considering rotation


  // Constrain text to print area when dragging
  const handleDragEnd = (e: any) => {
    let newX = e.target.x();
    let newY = e.target.y();

    if (printArea) {
      const text = element.text || '';
      const fontSize = element.fontSize || 24;
      const letterSpacing = element.letterSpacing || 0;

      const baseWidth = text
        ? getTextWidth(text, fontSize, element.fontFamily || 'Arial') + (letterSpacing * Math.max(0, text.length - 1))
        : fontSize * 0.5;
      const height = fontSize * 1.2;

      const relBounds = calculateRotatedBounds(0, 0, baseWidth, height, element.rotation || 0);

      // Constrain position to keep text within print area
      const minX = printArea.x - relBounds.relMinX;
      const maxX = (printArea.x + printArea.width) - relBounds.relMaxX;
      const minY = printArea.y - relBounds.relMinY;
      const maxY = (printArea.y + printArea.height) - relBounds.relMaxY;

      newX = minX > maxX ? minX : Math.max(minX, Math.min(newX, maxX));
      newY = minY > maxY ? minY : Math.max(minY, Math.min(newY, maxY));
    }

    onUpdate({
      x: newX,
      y: newY
    }, true); // Save immediately for drag end
  };

  // Constrain text position when transforming
  const handleTransformEnd = (e: any) => {
    const node = e.target as any;
    let newX = node.x();
    let newY = node.y();
    const newRotation = node.rotation();

    if (printArea) {
      const text = element.text || '';
      const newFontSize = (node.fontSize?.() || element.fontSize || 24) * node.scaleY();
      const letterSpacing = element.letterSpacing || 0;

      const baseWidth = text
        ? getTextWidth(text, newFontSize, element.fontFamily || 'Arial') + (letterSpacing * Math.max(0, text.length - 1))
        : newFontSize * 0.5;
      const height = newFontSize * 1.2;

      const relBounds = calculateRotatedBounds(0, 0, baseWidth, height, newRotation);

      // Constrain position
      const minX = printArea.x - relBounds.relMinX;
      const maxX = (printArea.x + printArea.width) - relBounds.relMaxX;
      const minY = printArea.y - relBounds.relMinY;
      const maxY = (printArea.y + printArea.height) - relBounds.relMaxY;

      newX = minX > maxX ? minX : Math.max(minX, Math.min(newX, maxX));
      newY = minY > maxY ? minY : Math.max(minY, Math.min(newY, maxY));
    }

    onUpdate({
      x: newX,
      y: newY,
      rotation: newRotation,
      fontSize: (node.fontSize?.() || element.fontSize || 24) * node.scaleY(),
      // Update width to match the new scale so word-wrap boundary stays correct
      ...(element.width ? { width: (element.width || 100) * node.scaleX() } : {}),
      scaleX: 1,
      scaleY: 1
    }, true); // Save immediately for transform end
    node.scaleX(1);
    node.scaleY(1);
  };

  // Drag boundary function to prevent dragging outside print area
  const dragBoundFunc = printArea
    ? (pos: { x: number; y: number }) => {
      const text = element.text || '';
      const fontSize = element.fontSize || 24;

      const width = text
        ? getTextWidth(text, fontSize, element.fontFamily || 'Arial') + ((element.letterSpacing || 0) * Math.max(0, text.length - 1))
        : fontSize * 0.5;
      const height = fontSize * 1.2;

      const relBounds = calculateRotatedBounds(0, 0, width, height, element.rotation || 0);

      // Determine valid range for pos (top-left anchor)
      // pos.x + relBounds.minX >= printArea.x  => pos.x >= printArea.x - relBounds.minX
      // pos.x + relBounds.maxX <= printArea.right => pos.x <= printArea.right - relBounds.maxX

      const minX = printArea.x - relBounds.relMinX;
      const maxX = (printArea.x + printArea.width) - relBounds.relMaxX;

      const minY = printArea.y - relBounds.relMinY;
      const maxY = (printArea.y + printArea.height) - relBounds.relMaxY;

      // If text is larger than area (should handle gracefully, e.g., pin to min)
      const constrainedX = minX > maxX ? minX : Math.max(minX, Math.min(pos.x, maxX));
      const constrainedY = minY > maxY ? minY : Math.max(minY, Math.min(pos.y, maxY));

      return { x: constrainedX, y: constrainedY };
    }
    : undefined;

  // Map blend mode to Konva's globalCompositeOperation
  type CompositeOperation = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

  const blendModeMap: Record<string, CompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };

  const compositeOperation: CompositeOperation = element.blendMode
    ? (blendModeMap[element.blendMode] || 'source-over')
    : 'source-over';

  // Enhanced shadow with realistic opacity
  const shadowAlpha = element.shadowOpacity !== undefined
    ? element.shadowOpacity
    : (element.shadowBlur && element.shadowBlur > 0 ? 0.5 : 0);

  const shadowColorWithAlpha = element.shadowColor
    ? (() => {
      if (element.shadowColor.startsWith('#')) {
        const alphaHex = Math.round(shadowAlpha * 255).toString(16).padStart(2, '0');
        return element.shadowColor + alphaHex;
      }
      return element.shadowColor;
    })()
    : `rgba(0, 0, 0, ${shadowAlpha})`;

  // Parse fontStyle to determine bold/italic
  const isBold = element.fontStyle?.includes('bold') || false;
  const isItalic = element.fontStyle?.includes('italic') || false;
  const fontWeight = isBold ? 'bold' : 'normal';
  const fontStyle = isItalic ? 'italic' : 'normal';

  // Ensure text always has a value for rendering (empty string shows cursor)
  const displayText = element.text || '';

  // Calculate minimum bounding box for empty text
  const minWidth = element.fontSize ? element.fontSize * 0.5 : 24;
  const minHeight = element.fontSize || 24;

  const commonTextProps: any = {
    id: element.id,
    x: element.x,
    y: element.y,
    text: displayText || ' ', // Use space for empty text to maintain cursor
    fontSize: element.fontSize || 24,
    fontFamily: element.fontFamily || 'Arial',
    fontStyle: fontStyle,
    fontWeight: fontWeight,
    fill: element.fill || '#000000',
    opacity: element.opacity !== undefined ? element.opacity : 1,
    rotation: element.rotation || 0,
    draggable: isEditMode && !element.locked,
    onClick: isEditMode ? onSelect : undefined,
    onDblClick: isEditMode ? onDblClick : undefined,
    onDragEnd: isEditMode ? handleDragEnd : undefined,
    // GHOSTING FIX: Pixi is now hidden in edit mode, so Konva text should be fully visible

    onTransformEnd: isEditMode ? handleTransformEnd : undefined,
    dragBoundFunc: isEditMode ? dragBoundFunc : undefined,
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowColor: shadowColorWithAlpha,
    shadowOpacity: shadowAlpha,
    globalCompositeOperation: compositeOperation as any,
    // Width constraint + word wrapping to keep text within placeholder
    ...(element.width ? { width: element.width, wrap: 'word' } : {}),
  };

  // Render text with clipping to print area (similar to ImageElement)
  const renderText = () => {
    // Only render curved text if curveShape is explicitly set (not just when curved is toggled)
    if (element.curved && element.curveShape) {
      const text = element.text || '';
      const fontSize = element.fontSize || 24;
      const fontFamily = element.fontFamily || 'Arial';

      // Calculate text width to determine appropriate radius
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Helper to calculate width for overlay
      // (This is redundant if we move helper out, but fine here)
      let textWidth = 100; // Default fallback

      if (ctx && text) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(text);
        textWidth = metrics.width + (element.letterSpacing || 0) * Math.max(0, text.length - 1);
      }

      // Calculate radius based on text width and available space in placeholder
      let radius = element.curveRadius || 200;

      // Ensure curve fits within placeholder bounds
      if (printArea) {
        const availableWidth = printArea.width;
        const availableHeight = printArea.height;

        // For arch shapes, radius should be at least half text width, but not exceed available space
        if (element.curveShape === 'arch-down' || element.curveShape === 'arch-up') {
          const minRadius = textWidth / 2;
          const maxRadius = Math.min(availableWidth / 2, availableHeight);
          radius = Math.max(minRadius, Math.min(radius, maxRadius));
        } else if (element.curveShape === 'circle') {
          // For circle, radius is limited by both width and height
          const maxRadius = Math.min(availableWidth / 2, availableHeight / 2);
          radius = Math.min(radius, maxRadius);
        }
      } else {
        // Fallback: ensure radius is at least half the text width
        radius = Math.max(radius, textWidth / 2);
      }

      let pathData = '';
      const curveShape = element.curveShape;

      if (curveShape === 'arch-down') {
        // Inverted U-shape - path centered at text position
        pathData = `M -${radius},0 A ${radius},${radius} 0 0,1 ${radius},0`;
      } else if (curveShape === 'arch-up') {
        // U-shape (flipped) - path centered at text position
        pathData = `M -${radius},0 A ${radius},${radius} 0 0,0 ${radius},0`;
      } else if (curveShape === 'circle') {
        // Full circle - path centered at text position
        pathData = `M 0,-${radius} A ${radius},${radius} 0 1,1 0,${radius} A ${radius},${radius} 0 1,1 0,-${radius}`;
      } else {
        // Default to arch-down
        pathData = `M -${radius},0 A ${radius},${radius} 0 0,1 ${radius},0`;
      }

      // TextPath: path is relative to (0,0), positioned at element.x, element.y
      // This keeps the text at the same position when curved
      return (
        <TextPath
          {...commonTextProps}
          data={pathData}
          align={element.align || 'center'}
          letterSpacing={element.letterSpacing}
          x={element.x}
          y={element.y}
          text={text || ' '} // Ensure text is passed
        />
      );
    }

    // For empty text, show a placeholder with cursor indicator and visible bounding box
    if (!displayText) {
      const fontSize = element.fontSize || 24;
      const cursorX = element.x;
      const cursorY = element.y + fontSize * 0.2; // Adjust for baseline

      return (
        <Group>
          {/* Visible text placeholder to maintain bounding box and show cursor area */}
          <Text
            {...commonTextProps}
            text=" " // Space to maintain cursor position and bounding box
            align={element.align || 'left'}
            letterSpacing={element.letterSpacing}
            fill={element.fill || '#000000'}
            opacity={0.3} // Semi-transparent to show it's a placeholder
          />
          {/* Visible cursor indicator for empty text */}
          <Line
            points={[cursorX, cursorY, cursorX, cursorY + fontSize * 0.8]}
            stroke={element.fill || '#000000'}
            strokeWidth={2}
            dash={[4, 4]}
            listening={false}
          />
        </Group>
      );
    }

    return (
      <Text
        {...commonTextProps}
        align={element.align}
        letterSpacing={element.letterSpacing}
      />
    );
  };

  // Apply clipping if printArea is defined
  if (printArea) {
    // If polygon clip is available, use it
    if (printArea.isPolygon && printArea.polygonPointsPx && printArea.polygonPointsPx.length >= 6) {
      const pts = printArea.polygonPointsPx;
      return (
        <Group
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) {
              ctx.lineTo(pts[i], pts[i + 1]);
            }
            ctx.closePath();
          }}
        >
          {renderText()}
        </Group>
      );
    }

    // Fallback: rectangular clip
    return (
      <Group
        clipX={printArea.x}
        clipY={printArea.y}
        clipWidth={printArea.width}
        clipHeight={printArea.height}
      >
        {renderText()}
      </Group>
    );
  }

  // No clipping if no printArea
  return renderText();
};

const ShapeElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  printArea?: { x: number; y: number; width: number; height: number; isPolygon?: boolean; polygonPointsPx?: number[] };
  isEditMode?: boolean;
}> = ({ element, isSelected, onSelect, onUpdate, printArea, isEditMode = true }) => {
  // Constrain shape to print area when dragging
  const handleDragEnd = (e: any) => {
    let newX = e.target.x();
    let newY = e.target.y();

    if (printArea && element.width && element.height) {
      // Constrain position to keep shape within print area
      newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.width - element.width));
      newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.height - element.height));
    }

    onUpdate({
      x: newX,
      y: newY
    });
  };

  // Constrain shape size and position when transforming
  const handleTransformEnd = (e: any) => {
    const node = e.target;
    let newWidth = node.width() * node.scaleX();
    let newHeight = node.height() * node.scaleY();
    let newX = node.x();
    let newY = node.y();

    if (printArea) {
      // Constrain size to print area
      newWidth = Math.min(newWidth, printArea.width);
      newHeight = Math.min(newHeight, printArea.height);

      // Constrain position
      newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.width - newWidth));
      newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.height - newHeight));
    }

    onUpdate({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  // Map blend mode to Konva's globalCompositeOperation
  type CompositeOperation = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

  const blendModeMap: Record<string, CompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };

  const compositeOperation: CompositeOperation = element.blendMode
    ? (blendModeMap[element.blendMode] || 'source-over')
    : 'source-over';

  // Enhanced shadow with realistic opacity
  const shadowAlpha = element.shadowOpacity !== undefined
    ? element.shadowOpacity
    : (element.shadowBlur && element.shadowBlur > 0 ? 0.5 : 0);

  const shadowColorWithAlpha = element.shadowColor
    ? (() => {
      if (element.shadowColor.startsWith('#')) {
        const alphaHex = Math.round(shadowAlpha * 255).toString(16).padStart(2, '0');
        return element.shadowColor + alphaHex;
      }
      return element.shadowColor;
    })()
    : `rgba(0, 0, 0, ${shadowAlpha})`;

  const baseProps: any = {
    id: element.id,
    x: element.x,
    y: element.y,
    fill: element.fillColor || '#000000',
    stroke: element.strokeColor || '#000000',
    strokeWidth: element.strokeWidth || 2,
    opacity: element.opacity !== undefined ? element.opacity : 1,
    rotation: element.rotation || 0,
    draggable: isEditMode && !element.locked,
    onClick: isEditMode ? onSelect : undefined,
    onDragEnd: isEditMode ? handleDragEnd : undefined,
    onTransformEnd: isEditMode ? handleTransformEnd : undefined,
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowColor: shadowColorWithAlpha,
    shadowOpacity: shadowAlpha,
    globalCompositeOperation: compositeOperation as any,
  };

  // Render different shapes based on shapeType
  if (element.shapeType === 'circle') {
    const radius = (element.width || 50) / 2;
    return (
      <Circle
        {...baseProps}
        radius={radius}
        x={(element.x || 0) + radius}
        y={(element.y || 0) + radius}
      />
    );
  }

  if (element.shapeType === 'triangle') {
    const size = element.width || 100;
    const points = [
      element.x + size / 2, element.y, // top
      element.x, element.y + size, // bottom left
      element.x + size, element.y + size // bottom right
    ];
    return (
      <RegularPolygon
        {...baseProps}
        sides={3}
        radius={size / 2}
        x={element.x + size / 2}
        y={element.y + size / 2}
      />
    );
  }

  if (element.shapeType === 'star') {
    const size = element.width || 100;
    return (
      <Star
        {...baseProps}
        numPoints={5}
        innerRadius={size * 0.3}
        outerRadius={size / 2}
        x={element.x + size / 2}
        y={element.y + size / 2}
      />
    );
  }

  if (element.shapeType === 'heart') {
    // Heart shape using a custom path
    const size = element.width || 100;
    const centerX = element.x + size / 2;
    const centerY = element.y + size / 2;
    const scale = size / 100;

    // Heart path coordinates
    const heartPath = `
      M ${centerX},${centerY + 20 * scale}
      C ${centerX},${centerY + 10 * scale} ${centerX - 20 * scale},${centerY - 10 * scale} ${centerX - 30 * scale},${centerY}
      C ${centerX - 40 * scale},${centerY + 10 * scale} ${centerX - 30 * scale},${centerY + 20 * scale} ${centerX - 20 * scale},${centerY + 30 * scale}
      L ${centerX},${centerY + 50 * scale}
      L ${centerX + 20 * scale},${centerY + 30 * scale}
      C ${centerX + 30 * scale},${centerY + 20 * scale} ${centerX + 40 * scale},${centerY + 10 * scale} ${centerX + 30 * scale},${centerY}
      C ${centerX + 20 * scale},${centerY - 10 * scale} ${centerX},${centerY + 10 * scale} ${centerX},${centerY + 20 * scale}
      Z
    `;

    return (
      <Shape
        {...baseProps}
        sceneFunc={(context, shape) => {
          const path = new Path2D(heartPath);
          context.fillStyle = baseProps.fill as string;
          context.strokeStyle = baseProps.stroke as string;
          context.lineWidth = baseProps.strokeWidth as number;
          context.fill(path);
          context.stroke(path);
          // @ts-ignore - fillStroke exists but types may not be updated
          shape.fillStroke();
        }}
      />
    );
  }

  // Default: rectangle
  return (
    <Rect
      {...baseProps}
      width={element.width}
      height={element.height}
      cornerRadius={element.cornerRadius}
    />
  );
};

const PropertiesPanel: React.FC<{
  selectedPlaceholderId: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number; original: Placeholder }>;
  designUrlsByPlaceholder: Record<string, string>;
  onDesignUpload: (placeholderId: string, designUrl: string) => void;
  onDesignRemove: (placeholderId: string) => void;
  displacementSettings: DisplacementSettings;
  onDisplacementSettingsChange: (settings: DisplacementSettings) => void;
  selectedElementIds: string[];
  elements: CanvasElement[];
  onElementUpdate: (updates: Partial<CanvasElement>) => void;
  onElementDelete?: (id: string) => void;
  PX_PER_INCH: number;
  canvasPadding: number;
}> = ({
  selectedPlaceholderId,
  placeholders,
  designUrlsByPlaceholder,
  onDesignUpload,
  onDesignRemove,
  displacementSettings,
  onDisplacementSettingsChange,
  selectedElementIds,
  elements,
  onElementUpdate,
  onElementDelete,
  PX_PER_INCH,
  canvasPadding,
}) => {
    const [designTransforms, setDesignTransforms] = useState<Record<string, { x: number; y: number; scale: number }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedPlaceholder = selectedPlaceholderId
      ? placeholders.find(p => p.id === selectedPlaceholderId)
      : null;

    const selectedElement = selectedElementIds.length > 0
      ? elements.find(el => el.id === selectedElementIds[0])
      : null;

    // Handle design file upload for placeholder
    const handleDesignFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedPlaceholderId || !e.target.files?.[0]) return;

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
          onDesignUpload(selectedPlaceholderId, data.url);
          toast.success('Design uploaded successfully');
        } else {
          toast.error('Failed to upload design');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload design');
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    // Show element properties when element is selected
    if (selectedElement) {
      const element = selectedElement;
      const onUpdate = onElementUpdate;

      // Calculate position percentages for text elements
      const getPositionPercent = (element: CanvasElement, axis: 'x' | 'y') => {
        if (element.type !== 'text' || !element.placeholderId) return 0;
        const placeholder = placeholders.find(p => p.id === element.placeholderId);
        if (!placeholder) return 0;
        const value = axis === 'x' ? element.x : element.y;
        const size = axis === 'x' ? placeholder.width : placeholder.height;
        const offset = axis === 'x' ? placeholder.x : placeholder.y;
        return Math.round(((value - offset) / size) * 100 * 100) / 100; // Round to 2 decimals
      };

      const updatePositionPercent = (axis: 'x' | 'y', percent: number) => {
        if (element.type !== 'text' || !element.placeholderId) return;
        const placeholder = placeholders.find(p => p.id === element.placeholderId);
        if (!placeholder) return;
        const size = axis === 'x' ? placeholder.width : placeholder.height;
        const offset = axis === 'x' ? placeholder.x : placeholder.y;
        const newValue = offset + (size * percent / 100);
        onUpdate({ [axis]: newValue });
      };

      return (
        <div className="space-y-6">
          {element.type === 'text' && (
            <>
              {/* Layers Section */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Layers</Label>
                <div className="p-3 border rounded-lg bg-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                        <Type className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{element.text || 'Text'}</p>
                        <p className="text-xs text-muted-foreground">{element.fontFamily || 'Arial'}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const elementId = selectedElementIds[0];
                        if (elementId && onElementDelete) {
                          onElementDelete(elementId);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Text Input */}
                {/* <div>
                  <Label className="text-sm">Text</Label>
                  <Input
                    value={element.text || ''}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    className="mt-1"
                  />
                </div> */}

                {/* Font Family */}
                <div>
                  <Label className="text-sm">Font Family</Label>
                  <select
                    value={element.fontFamily || 'Arial'}
                    onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm mt-1"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <optgroup label="Google Fonts">
                      {['ABeeZee', 'Abel', 'Abril Fatface', 'Acme', 'Aladin', 'Alex Brush', 'Anton', 'Bangers', 'Caveat', 'Cinzel', 'Comfortaa', 'Dancing Script', 'Great Vibes', 'Indie Flower', 'Lobster', 'Montserrat', 'Open Sans', 'Oswald', 'Pacifico', 'Playfair Display', 'Poppins', 'Raleway', 'Roboto', 'Rubik'].map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm">Font Size</Label>
                    <span className="text-xs text-muted-foreground">{(element.fontSize || 24).toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[element.fontSize || 24]}
                    onValueChange={([value]) => onUpdate({ fontSize: value })}
                    min={8}
                    max={500}
                    step={1}
                  />
                </div>

                {/* Bold and Italic */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={element.fontStyle?.includes('bold') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const currentStyle = element.fontStyle || '';
                      const isBold = currentStyle.includes('bold');
                      let newStyle = '';
                      if (isBold) {
                        // Remove bold, keep italic if present
                        newStyle = currentStyle.replace(/\bbold\b/g, '').trim();
                        if (currentStyle.includes('italic')) {
                          newStyle = newStyle ? newStyle + ' italic' : 'italic';
                        }
                      } else {
                        // Add bold, keep italic if present
                        newStyle = currentStyle.includes('italic')
                          ? 'bold italic'
                          : 'bold';
                      }
                      onUpdate({ fontStyle: newStyle || undefined });
                    }}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={element.fontStyle?.includes('italic') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const currentStyle = element.fontStyle || '';
                      const isItalic = currentStyle.includes('italic');
                      let newStyle = '';
                      if (isItalic) {
                        // Remove italic, keep bold if present
                        newStyle = currentStyle.replace(/\bitalic\b/g, '').trim();
                        if (currentStyle.includes('bold')) {
                          newStyle = newStyle ? newStyle + ' bold' : 'bold';
                        }
                      } else {
                        // Add italic, keep bold if present
                        newStyle = currentStyle.includes('bold')
                          ? 'bold italic'
                          : 'italic';
                      }
                      onUpdate({ fontStyle: newStyle || undefined });
                    }}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                </div>

                {/* Indentation Controls */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Indentation</Label>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Shift text left (decrease x position)
                        const currentX = element.x;
                        const shiftAmount = (element.fontSize || 24) * 0.5; // Shift by half font size
                        onUpdate({ x: currentX - shiftAmount });
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Shift text right (increase x position)
                        const currentX = element.x;
                        const shiftAmount = (element.fontSize || 24) * 0.5; // Shift by half font size
                        onUpdate({ x: currentX + shiftAmount });
                      }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Text Alignment */}
                {/* <div className="flex items-center gap-2">
                  <Button
                    variant={element.align === 'left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdate({ align: 'left' })}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={element.align === 'center' || !element.align ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdate({ align: 'center' })}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={element.align === 'right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdate({ align: 'right' })}
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div> */}

                {/* Color */}
                <div>
                  <Label className="text-sm">Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={element.fill || '#000000'}
                      onChange={(e) => onUpdate({ fill: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={element.fill || '#000000'}
                      onChange={(e) => onUpdate({ fill: e.target.value })}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Letter Spacing */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm">Letter Spacing</Label>
                    <span className="text-xs text-muted-foreground">{element.letterSpacing || 0}</span>
                  </div>
                  <Slider
                    value={[element.letterSpacing || 0]}
                    onValueChange={([value]) => onUpdate({ letterSpacing: value })}
                    min={-10}
                    max={50}
                    step={1}
                  />
                </div>

                {/* Curved Text */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Curved text</Label>
                    <Switch
                      checked={element.curved || false}
                      onCheckedChange={(checked) => {
                        // When toggling curved on, don't set curveShape yet - wait for user to choose
                        // When toggling off, clear both curved and curveShape
                        if (checked) {
                          onUpdate({
                            curved: true,
                            curveRadius: element.curveRadius || 200
                            // Don't set curveShape - wait for user to select arch up/down/circle
                          });
                        } else {
                          onUpdate({
                            curved: false,
                            curveShape: undefined,
                            curveRadius: undefined
                          });
                        }
                      }}
                    />
                  </div>

                  {element.curved && (
                    <>
                      {/* Curve Shape Options */}
                      <div className="flex gap-2">
                        <Button
                          variant={element.curveShape === 'arch-down' || (!element.curveShape && element.curved) ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => onUpdate({ curveShape: 'arch-down' })}
                        >
                          Arch Down
                        </Button>
                        <Button
                          variant={element.curveShape === 'arch-up' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => onUpdate({ curveShape: 'arch-up' })}
                        >
                          Arch Up
                        </Button>
                        <Button
                          variant={element.curveShape === 'circle' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => onUpdate({ curveShape: 'circle' })}
                        >
                          Circle
                        </Button>
                      </div>

                      {/* Curve Percentage */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm">Curve</Label>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(((element.curveRadius || 200) / 1000) * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[element.curveRadius || 200]}
                          onValueChange={([value]) => onUpdate({ curveRadius: value })}
                          min={50}
                          max={1000}
                          step={10}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm">Rotate</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={Math.round(element.rotation || 0)}
                        onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">deg</span>
                    </div>
                  </div>
                  <Slider
                    value={[element.rotation || 0]}
                    onValueChange={([value]) => onUpdate({ rotation: value })}
                    min={-180}
                    max={180}
                    step={1}
                  />
                </div>

                {/* Position */}
                <div className="space-y-3 border-t pt-3">
                  <Label className="text-sm">Position</Label>

                  {/* Position Left */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Position left</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const current = getPositionPercent(element, 'x');
                            updatePositionPercent('x', Math.max(0, current - 0.1));
                          }}
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={getPositionPercent(element, 'x').toFixed(2)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updatePositionPercent('x', value);
                          }}
                          className="w-20 h-7 text-xs text-center"
                          step="0.1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const current = getPositionPercent(element, 'x');
                            updatePositionPercent('x', Math.min(100, current + 0.1));
                          }}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Position Top */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Position top</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const current = getPositionPercent(element, 'y');
                            updatePositionPercent('y', Math.max(0, current - 0.1));
                          }}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={getPositionPercent(element, 'y').toFixed(2)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updatePositionPercent('y', value);
                          }}
                          className="w-20 h-7 text-xs text-center"
                          step="0.1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const current = getPositionPercent(element, 'y');
                            updatePositionPercent('y', Math.min(100, current + 0.1));
                          }}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Graphics/Image/Shape Elements - Unified Controls */}
          {(element.type === 'image' || element.type === 'shape') && (
            <>
              {/* Layers Section */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Layers</Label>
                <div className="p-3 border rounded-lg bg-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                        {element.type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {element.type === 'image' ? (element.name || 'Image') : (element.name || element.shapeType || 'Shape')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {element.width ? `${Math.round(element.width)}×${Math.round(element.height || 0)}` : 'Element'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const elementId = selectedElementIds[0];
                        if (elementId && onElementDelete) {
                          onElementDelete(elementId);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Transform Controls - Grid Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Width */}
                  <div>
                    <Label className="text-sm">Width</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={element.width ? (element.width / PX_PER_INCH).toFixed(2) : '0'}
                        onChange={(e) => {
                          const inches = parseFloat(e.target.value) || 0;
                          const pixels = inches * PX_PER_INCH;
                          if (element.lockAspectRatio && element.width && element.height) {
                            const aspectRatio = element.width / element.height;
                            onUpdate({ width: pixels, height: pixels / aspectRatio });
                          } else {
                            onUpdate({ width: pixels });
                          }
                        }}
                        className="w-full h-8 text-sm"
                        step="0.01"
                      />
                      <span className="text-xs text-muted-foreground">in</span>
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <Label className="text-sm">Height</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={element.height ? (element.height / PX_PER_INCH).toFixed(2) : '0'}
                        onChange={(e) => {
                          const inches = parseFloat(e.target.value) || 0;
                          const pixels = inches * PX_PER_INCH;
                          if (element.lockAspectRatio && element.width && element.height) {
                            const aspectRatio = element.width / element.height;
                            onUpdate({ height: pixels, width: pixels * aspectRatio });
                          } else {
                            onUpdate({ height: pixels });
                          }
                        }}
                        className="w-full h-8 text-sm"
                        step="0.01"
                      />
                      <span className="text-xs text-muted-foreground">in</span>
                    </div>
                  </div>

                  {/* Rotate */}
                  <div>
                    <Label className="text-sm">Rotate</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={Math.round(element.rotation || 0)}
                        onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
                        className="w-full h-8 text-sm"
                        step="1"
                      />
                      <span className="text-xs text-muted-foreground">deg</span>
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <Label className="text-sm">Scale</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={element.scaleX ? Math.round(element.scaleX * 100 * 100) / 100 : '100'}
                        onChange={(e) => {
                          const scale = parseFloat(e.target.value) || 100;
                          const scaleValue = scale / 100;
                          // Update scale while preserving current dimensions
                          const currentWidth = element.width || 100;
                          const currentHeight = element.height || 100;
                          onUpdate({
                            scaleX: scaleValue,
                            scaleY: scaleValue,
                            width: currentWidth * scaleValue,
                            height: currentHeight * scaleValue
                          });
                        }}
                        className="w-full h-8 text-sm"
                        step="0.01"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                {/* Position Controls */}
                <div className="space-y-3 border-t pt-3">
                  {/* Position Left */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Position left</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const current = ((element.x - placeholder.x) / placeholder.width) * 100;
                              const newPercent = Math.max(0, current - 0.1);
                              const newValue = placeholder.x + (placeholder.width * newPercent / 100);
                              onUpdate({ x: newValue });
                            }
                          }}
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={(() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              return (((element.x - placeholder.x) / placeholder.width) * 100).toFixed(2);
                            }
                            return '0';
                          })()}
                          onChange={(e) => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const percent = parseFloat(e.target.value) || 0;
                              const newValue = placeholder.x + (placeholder.width * percent / 100);
                              onUpdate({ x: newValue });
                            }
                          }}
                          className="w-20 h-7 text-xs text-center"
                          step="0.1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const current = ((element.x - placeholder.x) / placeholder.width) * 100;
                              const newPercent = Math.min(100, current + 0.1);
                              const newValue = placeholder.x + (placeholder.width * newPercent / 100);
                              onUpdate({ x: newValue });
                            }
                          }}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Position Top */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Position top</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const current = ((element.y - placeholder.y) / placeholder.height) * 100;
                              const newPercent = Math.max(0, current - 0.1);
                              const newValue = placeholder.y + (placeholder.height * newPercent / 100);
                              onUpdate({ y: newValue });
                            }
                          }}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={(() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              return (((element.y - placeholder.y) / placeholder.height) * 100).toFixed(2);
                            }
                            return '0';
                          })()}
                          onChange={(e) => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const percent = parseFloat(e.target.value) || 0;
                              const newValue = placeholder.y + (placeholder.height * percent / 100);
                              onUpdate({ y: newValue });
                            }
                          }}
                          className="w-20 h-7 text-xs text-center"
                          step="0.1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const placeholder = element.placeholderId
                              ? placeholders.find(p => p.id === element.placeholderId)
                              : null;
                            if (placeholder) {
                              const current = ((element.y - placeholder.y) / placeholder.height) * 100;
                              const newPercent = Math.min(100, current + 0.1);
                              const newValue = placeholder.y + (placeholder.height * newPercent / 100);
                              onUpdate({ y: newValue });
                            }
                          }}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Alignment Buttons */}
                  <div className="space-y-2 pt-2">
                    {/* Horizontal Alignment */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder && element.width) {
                            onUpdate({ x: placeholder.x });
                          }
                        }}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder && element.width) {
                            onUpdate({ x: placeholder.x + (placeholder.width / 2) - (element.width / 2) });
                          }
                        }}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder && element.width) {
                            onUpdate({ x: placeholder.x + placeholder.width - element.width });
                          }
                        }}
                      >
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Vertical Alignment */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder) {
                            onUpdate({ y: placeholder.y });
                          }
                        }}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder && element.height) {
                            onUpdate({ y: placeholder.y + (placeholder.height / 2) - (element.height / 2) });
                          }
                        }}
                      >
                        <ArrowUp className="w-4 h-4" />
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const placeholder = element.placeholderId
                            ? placeholders.find(p => p.id === element.placeholderId)
                            : null;
                          if (placeholder && element.height) {
                            onUpdate({ y: placeholder.y + placeholder.height - element.height });
                          }
                        }}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Show placeholder properties when placeholder is selected
    // if (selectedPlaceholderId && selectedPlaceholder) {
    //   return (
    //     <div className="space-y-6">
    //       <div className="space-y-4">
    //         <h3 className="text-sm font-semibold">Tune Realism</h3>
    //         <div className="space-y-2">
    //           <div>
    //             <div className="flex items-center justify-between mb-1">
    //               <Label className="text-xs">Displacement X</Label>
    //               <span className="text-xs">{displacementSettings.scaleX}</span>
    //             </div>
    //             <Slider
    //               value={[displacementSettings.scaleX]}
    //               onValueChange={([value]) => {
    //                 onDisplacementSettingsChange({
    //                   ...displacementSettings,
    //                   scaleX: value
    //                 });
    //               }}
    //               min={0}
    //               max={100}
    //               step={1}
    //             />
    //           </div>
    //           <div>
    //             <div className="flex items-center justify-between mb-1">
    //               <Label className="text-xs">Displacement Y</Label>
    //               <span className="text-xs">{displacementSettings.scaleY}</span>
    //             </div>
    //             <Slider
    //               value={[displacementSettings.scaleY]}
    //               onValueChange={([value]) => {
    //                 onDisplacementSettingsChange({
    //                   ...displacementSettings,
    //                   scaleY: value
    //                 });
    //               }}
    //               min={0}
    //               max={100}
    //               step={1}
    //             />
    //           </div>
    //           <div>
    //             <div className="flex items-center justify-between mb-1">
    //               <Label className="text-xs">Fold Contrast</Label>
    //               <span className="text-xs">{displacementSettings.contrastBoost.toFixed(1)}</span>
    //             </div>
    //             <Slider
    //               value={[displacementSettings.contrastBoost]}
    //               onValueChange={([value]) => {
    //                 onDisplacementSettingsChange({
    //                   ...displacementSettings,
    //                   contrastBoost: value
    //                 });
    //               }}
    //               min={1}
    //               max={5}
    //               step={0.1}
    //             />
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }

    // Final fallback logic
    const hasElementsInActivePlaceholder = selectedPlaceholderId ? elements.some(el => el.placeholderId === selectedPlaceholderId) : false;

    if (selectedPlaceholderId && hasElementsInActivePlaceholder) {
      return null; // Don't show "No Selection" if elements exist in the placeholder
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6 ring-1 ring-border/50 shadow-sm">
          <Settings2 className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-2 px-8">
          <h3 className="font-bold text-xl tracking-tight text-foreground">No Selection</h3>
          <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
            Select an element on the canvas to customize its appearance, size, and position.
          </p>
        </div>
      </div>
    );
  };

const LayersPanel: React.FC<{
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number; original: Placeholder }>;
  selectedPlaceholderId: string | null;
  onSelectPlaceholder: (id: string | null) => void;
  designUrlsByPlaceholder: Record<string, string>;
  onDesignRemove: (placeholderId: string) => void;
  elements: CanvasElement[];
  selectedIds: string[];
  onSelectElement: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
  onReorder: (newOrder: CanvasElement[]) => void;
  // Props for Mobile Properties Integration
  isMobile?: boolean;
  displacementSettings?: DisplacementSettings;
  onDisplacementSettingsChange?: (settings: DisplacementSettings) => void;
  onDesignUpload?: (placeholderId: string, designUrl: string) => void;
  PX_PER_INCH?: number;
  canvasPadding?: number;
}> = ({
  placeholders,
  selectedPlaceholderId,
  onSelectPlaceholder,
  designUrlsByPlaceholder,
  onDesignRemove,
  elements,
  selectedIds,
  onSelectElement,
  onUpdate,
  onDelete,
  onReorder,
  isMobile = false,
  displacementSettings,
  onDisplacementSettingsChange,
  onDesignUpload,
  PX_PER_INCH = 96,
  canvasPadding = 0,
}) => {
    const elementsByPlaceholder = useMemo(() => {
      const grouped: Record<string, CanvasElement[]> = {};
      elements.forEach(el => {
        const pid = el.placeholderId || 'unassigned';
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(el);
      });
      return grouped;
    }, [elements]);

    const displayedElements = selectedPlaceholderId
      ? elements.filter(e => e.placeholderId === selectedPlaceholderId)
      : isMobile
        ? elements.filter(e => !e.placeholderId) // On mobile, only show unassigned elements in the main list
        : elements;

    return (
      <div className="space-y-4">
        {/* Placeholders Section */}
        {placeholders.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase text-muted-foreground">Placeholders</Label>
            <div className="space-y-2">
              <Accordion type="single" collapsible className="space-y-2">
                {placeholders.map((placeholder) => {
                  const designUrl = designUrlsByPlaceholder[placeholder.id];
                  const isSelected = selectedPlaceholderId === placeholder.id;
                  const baseColor = placeholder.original.color || '#f472b6';

                  return (
                    <AccordionItem
                      key={placeholder.id}
                      value={placeholder.id}
                      className="border rounded-lg px-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        {isMobile ? (
                          <AccordionTrigger
                            className="flex-1 py-3 px-0 hover:no-underline"
                            onClick={() => onSelectPlaceholder(placeholder.id)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <div
                                className="w-8 h-8 rounded border flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${baseColor}40`, borderColor: baseColor }}
                              >
                                {designUrl ? (
                                  <img src={designUrl} alt="Design" className="w-full h-full object-contain rounded" />
                                ) : (
                                  <Square className="w-4 h-4" style={{ color: baseColor }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {placeholder.original.name || `Placeholder ${placeholder.id.slice(0, 8)}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {placeholder.original.widthIn.toFixed(1)}" × {placeholder.original.heightIn.toFixed(1)}"
                                  {designUrl && ' • Design'}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                        ) : (
                          <div
                            className="flex items-center gap-2 flex-1 min-w-0 py-3 cursor-pointer"
                            onClick={() => onSelectPlaceholder(placeholder.id)}
                          >
                            <div
                              className="w-8 h-8 rounded border flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${baseColor}40`, borderColor: baseColor }}
                            >
                              {designUrl ? (
                                <img src={designUrl} alt="Design" className="w-full h-full object-contain rounded" />
                              ) : (
                                <Square className="w-4 h-4" style={{ color: baseColor }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {placeholder.original.name || `Placeholder ${placeholder.id.slice(0, 8)}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {placeholder.original.widthIn.toFixed(1)}" × {placeholder.original.heightIn.toFixed(1)}"
                                {designUrl && ' • Design'}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {!isMobile && designUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDesignRemove(placeholder.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <AccordionContent className="pt-2 border-t mt-1">
                        {isMobile && elementsByPlaceholder[placeholder.id]?.length > 0 && (
                          <div className="mb-4 space-y-2">
                            <Accordion type="single" collapsible className="space-y-1">
                              {elementsByPlaceholder[placeholder.id]
                                .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                                .map((element) => (
                                  <AccordionItem key={element.id} value={element.id} className="border rounded-md px-0 overflow-hidden bg-muted/20">
                                    <AccordionTrigger
                                      className="py-2 px-3 hover:no-underline text-left"
                                      onClick={() => onSelectElement(element.id)}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {element.type === 'image' && <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                                        {element.type === 'text' && <Type className="w-3.5 h-3.5 flex-shrink-0" />}
                                        {element.type === 'shape' && <Square className="w-3.5 h-3.5 flex-shrink-0" />}
                                        <span className="text-xs font-medium truncate">
                                          {element.type === 'text' ? (element.text || 'Text') : (element.name || (element.type === 'image' ? 'Image' : element.shapeType || 'Shape'))}
                                        </span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-1 border-t px-3 pb-3">
                                      <PropertiesPanel
                                        selectedPlaceholderId={null}
                                        placeholders={placeholders}
                                        designUrlsByPlaceholder={designUrlsByPlaceholder}
                                        onDesignUpload={() => { }}
                                        onDesignRemove={() => { }}
                                        displacementSettings={displacementSettings || { scaleX: 10, scaleY: 10, contrastBoost: 1.5 }}
                                        onDisplacementSettingsChange={onDisplacementSettingsChange || (() => { })}
                                        selectedElementIds={[element.id]}
                                        elements={elements}
                                        onElementUpdate={(updates) => onUpdate(element.id, updates)}
                                        onElementDelete={onDelete}
                                        PX_PER_INCH={PX_PER_INCH}
                                        canvasPadding={canvasPadding}
                                      />
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                            </Accordion>
                          </div>
                        )}

                        <div className={isMobile && elementsByPlaceholder[placeholder.id]?.length > 0 ? "pt-4 border-t" : ""}>
                          <PropertiesPanel
                            selectedPlaceholderId={placeholder.id}
                            placeholders={placeholders}
                            designUrlsByPlaceholder={designUrlsByPlaceholder}
                            onDesignUpload={onDesignUpload || (() => { })}
                            onDesignRemove={onDesignRemove}
                            displacementSettings={displacementSettings || { scaleX: 10, scaleY: 10, contrastBoost: 1.5 }}
                            onDisplacementSettingsChange={onDisplacementSettingsChange || (() => { })}
                            selectedElementIds={[]}
                            elements={elements}
                            onElementUpdate={() => { }}
                            onElementDelete={() => { }}
                            PX_PER_INCH={PX_PER_INCH}
                            canvasPadding={canvasPadding}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        )}

        {/* Empty State */}
        {placeholders.length === 0 && elements.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No placeholders or elements</p>
          </div>
        )}
      </div>
    );
  };


// Panel Components - UploadPanel is now imported from shared component

const ShapesPanel: React.FC<{
  onAddShape: (shapeType: CanvasElement['shapeType']) => void;
  onAddAsset?: (assetUrl: string, assetName?: string) => void;
  selectedPlaceholderId: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}> = ({ onAddShape, onAddAsset, selectedPlaceholderId, placeholders }) => {
  const [shapeAssets, setShapeAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Fetch shape assets from API
  useEffect(() => {
    const fetchShapeAssets = async () => {
      setLoadingAssets(true);
      try {
        const params = new URLSearchParams();
        params.append('category', 'shapes');
        params.append('limit', '20');

        const response = await fetch(`${API_BASE_URL}/assets?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setShapeAssets(data.data || []);
        } else {
          console.error('Failed to fetch shape assets:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch shape assets:', error);
        toast.error('Failed to load shape assets');
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchShapeAssets();
  }, []);

  return (
    <div className='flex flex-col gap-4'>
      <div className="p-4 space-y-4">
        {placeholders.length > 1 && (
          <div className="p-3 bg-muted rounded-lg border">
            <Label className="text-xs font-semibold text-foreground mb-1 block">
              {selectedPlaceholderId
                ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
                : 'Select a placeholder on canvas first'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {selectedPlaceholderId
                ? 'Click a shape below to add it to the selected placeholder'
                : 'Click a placeholder on the canvas, then select a shape'}
            </p>
          </div>
        )}
        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
          Basic Shapes
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShape('rect')}
            className="h-16 flex flex-col gap-1"
          >
            <Square className="w-5 h-5" />
            <span className="text-xs">Rectangle</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShape('circle')}
            className="h-16 flex flex-col gap-1"
          >
            <CircleIcon className="w-5 h-5" />
            <span className="text-xs">Circle</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShape('triangle')}
            className="h-16 flex flex-col gap-1"
          >
            <Triangle className="w-5 h-5" />
            <span className="text-xs">Triangle</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShape('star')}
            className="h-16 flex flex-col gap-1"
          >
            <StarIcon className="w-5 h-5" />
            <span className="text-xs">Star</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddShape('heart')}
            className="h-16 flex flex-col gap-1"
          >
            <Heart className="w-5 h-5" />
            <span className="text-xs">Heart</span>
          </Button>
        </div>
      </div>
      <div className='p-2 space-y-4'>
        {placeholders.length > 1 && (
          <div className="p-2 bg-muted rounded-lg border mb-2">
            <Label className="text-xs font-semibold text-foreground mb-1 block">
              {selectedPlaceholderId
                ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
                : 'Select a placeholder on canvas first'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {selectedPlaceholderId
                ? 'Click a shape below to add it to the selected placeholder'
                : 'Click a placeholder on the canvas, then select a shape'}
            </p>
          </div>
        )}
        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
          Uploaded Shapes
        </Label>
        {loadingAssets ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : shapeAssets.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-2 gap-2">
              {shapeAssets.map((asset) => (
                <div
                  key={asset._id}
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (asset.fileUrl && onAddAsset) {
                      onAddAsset(asset.fileUrl, asset.title);
                    } else if (asset.fileUrl) {
                      toast.error('Asset handler not available');
                    }
                  }}
                  title={asset.title}
                >
                  {asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
                      alt={asset.title}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No shape assets found
          </div>
        )}
      </div>
    </div>
  );
};


const GraphicsPanel: React.FC<{
  onAddAsset: (assetUrl: string, assetName?: string) => void;
  selectedPlaceholderId: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}> = ({ onAddAsset, selectedPlaceholderId, placeholders }) => {
  const [graphics, setGraphics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch graphics from API
  useEffect(() => {
    const fetchGraphics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('category', 'graphics');
        if (searchTerm) params.append('search', searchTerm);
        params.append('limit', '50');

        const response = await fetch(`${API_BASE_URL}/assets?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setGraphics(data.data || []);
        } else {
          console.error('Failed to fetch graphics:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch graphics:', error);
        toast.error('Failed to load graphics');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphics();
  }, [searchTerm]);

  return (
    <div className="p-4 space-y-4">
      {placeholders.length > 1 && (
        <div className="p-3 bg-muted rounded-lg border">
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {selectedPlaceholderId
              ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
              : 'Select a placeholder on canvas first'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {selectedPlaceholderId
              ? 'Click a graphic below to add it to the selected placeholder'
              : 'Click a placeholder on the canvas, then select a graphic'}
          </p>
        </div>
      )}
      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
        Graphics
      </Label>

      {/* Search */}
      <Input
        placeholder="Search graphics..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : graphics.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No graphics found
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 gap-2">
            {graphics.map((asset) => (
              <div
                key={asset._id}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (asset.fileUrl) {
                    onAddAsset(asset.fileUrl, asset.title);
                  } else {
                    toast.error('Asset file URL not available');
                  }
                }}
                title={asset.title}
              >
                {asset.previewUrl ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {asset.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

const LogosPanel: React.FC<{
  onAddAsset: (assetUrl: string, assetName?: string) => void;
  selectedPlaceholderId: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}> = ({ onAddAsset, selectedPlaceholderId, placeholders }) => {
  const [logos, setLogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch logos from API
  useEffect(() => {
    const fetchLogos = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('category', 'logos');
        if (searchTerm) params.append('search', searchTerm);
        params.append('limit', '50');

        const response = await fetch(`${API_BASE_URL}/assets?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setLogos(data.data || []);
        } else {
          console.error('Failed to fetch logos:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch logos:', error);
        toast.error('Failed to load logos');
      } finally {
        setLoading(false);
      }
    };

    fetchLogos();
  }, [searchTerm]);

  return (
    <div className="p-4 space-y-4">
      {placeholders.length > 1 && (
        <div className="p-3 bg-muted rounded-lg border">
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {selectedPlaceholderId
              ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
              : 'Select a placeholder on canvas first'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {selectedPlaceholderId
              ? 'Click a logo below to add it to the selected placeholder'
              : 'Click a placeholder on the canvas, then select a logo'}
          </p>
        </div>
      )}
      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
        Logos
      </Label>

      {/* Search */}
      <Input
        placeholder="Search logos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : logos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No logos found
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 gap-2">
            {logos.map((asset) => (
              <div
                key={asset._id}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (asset.fileUrl) {
                    onAddAsset(asset.fileUrl, asset.title);
                  } else {
                    toast.error('Asset file URL not available');
                  }
                }}
                title={asset.title}
              >
                {asset.previewUrl ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {asset.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

interface LibraryPanelProps {
  onAddAsset: (assetUrl: string, assetName?: string) => void;
  selectedPlaceholderId?: string | null;
  placeholders?: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ onAddAsset, selectedPlaceholderId, placeholders = [] }) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('graphics');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { value: 'graphics', label: 'Graphics' },
    { value: 'patterns', label: 'Patterns' },
    { value: 'icons', label: 'Icons' },
    { value: 'shapes', label: 'Shapes' },
    { value: 'logos', label: 'Logos' },
    { value: 'all', label: 'All' }
  ];

  // Fetch assets from API
  useEffect(() => {
    const fetchAssets = async () => {
      // If "All" is selected, don't fetch - use allAssets instead
      if (selectedCategory === 'all') {
        setAssets([]); // Clear assets, we'll use allAssets for display
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (searchTerm) params.append('search', searchTerm);
        params.append('limit', '20');

        const response = await fetch(`${API_BASE_URL}/assets?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setAssets(data.data || []);
        } else {
          console.error('Failed to fetch assets:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error);
        toast.error('Failed to load assets');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    const fetchAllAssets = async () => {
      try {
        // Fetch all assets without category filter - use higher limit for "All" view
        const response = await fetch(`${API_BASE_URL}/assets?limit=200`);
        const data = await response.json();

        if (data.success) {
          setAllAssets(data.data || []);
          console.log(`[LibraryPanel] Fetched ${data.data?.length || 0} total assets`);
        } else {
          console.error('[LibraryPanel] Failed to fetch all assets:', data.message);
          setAllAssets([]);
        }
      } catch (error) {
        console.error('[LibraryPanel] Failed to fetch all assets:', error);
        // Don't show toast for initial load, only show if user explicitly selects "All"
        setAllAssets([]);
      }
    };

    fetchAllAssets();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {placeholders.length > 1 && (
        <div className="p-3 bg-muted rounded-lg border">
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {selectedPlaceholderId
              ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
              : 'Select a placeholder on canvas first'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {selectedPlaceholderId
              ? 'Click an asset below to add it to the selected placeholder'
              : 'Click a placeholder on the canvas, then select an asset'}
          </p>
        </div>
      )}
      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
        Asset Library
      </Label>

      {/* Search */}
      <Input
        placeholder="Search assets..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
            className="text-xs"
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (() => {
        // Determine which assets to display
        const assetsToDisplay = selectedCategory === 'all' ? allAssets : assets;

        // Filter by search term if provided
        const filteredAssets = searchTerm
          ? assetsToDisplay.filter((asset) =>
            asset.title?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          : assetsToDisplay;

        if (filteredAssets.length === 0) {
          return (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No assets found
            </div>
          );
        }

        return (
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((asset) => (
                <div
                  key={asset._id}
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (asset.fileUrl) {
                      onAddAsset(asset.fileUrl, asset.title);
                    } else {
                      toast.error('Asset file URL not available');
                    }
                  }}
                  title={asset.title}
                >
                  {asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
                      alt={asset.title}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        );
      })()}

    </div>
  );
};

interface AssetPanelProps {
  onAddAsset: (assetUrl: string, assetName?: string) => void;
  category: string;
  title: string;
  selectedPlaceholderId: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}

const AssetPanel: React.FC<AssetPanelProps> = ({ onAddAsset, category, title, selectedPlaceholderId, placeholders }) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch assets from API
  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('category', category);
        if (searchTerm) params.append('search', searchTerm);
        params.append('limit', '50');

        const response = await fetch(`${API_BASE_URL}/assets?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setAssets(data.data || []);
        } else {
          console.error(`Failed to fetch ${category} assets:`, data.message);
        }
      } catch (error) {
        console.error(`Failed to fetch ${category} assets:`, error);
        toast.error(`Failed to load ${title.toLowerCase()}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [category, searchTerm, title]);

  return (
    <div className="p-4 space-y-4">
      {placeholders.length > 1 && (
        <div className="p-3 bg-muted rounded-lg border">
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {selectedPlaceholderId
              ? `Placeholder Selected: ${selectedPlaceholderId.slice(0, 8)}...`
              : 'Select a placeholder on canvas first'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {selectedPlaceholderId
              ? `Click a ${title.toLowerCase()} below to add it to the selected placeholder`
              : 'Click a placeholder on the canvas, then select a resource'}
          </p>
        </div>
      )}
      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
        {title}
      </Label>

      {/* Search */}
      <Input
        placeholder={`Search ${title.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      {/* Assets grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No {title.toLowerCase()} found
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                key={asset._id}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (asset.fileUrl) {
                    onAddAsset(asset.fileUrl, asset.title);
                  } else {
                    toast.error('Asset file URL not available');
                  }
                }}
                title={asset.title}
              >
                {asset.previewUrl ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Folder className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {asset.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

const TemplatesPanel: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch text templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/assets?category=textTemplates&limit=20`
        );
        const data = await response.json();

        if (data.success) {
          setTemplates(data.data || []);
        } else {
          console.error('Failed to fetch templates:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
        Templates
      </Label>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-muted rounded-lg border-2 border-dashed flex items-center justify-center">
              <Layout className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="aspect-square bg-muted rounded-lg border-2 border-dashed flex items-center justify-center">
              <Layout className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground py-4">
            No templates available. Upload some in Admin panel.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <div
                key={template._id}
                className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                onClick={() => {
                  toast.info(`Add ${template.title} template functionality coming soon`);
                }}
                title={template.title}
              >
                {template.previewUrl ? (
                  <img
                    src={template.previewUrl}
                    alt={template.title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layout className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {template.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};


export default DesignEditor;

