import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  suggestedColors?: string[];
}

export const ColorPickerPopover = ({ color, onChange, suggestedColors = [] }: ColorPickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <div 
            className="h-5 w-5 rounded border"
            style={{ backgroundColor: color }}
          />
          <span className="flex-1 text-left">{color}</span>
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 bg-background" align="start">
        <div className="space-y-4">
          <div>
            <Label htmlFor="color-input">Farbe wählen</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="color-input"
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-16 h-10 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {suggestedColors.length > 0 && (
            <div>
              <Label>Farben aus Logo</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {suggestedColors.map((suggestedColor) => (
                  <button
                    key={suggestedColor}
                    type="button"
                    onClick={() => {
                      onChange(suggestedColor);
                      setIsOpen(false);
                    }}
                    className="h-10 w-full rounded border-2 hover:border-primary transition-colors relative"
                    style={{ backgroundColor: suggestedColor }}
                  >
                    {color === suggestedColor && (
                      <Check className="h-4 w-4 absolute inset-0 m-auto text-white drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
