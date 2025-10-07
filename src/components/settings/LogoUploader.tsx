import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Upload, ZoomIn, ZoomOut } from "lucide-react";

interface LogoUploaderProps {
  onLogoProcessed: (blob: Blob, colors: string[]) => void;
  currentLogoUrl?: string;
}

export const LogoUploader = ({ onLogoProcessed, currentLogoUrl }: LogoUploaderProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change triggered");
    const file = e.target.files?.[0];
    console.log("Selected file:", file);
    if (file) {
      console.log("File type:", file.type, "Size:", file.size);
      const reader = new FileReader();
      reader.onload = () => {
        console.log("File loaded successfully");
        setImage(reader.result as string);
        setIsDialogOpen(true);
        console.log("Dialog should open now");
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("No file selected");
    }
  };

  const extractColors = async (imageSrc: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve([]);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const colorMap = new Map<string, number>();

        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip near-white colors (brightness > 240)
          const brightness = (r + g + b) / 3;
          if (brightness > 240) continue;

          // Skip near-black colors (brightness < 15)
          if (brightness < 15) continue;

          // Skip grayscale colors (low saturation)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (saturation < 0.2) continue;

          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }

        // Get all significant colors (sorted by frequency)
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        // Group similar colors together to get distinct colors
        const distinctColors: string[] = [];
        const colorThreshold = 60; // Increased threshold to group more similar colors together
        
        for (const color of sortedColors) {
          const rgb = {
            r: parseInt(color.slice(1, 3), 16),
            g: parseInt(color.slice(3, 5), 16),
            b: parseInt(color.slice(5, 7), 16)
          };
          
          const isSimilar = distinctColors.some(existingColor => {
            const existingRgb = {
              r: parseInt(existingColor.slice(1, 3), 16),
              g: parseInt(existingColor.slice(3, 5), 16),
              b: parseInt(existingColor.slice(5, 7), 16)
            };
            
            const distance = Math.sqrt(
              Math.pow(rgb.r - existingRgb.r, 2) +
              Math.pow(rgb.g - existingRgb.g, 2) +
              Math.pow(rgb.b - existingRgb.b, 2)
            );
            
            return distance < colorThreshold;
          });
          
          if (!isSimilar) {
            distinctColors.push(color);
          }
          
          // Limit to max 3 distinct colors
          if (distinctColors.length >= 3) break;
        }

        console.log("Extracted distinct colors:", distinctColors);
        resolve(distinctColors);
      };
      img.src = imageSrc;
    });
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;

    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }

        // Set canvas size to desired output size
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas is empty"));
          }
        }, "image/png");
      };
    });
  };

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const colors = await extractColors(image);
      onLogoProcessed(croppedBlob, colors);
      setIsDialogOpen(false);
      setImage(null);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex items-center gap-4">
        <div className="relative">
          {currentLogoUrl ? (
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border">
              <img 
                src={currentLogoUrl} 
                alt="Logo Preview" 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Logo hochladen
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Logo bearbeiten</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
              {image && (
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4" />
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSave}>
              Übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
