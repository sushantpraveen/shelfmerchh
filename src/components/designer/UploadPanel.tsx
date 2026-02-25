import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UploadPanelProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  imagePreview: Array<{ url: string; name: string }> | null;
  onImageClick: (imageUrl: string, assetName?: string) => void;
  selectedPlaceholderId: string | null;
  selectedPlaceholderName?: string | null;
  placeholders: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onFileUpload,
  onUploadClick,
  imagePreview,
  onImageClick,
  selectedPlaceholderId,
  selectedPlaceholderName,
  placeholders,
}) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {placeholders.length > 1 && (
            <div className="p-3 bg-muted rounded-lg border">
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                {selectedPlaceholderId
                  ? `Selected: ${selectedPlaceholderName || selectedPlaceholderId.slice(0, 8)}`
                  : 'Select a placeholder on canvas first'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedPlaceholderId
                  ? 'Click an image below to add it to the selected placeholder'
                  : 'Click a placeholder on the canvas, then select an image'}
              </p>
            </div>
          )}
          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
            Upload Image
          </Label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button
            variant="default"
            className="w-full justify-start gap-2 h-11"
            onClick={onUploadClick}
          >
            <Upload className="w-4 h-4" />
            Choose Files (Multiple)
          </Button>
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
            <p>• Supported formats: PNG, JPG, SVG</p>
            <p>• Max size: 100MB per file</p>
            <p>• Select multiple files at once</p>
          </div>

          {imagePreview && imagePreview.length > 0 && (
            <div className="mt-6">
              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-3 block">
                Uploaded Images ({imagePreview.length})
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {imagePreview.map((item, index: number) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border hover:border-primary cursor-pointer transition-colors group"
                    onClick={() => onImageClick(item.url, item.name)}
                    title={item.name}
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity text-center px-1 truncate w-full">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

