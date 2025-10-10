import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarEvent } from "@/utils/calendar";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { TimePicker } from "@/components/TimePicker";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
  onSave: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: (id: string) => void;
  projectFilter?: string[];
}

const EVENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export const EventDialog = ({ open, onOpenChange, event, defaultDate, onSave, onDelete, projectFilter }: EventDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [addressData, setAddressData] = useState<{
    address_id: number;
    unit_id?: string;
    project_id?: string;
    display: string;
  } | undefined>();
  const [eventType, setEventType] = useState<'business' | 'personal'>('business');
  const [isAllDay, setIsAllDay] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setDate(new Date(event.start_datetime));
      setStartTime(format(new Date(event.start_datetime), 'HH:mm'));
      setEndTime(format(new Date(event.end_datetime), 'HH:mm'));
      
      // Set address data if exists
      if (event.address_id) {
        setAddressData({
          address_id: event.address_id,
          unit_id: event.unit_id || undefined,
          project_id: event.project_id || undefined,
          display: event.location || ''
        });
      } else {
        setAddressData(undefined);
      }
      
      setEventType(event.category === 'personal' ? 'personal' : 'business');
      setIsAllDay(event.is_all_day);
    } else {
      // Reset for new event
      setTitle('');
      setDescription('');
      setDate(defaultDate || new Date());
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setStartTime(format(nextHour, 'HH:mm'));
      const nextHourEnd = new Date(nextHour);
      nextHourEnd.setHours(nextHourEnd.getHours() + 1);
      setEndTime(format(nextHourEnd, 'HH:mm'));
      setAddressData(undefined);
      setEventType('business');
      setIsAllDay(false);
    }
  }, [event, defaultDate, open]);

  const handleSave = () => {
    if (!title.trim() || !date) {
      return;
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // If all day, set to full day
    if (isAllDay) {
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      start_datetime: startDateTime.toISOString(),
      end_datetime: endDateTime.toISOString(),
      location: addressData?.display || undefined,
      address_id: addressData?.address_id,
      unit_id: addressData?.unit_id,
      project_id: addressData?.project_id,
      category: eventType,
      color: eventType === 'business' ? '#3b82f6' : '#6b7280',
      is_all_day: isAllDay,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] sm:h-[90vh] max-h-[90vh] max-w-[95vw] sm:max-w-md p-0">
        <div className="flex flex-col min-h-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{event ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
          </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 pb-24 touch-pan-y [-webkit-overflow-scrolling:touch]" style={{ overscrollBehavior: 'contain' }}>
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Termin-Titel"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Datum*</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: de }) : <span>Datum wählen</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[10320]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Event Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="event-type">Terminart</Label>
            <Select value={eventType} onValueChange={(value: 'business' | 'personal') => setEventType(value)}>
              <SelectTrigger id="event-type" className="border border-input bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Geschäftlich</SelectItem>
                <SelectItem value="personal">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">Ganztägig</Label>
            <Switch
              id="all-day"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
            />
          </div>

          {/* Time */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-xs sm:text-sm">Von</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {startTime || "00:00"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10320]" align="center" side="bottom">
                    <TimePicker
                      hour={parseInt(startTime.split(':')[0]) || 0}
                      minute={parseInt(startTime.split(':')[1]) || 0}
                      onHourChange={(h) => setStartTime(`${String(h).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`)}
                      onMinuteChange={(m) => setStartTime(`${startTime.split(':')[0] || '00'}:${String(m).padStart(2, '0')}`)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-xs sm:text-sm">Bis</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {endTime || "00:00"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10320]" align="center" side="bottom">
                    <TimePicker
                      hour={parseInt(endTime.split(':')[0]) || 0}
                      minute={parseInt(endTime.split(':')[1]) || 0}
                      onHourChange={(h) => setEndTime(`${String(h).padStart(2, '0')}:${endTime.split(':')[1] || '00'}`)}
                      onMinuteChange={(m) => setEndTime(`${endTime.split(':')[0] || '00'}:${String(m).padStart(2, '0')}`)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Address Autocomplete */}
          <AddressAutocomplete
            value={addressData}
            onChange={setAddressData}
            projectFilter={projectFilter}
          />

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notizen zum Termin..."
              rows={3}
            />
          </div>
        </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t px-6 py-4 gap-2 flex-row justify-between">
          {event && onDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || !date}>
              Speichern
            </Button>
          </div>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};