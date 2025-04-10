import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Memory, Experience } from "@db/schema";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookMarked, X, Plus } from "lucide-react";
import { nanoid } from 'nanoid';
import { useToast } from "@/hooks/use-toast";

interface MemoryListProps {
  memories: Memory[];
  onUpdate: (memories: Memory[]) => Promise<void>;
  onMoveToDiary: (memory: Memory, diaryName: string) => Promise<void>;
}

export function MemoryList({ memories = [], onUpdate, onMoveToDiary }: MemoryListProps) {
  const [newExperience, setNewExperience] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [diaryDialog, setDiaryDialog] = useState<{isOpen: boolean; memory: Memory | null; name: string}>({
    isOpen: false,
    memory: null,
    name: ""
  });
  const { toast } = useToast();

  const handleAddExperience = async () => {
    if (!newExperience.trim() || !selectedMemoryId) return;

    // Find the selected memory
    const selectedMemory = memories.find(m => m.id === selectedMemoryId);
    
    // Check if this memory already has 3 experiences
    if (selectedMemory && selectedMemory.experiences && selectedMemory.experiences.length >= 3) {
      toast({
        title: "Experience Limit Reached",
        description: "This memory already has the maximum of 3 experiences.",
        variant: "destructive"
      });
      return;
    }

    const experience: Experience = {
      text: newExperience,
      createdAt: new Date().toISOString(),
    };

    const updatedMemories = memories.map(memory => {
      if (memory.id === selectedMemoryId) {
        return {
          ...memory,
          experiences: [...(memory.experiences || []), experience],
        };
      }
      return memory;
    });

    await onUpdate(updatedMemories);
    setNewExperience("");
    setSelectedMemoryId(null);
    
    toast({
      title: "Experience Added",
      description: "Your experience has been added to the memory."
    });
  };

  const handleCreateMemory = async () => {
    const activeMemories = memories.filter(m => !m.strikedOut);
    
    if (activeMemories.length >= 5) {
      // Show warning that we need to strike out an existing memory
      toast({
        title: "Memory Limit Reached",
        description: "You've reached the maximum of 5 memories. You need to strike out an existing memory to create a new one.",
        variant: "destructive"
      });
      return;
    }

    if (!newExperience.trim()) return;

    const newMemory: Memory = {
      id: nanoid(),
      title: `Memory ${memories.length + 1}`,
      experiences: [{
        text: newExperience,
        createdAt: new Date().toISOString(),
      }],
      inDiary: false,
      strikedOut: false,
    };

    await onUpdate([...memories, newMemory]);
    setNewExperience("");
    toast({
      title: "Memory Created",
      description: "Your new memory has been created."
    });
  };

  const handleStrikeOut = async (memoryId: string) => {
    const memoryToStrike = memories.find(m => m.id === memoryId);
    
    if (!memoryToStrike) return;
    
    const updatedMemories = memories.map(memory =>
      memory.id === memoryId
        ? { ...memory, strikedOut: true }
        : memory
    );
    
    await onUpdate(updatedMemories);
    
    toast({
      title: "Memory Lost",
      description: `The memory "${memoryToStrike.title}" has been forgotten.`,
      variant: "default"
    });
  };

  const handleMoveToDiaryClick = (memory: Memory) => {
    setDiaryDialog({
      isOpen: true,
      memory,
      name: ""
    });
  };

  const handleDiaryConfirm = async () => {
    if (diaryDialog.memory && diaryDialog.name.trim()) {
      const memoryName = diaryDialog.memory.title;
      const diaryName = diaryDialog.name.trim();
      
      await onMoveToDiary(diaryDialog.memory, diaryName);
      
      setDiaryDialog({
        isOpen: false,
        memory: null,
        name: ""
      });
      
      toast({
        title: "Memory Preserved",
        description: `The memory "${memoryName}" has been preserved in the diary "${diaryName}".`
      });
    }
  };

  // Handle deleting an individual experience
  const handleDeleteExperience = async (memoryId: string, experienceIndex: number) => {
    // Create a copy of the memories array to work with
    const updatedMemories = [...memories];
    const memoryIndex = updatedMemories.findIndex(m => m.id === memoryId);
    
    if (memoryIndex === -1) return;
    
    const memory = updatedMemories[memoryIndex];
    
    if (!memory.experiences || memory.experiences.length <= experienceIndex) return;
    
    // Filter out the experience at the specified index
    const updatedExperiences = memory.experiences.filter((_: Experience, i: number) => i !== experienceIndex);
    
    // Update the memory with the new experiences array
    updatedMemories[memoryIndex] = {
      ...memory,
      experiences: updatedExperiences
    };
    
    await onUpdate(updatedMemories);
    
    toast({
      title: "Experience Deleted",
      description: "The experience has been removed from the memory."
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {Array.isArray(memories) && memories.map((memory) => (
          <Card
            key={memory.id}
            className={cn(
              "relative",
              memory.strikedOut && "opacity-50",
              memory.inDiary && "border-primary"
            )}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{memory.title}</h3>
                <div className="flex gap-2">
                  {!memory.strikedOut && !memory.inDiary && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveToDiaryClick(memory)}
                        className="h-8 w-8"
                        title="Move to Diary"
                      >
                        <BookMarked className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStrikeOut(memory.id)}
                        className="h-8 w-8 text-destructive"
                        title="Strike Out Memory"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {Array.isArray(memory.experiences) && memory.experiences.map((exp, i) => (
                  <div 
                    key={i}
                    className="flex justify-between items-start group"
                  >
                    <p
                      className={cn(
                        "text-sm flex-1 pr-2",
                        memory.strikedOut && "line-through"
                      )}
                    >
                      {exp.text}
                    </p>
                    {!memory.strikedOut && !memory.inDiary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExperience(memory.id, i)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Experience"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {Array.isArray(memory.experiences) && memory.experiences.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No experiences yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex space-x-2">
        <Input
          value={newExperience}
          onChange={(e) => setNewExperience(e.target.value)}
          placeholder="Write an experience..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (selectedMemoryId) {
                handleAddExperience();
              } else {
                handleCreateMemory();
              }
            }
          }}
        />
        <Button 
          onClick={() => selectedMemoryId ? handleAddExperience() : handleCreateMemory()}
          disabled={!newExperience.trim()}
        >
          <Plus className="h-4 w-4 mr-2" />
          {selectedMemoryId ? "Add to Memory" : "New Memory"}
        </Button>
      </div>
      
      {selectedMemoryId && (
        <div className="text-sm text-muted-foreground flex items-center">
          <span>Adding to: {memories.find(m => m.id === selectedMemoryId)?.title}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2 h-6 text-xs"
            onClick={() => setSelectedMemoryId(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      <Dialog 
        open={diaryDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setDiaryDialog(prev => ({ ...prev, isOpen: false }))
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Diary</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={diaryDialog.name}
              onChange={(e) => setDiaryDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a name for your diary..."
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleDiaryConfirm}
              disabled={!diaryDialog.name.trim()}
            >
              Create Diary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}