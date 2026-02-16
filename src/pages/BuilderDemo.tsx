import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuilderProvider, useBuilder } from '@/contexts/BuilderContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { componentLibrary } from '@/lib/builderComponents';
import { BuilderSection, SectionType } from '@/types/builder';
import { storeApi } from '@/lib/api';
import {
  Undo2,
  Redo2,
  Save,
  Eye,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core/dist/types';
import DraggableSectionItem from '@/components/builder/DraggableSectionItem';
import { cn } from '@/lib/utils';
import SectionSettingsPanel from '@/components/builder/SectionSettingsPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

const previewWidthMap: Record<string, string> = {
  desktop: 'max-w-[1200px]',
  tablet: 'max-w-[760px]',
  mobile: 'max-w-[420px]',
};

const categories = ['layout', 'content', 'commerce', 'marketing'] as const;

const BuilderDemo: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { products } = useData();
  const [store, setStore] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeNameInput, setStoreNameInput] = useState('');
  const {
    builder,
    previewMode,
    setPreviewMode,
    getActivePage,
    addSection,
    removeSection,
    reorderSections,
    updateSection,
    undo,
    redo,
    canUndo,
    canRedo,
    saveDraft,
    publishBuilder,
    loadFromBackend,
    resetBuilder,
    isSaving,
    isPublishing,
    isLoading,
    selectedSectionId,
    setSelectedSection,
    setActivePage,
  } = useBuilder();

  const [showMobileConstraint, setShowMobileConstraint] = useState(false);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 1024) {
        setShowMobileConstraint(true);
      } else {
        setShowMobileConstraint(false);
        setIsPreviewOnly(false);
      }
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const activePage = getActivePage();

  // Find a single shared header section across all pages (Home + Product Page)
  const sharedHeaderSection = useMemo(() => {
    for (const page of builder.pages) {
      const header = page.sections.find((s) => s.type === 'header' && s.visible);
      if (header) return header;
    }
    return null;
  }, [builder.pages]);

  // Load store data from backend
  useEffect(() => {
    const loadStore = async () => {
      if (!storeId) {
        navigate('/stores');
        return;
      }

      try {
        setStoreLoading(true);
        const response = await storeApi.getById(storeId, true);

        if (response.success && response.data) {
          setStore(response.data);
          setStoreNameInput(response.data.storeName || response.data.name || '');
        } else {
          toast.error('Store not found');
          navigate('/stores');
        }
      } catch (error: any) {
        console.error('Error loading store:', error);
        toast.error(error?.message || 'Failed to load store');
        navigate('/stores');
      } finally {
        setStoreLoading(false);
      }
    };

    loadStore();
  }, [storeId, navigate]);

  const handleNameUpdate = async () => {
    if (!store?.id || !storeNameInput.trim() || storeNameInput === store.storeName) return;

    try {
      const newSlug = storeNameInput
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await storeApi.update(store.id, {
        name: storeNameInput,
        storeName: storeNameInput, // Backend might use one or the other
        slug: newSlug
      });

      setStore((prev: any) => ({ ...prev, storeName: storeNameInput, name: storeNameInput, slug: newSlug, subdomain: newSlug }));
      toast.success('Store name updated');
    } catch (error) {
      toast.error('Failed to update store name');
      setStoreNameInput(store.storeName || store.name || '');
    }
  };


  // Load builder data once store is loaded
  useEffect(() => {
    if (store?.id) {
      loadFromBackend(store.id);
    }
  }, [store?.id, loadFromBackend]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activePageType: 'product' | 'home' = activePage?.slug === '/product' ? 'product' : 'home';
  const availableComponents = useMemo(() => {
    return componentLibrary.filter((component) => {
      if (!component.availableOn) return true;
      return component.availableOn.includes(activePageType);
    });
  }, [activePageType]);

  const componentMap = useMemo(() => {
    const map = new Map(availableComponents.map((component) => [component.type, component]));
    return map;
  }, [availableComponents]);

  const sidebarGroups = useMemo(() => {
    if (activePageType === 'product') {
      const groups: Array<{ label: string; components: typeof availableComponents }> = [
        {
          label: 'Header sections',
          components: ['announcement-bar', 'header'].map((type) => componentMap.get(type as SectionType)).filter(
            (component): component is typeof availableComponents[number] => Boolean(component),
          ),
        },
        {
          label: 'Page sections',
          components: ['product-details', 'product-recommendations', 'text', 'newsletter'].map((type) =>
            componentMap.get(type as SectionType),
          ).filter((component): component is typeof availableComponents[number] => Boolean(component)),
        },
        {
          label: 'Footer sections',
          components: ['footer'].map((type) => componentMap.get(type as SectionType)).filter(
            (component): component is typeof availableComponents[number] => Boolean(component),
          ),
        },
      ];

      return groups.filter((group) => group.components.length > 0);
    }

    return categories
      .map((category) => ({
        label: category.charAt(0).toUpperCase() + category.slice(1),
        components: availableComponents.filter((component) => component.category === category),
      }))
      .filter((group) => group.components.length > 0);
  }, [activePageType, availableComponents, componentMap]);

  const sortedSections = useMemo(() => {
    if (!activePage) return [];

    // Exclude any header sections defined directly on the page;
    // instead, always use the shared header section (if any) at the top.
    const pageSections = activePage.sections
      .filter((section) => section.type !== 'header')
      .sort((a, b) => a.order - b.order);

    if (sharedHeaderSection) {
      return [sharedHeaderSection, ...pageSections];
    }

    return pageSections;
  }, [activePage, sharedHeaderSection]);

  const selectedSection = useMemo(
    () => sortedSections.find((section) => section.id === selectedSectionId) ?? null,
    [sortedSections, selectedSectionId]
  );

  useEffect(() => {
    if (selectedSectionId && !sortedSections.find((section) => section.id === selectedSectionId)) {
      setSelectedSection(null);
    }
  }, [sortedSections, selectedSectionId, setSelectedSection]);

  const handleAddSection = (componentType: string) => {
    const component = componentLibrary.find((c) => c.type === componentType);
    if (!component || !activePage) return;

    // Only allow a single header section across all pages
    if (component.type === 'header' && sharedHeaderSection) {
      toast.info('Header is already added. Edit the existing header to change it for all pages.');
      setSelectedSection(sharedHeaderSection.id);
      return;
    }

    const newSection: BuilderSection = {
      id: Math.random().toString(36).slice(2),
      type: component.type,
      order: activePage.sections.length,
      visible: true,
      settings: { ...component.defaultSettings },
      styles: { ...component.defaultStyles },
    };

    addSection(newSection);
    setSelectedSection(newSection.id);
    toast.success(`${component.name} added`);
  };

  const handleSaveDraft = async () => {
    if (store) {
      await saveDraft(store.id);
    }
  };

  const handlePublish = async () => {
    if (store) {
      await publishBuilder(store.id);
    }
  };

  const handleReset = async () => {
    if (store?.id) {
      await resetBuilder(store.id);
    } else {
      await resetBuilder();
    }
  };

  // Check if there's a local draft that hasn't been uploaded to backend
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  useEffect(() => {
    if (store?.id) {
      const draftKey = `store_builder_draft_${store.id}`;
      const localDraft = localStorage.getItem(draftKey);
      setHasLocalDraft(!!localDraft);
    }
  }, [store?.id]);

  const handleImportLocalDraft = async () => {
    if (!store?.id) return;

    const draftKey = `store_builder_draft_${store.id}`;
    const localDraft = localStorage.getItem(draftKey);

    if (!localDraft) {
      toast.info('No local draft found');
      return;
    }

    try {
      const parsed = JSON.parse(localDraft);
      // Save to backend
      await saveDraft(store.id);
      toast.success('Local draft imported to backend');
      // Clear local draft after successful import
      localStorage.removeItem(draftKey);
      setHasLocalDraft(false);
    } catch (e) {
      toast.error('Failed to import local draft');
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedSections.findIndex((section) => section.id === active.id);
      const newIndex = sortedSections.findIndex((section) => section.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sortedSections, oldIndex, newIndex).map((section, index) => ({
        ...section,
        order: index,
      }));

      reorderSections(reordered);
    },
    [reorderSections, sortedSections]
  );

  const handleToggleVisibility = (sectionId: string) => {
    const section = sortedSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { visible: !section.visible });
  };

  const handleRemoveSection = (sectionId: string) => {
    removeSection(sectionId);
    if (selectedSectionId === sectionId) {
      setSelectedSection(null);
    }
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<BuilderSection>) => {
    updateSection(sectionId, updates);
  };

  if (storeLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading store builder…</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <p className="text-muted-foreground">Store not found</p>
          <Button onClick={() => navigate('/stores')}>Back to stores</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 overflow-x-hidden">
      {/* Top Toolbar */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="px-4 lg:px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/stores')} className="px-2 lg:px-4">
                <ArrowLeft className="h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">Back to stores</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">Store builder</p>
                <Input
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  onBlur={handleNameUpdate}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()}
                  className="h-7 w-full sm:w-[200px] text-base lg:text-lg font-semibold px-2 -ml-2 border-transparent hover:border-input focus:border-input bg-transparent truncate"
                />
              </div>
            </div>
          </div>
          {!isPreviewOnly && (
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end overflow-x-auto pb-1 lg:pb-0">
              <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 mx-2" />
              {hasLocalDraft && (
                <Button variant="outline" size="sm" onClick={handleImportLocalDraft}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import local draft
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {isPublishing ? 'Publishing…' : 'Publish'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all customizations?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reset all customizations? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      Yes, reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Restriction Overlay */}
      {showMobileConstraint && !isPreviewOnly && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Monitor className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Desktop experience required</h2>
              <p className="text-muted-foreground text-balance">
                Store customization is available only on tablet or computer for a better editing experience.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setIsPreviewOnly(true);
                  setPreviewMode('mobile');
                }}
                size="lg"
                className="w-full font-semibold shadow-lg shadow-primary/20"
              >
                Continue in preview mode
              </Button>
              <Button variant="ghost" onClick={() => navigate('/stores')} className="w-full">
                Back to stores
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        {/* Component library - Hidden in preview-only mode */}
        {!isPreviewOnly && (
          <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r bg-card flex flex-col h-[300px] lg:h-full">
            <div className="px-5 py-4 border-b shrink-0">
              <h2 className="text-sm font-semibold">Components</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Click to add to page.
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-5 py-4 space-y-6">
                {sidebarGroups.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span>{group.label}</span>
                      <Separator className="flex-1 ml-3" />
                    </div>
                    <div className="space-y-2">
                      {group.components.map((component) => (
                        <Button
                          key={component.type}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => handleAddSection(component.type)}
                        >
                          <span className="font-medium">{component.name}</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="px-5 py-4 border-t text-xs text-muted-foreground space-y-1 hidden lg:block">
              <p>
                Sections: <span className="font-semibold">{sortedSections.length}</span>
              </p>
              <p>Draft saved locally until you publish.</p>
            </div>
          </aside>
        )}

        {/* Canvas and preview */}
        <main className="flex-1 flex flex-col min-h-0 bg-muted/20">
          <div className="border-b bg-background px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Page preview</h2>
              <p className="text-xs text-muted-foreground">
                {activePage?.name || 'No page selected'} • {sortedSections.length} sections
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Select
                value={activePage?.id}
                onValueChange={(value) => {
                  setSelectedSection(null);
                  setActivePage(value);
                }}
              >
                <SelectTrigger className="w-40 lg:w-48 shrink-0">
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  {builder.pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                {(['desktop', 'tablet', 'mobile'] as const).map((mode) => {
                  const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
                  return (
                    <Button
                      key={mode}
                      size="sm"
                      variant={previewMode === mode ? 'default' : 'outline'}
                      onClick={() => setPreviewMode(mode)}
                      className={cn(
                        "px-2 lg:px-3",
                        previewMode === mode && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                    </Button>
                  );
                })}
              </div>
              {isPreviewOnly && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                  Preview only
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-8 flex justify-center items-start">
            <div
              className={cn(
                'w-full transition-all duration-300 relative',
                previewWidthMap[previewMode],
                previewMode !== 'desktop' && 'border-8 border-slate-800 rounded-[3rem] shadow-2xl bg-white overflow-hidden my-4 h-[750px] max-h-[85vh] flex flex-col shrink-0'
              )}
            >
              {/* Device Frame Header for Mobile/Tablet */}
              {previewMode !== 'desktop' && (
                <div className="h-6 w-full bg-slate-800 flex items-center justify-center shrink-0">
                  <div className="w-16 h-1 bg-slate-700 rounded-full" />
                </div>
              )}

              <div className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-4 w-full",
                previewMode === 'desktop' ? "" : "scrollbar-hide"
              )}>
                <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm z-10 py-2">
                  <div className="flex items-center gap-2 text-[10px] lg:text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] scale-90 lg:scale-100">{store.storeName}</Badge>
                    <span className="hidden sm:inline">Preview</span>
                  </div>
                  {!isPreviewOnly && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddSection('hero')}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add hero
                    </Button>
                  )}
                </div>

                {sortedSections.length > 0 ? (
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={sortedSections.map((section) => section.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {sortedSections.map((section) => (
                          <DraggableSectionItem
                            key={section.id}
                            section={section}
                            products={products}
                            previewMode={previewMode}
                            globalStyles={builder.globalStyles}
                            onEdit={() => setSelectedSection(section.id)}
                            onRemove={handleRemoveSection}
                            onToggleVisibility={handleToggleVisibility}
                            onSelect={() => setSelectedSection(section.id)}
                            isSelected={selectedSectionId === section.id}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="border border-dashed border-muted-foreground/40 rounded-xl bg-background py-16 flex flex-col items-center justify-center text-center px-4">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                        <Plus className="h-3 w-3" />
                        Start building
                      </div>
                      <h3 className="text-xl font-semibold">Add your first section</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Choose a component from the left to start.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button size="sm" onClick={() => handleAddSection('hero')}>
                          Add hero
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSection('product-grid')}
                        >
                          Add grid
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Device Frame Footer for Mobile/Tablet */}
              {previewMode !== 'desktop' && (
                <div className="h-6 w-full bg-slate-800 shrink-0" />
              )}
            </div>
          </div>
        </main>

        {/* Inspector - Full width on mobile/tablet, 360 wide on desktop */}
        <aside className={cn(
          "w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l bg-card flex flex-col h-[400px] lg:h-full transition-transform duration-300",
          (!selectedSectionId || isPreviewOnly) && "hidden lg:flex lg:opacity-50 lg:pointer-events-none"
        )}>
          <div className="px-5 py-4 border-b shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Section settings</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize selected section.
              </p>
            </div>
            {/* Close button for inspector on mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSelectedSection(null)}
            >
              Done
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SectionSettingsPanel
              section={selectedSection}
              onUpdate={(updates) => {
                if (selectedSection) {
                  handleUpdateSection(selectedSection.id, updates);
                }
              }}
              onRemove={() => {
                if (selectedSection) {
                  handleRemoveSection(selectedSection.id);
                }
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

const BuilderDemoPage: React.FC = () => {
  return (
    <BuilderProvider>
      <BuilderDemo />
    </BuilderProvider>
  );
};

export default BuilderDemoPage;
