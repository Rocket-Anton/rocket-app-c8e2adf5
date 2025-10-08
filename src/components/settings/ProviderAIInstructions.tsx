import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProviderAIInstructionsProps {
  providerId: string;
  providerName: string;
}

interface Instruction {
  id: string;
  instruction_text: string;
  instruction_category: string;
  created_at: string;
}

const categories = [
  { value: 'general', label: 'Allgemein' },
  { value: 'tone', label: 'Tonalität' },
  { value: 'content', label: 'Inhalt' },
  { value: 'formatting', label: 'Formatierung' },
];

export function ProviderAIInstructions({ providerId, providerName }: ProviderAIInstructionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const { data: instructions, isLoading } = useQuery({
    queryKey: ['provider-ai-instructions', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_ai_instructions')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Instruction[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, text, category }: { id: string; text: string; category: string }) => {
      const { error } = await supabase
        .from('provider_ai_instructions')
        .update({ instruction_text: text, instruction_category: category })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-ai-instructions', providerId] });
      setEditingId(null);
      toast({ title: 'Anweisung aktualisiert' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('provider_ai_instructions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-ai-instructions', providerId] });
      toast({ title: 'Anweisung gelöscht' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ text, category }: { text: string; category: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('provider_ai_instructions')
        .insert({
          provider_id: providerId,
          instruction_text: text,
          instruction_category: category,
          created_by: userData.user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-ai-instructions', providerId] });
      setIsAdding(false);
      setNewText('');
      setNewCategory('general');
      toast({ title: 'Anweisung hinzugefügt' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Hinzufügen', variant: 'destructive' });
    },
  });

  const startEdit = (instruction: Instruction) => {
    setEditingId(instruction.id);
    setEditText(instruction.instruction_text);
    setEditCategory(instruction.instruction_category);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      updateMutation.mutate({ id: editingId, text: editText, category: editCategory });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditCategory('general');
  };

  const handleCreate = () => {
    if (newText.trim()) {
      createMutation.mutate({ text: newText, category: newCategory });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Lädt...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>KI-Datenbank für {providerName}</CardTitle>
          <CardDescription>
            Diese Anweisungen werden automatisch in die KI-Prompts eingefügt, wenn Exposé-Texte für {providerName} generiert werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructions?.map((instruction) => (
            <Card key={instruction.id}>
              <CardContent className="pt-4">
                {editingId === instruction.id ? (
                  <div className="space-y-3">
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Speichern
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {categories.find(c => c.value === instruction.instruction_category)?.label || 'Allgemein'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(instruction)}
                          variant="ghost"
                          size="sm"
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          onClick={() => deleteMutation.mutate(instruction.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm">{instruction.instruction_text}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {isAdding ? (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Neue Anweisung eingeben..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreate} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Speichern
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAdding(false);
                      setNewText('');
                      setNewCategory('general');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Neue Anweisung hinzufügen
            </Button>
          )}

          {!instructions || instructions.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              Noch keine Anweisungen vorhanden. Füge die erste hinzu!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
