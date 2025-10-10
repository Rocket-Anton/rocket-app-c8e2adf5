import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Upload, User } from "lucide-react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";

interface AvatarUploaderProps {
  onAvatarProcessed: (blob: Blob, sizes: { [key: string]: Blob }) => void;
  currentAvatarUrl?: string | null;
}

export const AvatarUploader = ({ onAvatarProcessed, currentAvatarUrl }: AvatarUploaderProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setIsDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    targetSize: number
  ): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    canvas.width = targetSize;
    canvas.height = targetSize;

    // Draw cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetSize,
      targetSize
    );

    // Apply subtle background blur effect
    ctx.filter = "blur(2px)";
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    
    // Create circular safe area (86% radius)
    const centerX = targetSize / 2;
    const centerY = targetSize / 2;
    const safeRadius = (targetSize / 2) * 0.86;

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > safeRadius) {
          const index = (y * targetSize + x) * 4;
          // Slightly reduce opacity outside safe area
          imageData.data[index + 3] *= 0.95;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          }
        },
        "image/png",
        0.92
      );
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      // Generate all three sizes
      const blob1024 = await getCroppedImg(imageSrc, croppedAreaPixels, 1024);
      const blob800 = await getCroppedImg(imageSrc, croppedAreaPixels, 800);
      const blob400 = await getCroppedImg(imageSrc, croppedAreaPixels, 400);

      onAvatarProcessed(blob1024, {
        "1024": blob1024,
        "800": blob800,
        "400": blob400,
      });

      setIsDialogOpen(false);
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error("Error processing avatar:", error);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Profilbild hochladen
        </Button>
        
        {currentAvatarUrl && (
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
            <img
              src={currentAvatarUrl}
              alt="Current avatar"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        
        {!currentAvatarUrl && (
          <div className="relative h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profilbild zuschneiden</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative h-96 w-full bg-muted">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                  showGrid={false}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Zoom</label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="button" onClick={handleSave}>
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};