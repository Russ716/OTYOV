import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CharacterSheet } from "./character-sheet";
import { MemoryList } from "./memory-list";
import { Character, Trait, Memory } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { nanoid } from 'nanoid';

interface GameInterfaceProps {
  character: Character;
  onSave: (character: Partial<Character>) => Promise<void>;
}

export function GameInterface({ character, onSave }: GameInterfaceProps) {
  const [inputs, setInputs] = useState({
    skill: "",
    resource: "",
    character: "",
    mark: "",
  });
  const { toast } = useToast();

  const updateTrait = (
    traits: Trait[],
    name: string,
    action: "check" | "strike" | "add"
  ): Trait[] => {
    // Safely handle undefined or null traits
    const safeTraits = Array.isArray(traits) ? traits : [];
    
    // Add a new trait
    if (action === "add") {
      return [...safeTraits, { name }];
    }
    
    // Update existing trait
    return safeTraits.map((trait) => {
      if (trait.name === name) {
        if (action === "check") {
          // Toggle checked state
          return { ...trait, checked: true };
        } else if (action === "strike") {
          // Toggle strikedOut state
          return { ...trait, strikedOut: true };
        }
      }
      return trait;
    });
  };

  const handleMemoryUpdate = async (memories: Memory[]) => {
    try {
      await onSave({ memories });
      toast({
        title: "Success",
        description: "Memories updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleMoveToDiary = async (memory: Memory, diaryName: string) => {
    try {
      const updatedMemories = character.memories.map(m =>
        m.id === memory.id ? { ...m, inDiary: true } : m
      );

      const updatedDiary = [...character.diary, memory];
      const updatedResources = [...character.resources, { name: `Diary: ${diaryName}` }];

      await onSave({
        memories: updatedMemories,
        diary: updatedDiary,
        resources: updatedResources,
      });

      toast({
        title: "Success",
        description: "Memory moved to diary",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleAdd = async (type: keyof typeof inputs) => {
    const value = inputs[type];
    if (!value.trim()) return;

    try {
      const updates: Partial<Character> = {};
      switch (type) {
        case "skill":
          updates.skills = updateTrait(character.skills, value, "add");
          break;
        case "resource":
          updates.resources = updateTrait(character.resources, value, "add");
          break;
        case "character":
          updates.relationships = updateTrait(character.relationships, value, "add");
          break;
        case "mark":
          updates.marks = updateTrait(character.marks, value, "add");
          break;
      }

      await onSave(updates);
      setInputs(prev => ({ ...prev, [type]: "" }));

      toast({
        title: "Success",
        description: `Added ${type}: ${value}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleCheck = async (name: string) => {
    try {
      // First make a local copy of the updated skills to show immediate feedback
      const updatedSkills = updateTrait(character.skills, name, "check");
      
      // Save the updated skills to the server
      await onSave({
        skills: updatedSkills,
      });
      
      toast({
        title: "Success",
        description: `Marked skill as experienced: ${name}`,
      });
      
      console.log(`Checked skill: ${name}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleStrike = async (type: keyof Character, name: string) => {
    try {
      const updates: Partial<Character> = {};
      let updatedTraits;
      
      switch (type) {
        case "skills":
          updatedTraits = updateTrait(character.skills, name, "strike");
          updates.skills = updatedTraits;
          break;
        case "resources":
          updatedTraits = updateTrait(character.resources, name, "strike");
          updates.resources = updatedTraits;
          break;
        case "relationships":
          updatedTraits = updateTrait(character.relationships, name, "strike");
          updates.relationships = updatedTraits;
          break;
        case "marks":
          updatedTraits = updateTrait(character.marks, name, "strike");
          updates.marks = updatedTraits;
          break;
      }
      
      // Save the updates to the server
      await onSave(updates);
      
      // Show a success message
      const typeLabel = type === "relationships" ? "Character" : 
                       type.charAt(0).toUpperCase() + type.slice(1, -1);
      
      toast({
        title: "Success",
        description: `${typeLabel} lost: ${name}`,
      });
      
      console.log(`Struck out ${type} trait: ${name}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="space-y-4">
        <CharacterSheet 
          character={character} 
          onCheck={handleCheck}
          onStrike={handleStrike}
        />
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Add Skill</h3>
                <div className="flex space-x-2">
                  <Input
                    value={inputs.skill}
                    onChange={(e) => setInputs(prev => ({ ...prev, skill: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdd("skill");
                      }
                    }}
                    placeholder="Enter a skill..."
                  />
                  <Button onClick={() => handleAdd("skill")}>Add</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Add Resource</h3>
                <div className="flex space-x-2">
                  <Input
                    value={inputs.resource}
                    onChange={(e) => setInputs(prev => ({ ...prev, resource: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdd("resource");
                      }
                    }}
                    placeholder="Enter a resource..."
                  />
                  <Button onClick={() => handleAdd("resource")}>Add</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Add Character</h3>
                <div className="flex space-x-2">
                  <Input
                    value={inputs.character}
                    onChange={(e) => setInputs(prev => ({ ...prev, character: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdd("character");
                      }
                    }}
                    placeholder="Enter a character..."
                  />
                  <Button onClick={() => handleAdd("character")}>Add</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Add Mark</h3>
                <div className="flex space-x-2">
                  <Input
                    value={inputs.mark}
                    onChange={(e) => setInputs(prev => ({ ...prev, mark: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdd("mark");
                      }
                    }}
                    placeholder="Enter a mark..."
                  />
                  <Button onClick={() => handleAdd("mark")}>Add</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-2xl font-bold mb-4">Memories</h2>
            <MemoryList
              memories={character.memories}
              onUpdate={handleMemoryUpdate}
              onMoveToDiary={handleMoveToDiary}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}