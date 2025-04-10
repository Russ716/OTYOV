import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { Character, Prompt, Memory } from "@db/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, SaveAll } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Enhanced PromptHistory type that includes joined fields from the prompt
interface EnhancedPromptHistory {
  id: number;
  characterId: number;
  promptId: number;
  promptNumber: number;
  promptLetter: string;
  diceRoll: { d10: number; d6: number };
  response: string;
  createdAt: string | Date;
  // Additional fields from the join
  promptContent?: string;
}

interface PromptSystemProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => Promise<void>;
}

export function PromptSystem({ character, onUpdate }: PromptSystemProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [response, setResponse] = useState("");
  // Always start with defaults if character values are null
  const [localPromptNumber, setLocalPromptNumber] = useState<number>(character.currentPrompt || 1);
  const [localPromptLetter, setLocalPromptLetter] = useState<string>(character.currentLetter || 'a');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for memory selection dialog
  const [memoryDialog, setMemoryDialog] = useState<{
    isOpen: boolean;
    experience: string | null;
    selectedMemoryId: string | null;
  }>({
    isOpen: false,
    experience: null,
    selectedMemoryId: null
  });

  // Initialize and update local prompt state when character data changes
  useEffect(() => {
    if (character.currentPrompt) {
      console.log(`Setting local prompt number to ${character.currentPrompt}`);
      setLocalPromptNumber(character.currentPrompt);
    }
    if (character.currentLetter) {
      console.log(`Setting local prompt letter to ${character.currentLetter}`);
      setLocalPromptLetter(character.currentLetter);
    }
  }, [character.currentPrompt, character.currentLetter]);

  // Fetch current prompt using the local state to ensure reactivity
  const { data: currentPrompt, isLoading: promptLoading } = useQuery<Prompt>({
    queryKey: ["/api/prompts", localPromptNumber, localPromptLetter],
    queryFn: async () => {
      console.log(`Fetching prompt: ${localPromptNumber}${localPromptLetter}`);
      try {
        const res = await fetch(`/api/prompts/${localPromptNumber}/${localPromptLetter}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        const data = await res.json();
        console.log("Received prompt:", data);
        return data;
      } catch (error) {
        console.error(`Error fetching prompt ${localPromptNumber}${localPromptLetter}:`, error);
        
        // Return a fallback prompt instead of crashing
        return {
          id: -1,
          promptNumber: localPromptNumber,
          promptLetter: localPromptLetter,
          entry: "error",
          content: "Error loading prompt. Please try refreshing the page.",
          isPlaceholder: true
        } as Prompt;
      }
    },
    enabled: !!localPromptNumber,
    staleTime: 0,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Fetch prompt history for this character
  const { data: promptHistory, isLoading: historyLoading } = useQuery<EnhancedPromptHistory[]>({
    queryKey: ["/api/prompt-history", character.id],
    queryFn: async () => {
      // Add character name to logs to verify correct character being used
      console.log(`Fetching history for character ID: ${character.id}`, 
        `Name: ${character.name}`);
      
      try {
        const res = await fetch(`/api/prompt-history/${character.id}`, {
          credentials: 'include',
          // Add cache busting parameter to prevent browser caching
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Error fetching history for ${character.id}:`, errorText);
          throw new Error(errorText);
        }
        
        const data = await res.json();
        console.log(`Received ${data.length} history entries for character ID: ${character.id}`, 
                   `Name: ${character.name}`);
        return data;
      } catch (error) {
        console.error(`Network error fetching history for character ID: ${character.id}:`, error);
        // Return empty array instead of throwing to prevent the app from crashing
        // This will show an empty history section, which is better than a crash
        return [];
      }
    },
    enabled: !!character.id,
    staleTime: 0, // Never consider this data fresh
    refetchOnMount: true, // Always refetch when the component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3, // Retry failed queries up to 3 times
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // Exponential backoff
  });

  // Effect to refetch prompt history when character changes
  useEffect(() => {
    if (character.id) {
      console.log(`Character changed to ID: ${character.id}, name: ${character.name}`);
      console.log("Invalidating queries for character:", character.id);
      
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-history", character.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", localPromptNumber, localPromptLetter] });
    }
  }, [character.id, character.name, localPromptNumber, localPromptLetter, queryClient]);

  const rollDice = async () => {
    setIsRolling(true);
    try {
      if (!response.trim()) {
        throw new Error("Please enter a response before rolling dice");
      }

      const d10 = Math.floor(Math.random() * 10) + 1;
      const d6 = Math.floor(Math.random() * 6) + 1;
      const movement = d10 - d6;

      console.log("Rolling dice:", { d10, d6, movement });

      // Save prompt response and update character
      if (currentPrompt) {
        try {
          const result = await fetch("/api/prompt-history", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            },
            body: JSON.stringify({
              characterId: character.id,
              promptId: currentPrompt.id,
              promptNumber: localPromptNumber, // Use our local state for consistency
              promptLetter: localPromptLetter, // Include the current letter
              diceRoll: { d10, d6 },
              response,
            }),
            credentials: "include",
          });

          if (!result.ok) {
            const errorText = await result.text();
            console.error("Error creating prompt history:", errorText);
            throw new Error(errorText || "Server returned an error");
          }

          const data = await result.json();
          console.log("Prompt history created:", data);

          // Clear response
          setResponse("");

          // Show roll results with any prompt adjustment info
          let toastMessage = `D10: ${d10}, D6: ${d6}, Movement: ${movement}`;
          
          // Use our local state which is guaranteed to be in sync
          const currentPromptValue = localPromptNumber || 1;
          const currentLetterValue = localPromptLetter || 'a';
          
          if (movement === 0) {
            // For equal dice values, we stay at the same prompt number but change letter
            toastMessage += `. Equal dice values, staying at prompt ${data.nextPrompt}${data.nextLetter}`;
          } else {
            toastMessage += `, Moving to prompt ${data.nextPrompt}${data.nextLetter}`;
          }
          
          toast({
            title: "Dice Rolled!",
            description: toastMessage,
          });

          // Update our local state first to ensure UI updates immediately
          setLocalPromptNumber(data.nextPrompt);
          setLocalPromptLetter(data.nextLetter);
          
          // Add response to memory if memory was created
          let characterUpdates: Partial<Character> = { 
            currentPrompt: data.nextPrompt,
            currentLetter: data.nextLetter
          };
          
          // If the server managed to add the experience to a memory, update the memories
          if (data.updatedMemories) {
            characterUpdates.memories = data.updatedMemories;
          }
          
          // Update character in the database
          await onUpdate(characterUpdates);

          // Immediately add the prompt content to the cache to avoid loading state
          if (data.promptInfo) {
            console.log("Pre-loading prompt info into cache:", data.promptInfo);
            queryClient.setQueryData(
              ["/api/prompts", data.nextPrompt, data.nextLetter], 
              data.promptInfo
            );
            
            // Force a refetch of the new prompt to make sure we have it
            queryClient.prefetchQuery({
              queryKey: ["/api/prompts", data.nextPrompt, data.nextLetter],
              queryFn: async () => {
                try {
                  const res = await fetch(`/api/prompts/${data.nextPrompt}/${data.nextLetter}`, {
                    credentials: 'include',
                    headers: {
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache'
                    }
                  });
                  if (!res.ok) throw new Error("Failed to fetch next prompt");
                  const promptData = await res.json();
                  console.log("Pre-fetched next prompt:", promptData);
                  return promptData;
                } catch (error) {
                  console.error("Error pre-fetching next prompt:", error);
                  return data.promptInfo;
                }
              }
            });
          }

          // Force invalidation and refetching of all related queries
          try {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["/api/prompt-history", character.id] }),
              queryClient.invalidateQueries({ queryKey: ["/api/prompts", data.nextPrompt, data.nextLetter] }),
              queryClient.invalidateQueries({ queryKey: ["/api/character", character.id] })
            ]);
          } catch (refetchError) {
            console.error("Error during query invalidation:", refetchError);
            // Don't throw, continue as the main update was successful
          }
        } catch (networkError: any) {
          // Special handling for network-related errors (like connectivity issues)
          console.error("Network error in rollDice:", networkError);
          
          // Keep the response in the field so user doesn't lose their work
          toast({
            variant: "destructive",
            title: "Network Error",
            description: "Unable to connect to the server. Your response has been preserved so you don't lose your work. Please try again when your connection is restored.",
          });
          
          // Don't throw; let the function complete normally but without clearing the response
          return;
        }
      }
    } catch (error: any) {
      console.error("Error in rollDice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unknown error occurred. Your response has been preserved.",
      });
    } finally {
      setIsRolling(false);
    }
  };

  const isLoading = promptLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Function to add an experience to a memory
  const addExperienceToMemory = async () => {
    if (!memoryDialog.experience || !memoryDialog.selectedMemoryId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a memory to save this experience to."
      });
      return;
    }

    // Find the selected memory
    const memories = Array.isArray(character.memories) ? [...character.memories] : [];
    const memoryIndex = memories.findIndex(m => m.id === memoryDialog.selectedMemoryId);
    
    if (memoryIndex === -1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected memory not found."
      });
      return;
    }
    
    const memory = memories[memoryIndex];
    
    // Check if this memory already has 3 experiences
    if (memory.experiences && memory.experiences.length >= 3) {
      toast({
        variant: "destructive",
        title: "Memory Full",
        description: "This memory already has the maximum of 3 experiences. Please select a different memory."
      });
      return;
    }
    
    // Create the new experience
    const newExperience = {
      text: memoryDialog.experience,
      createdAt: new Date().toISOString()
    };
    
    // Add the experience to the memory
    memories[memoryIndex] = {
      ...memory,
      experiences: [...(memory.experiences || []), newExperience]
    };
    
    // Update the character
    try {
      await onUpdate({ memories });
      
      toast({
        title: "Experience Saved",
        description: `The experience has been added to the memory "${memory.title}".`
      });
      
      // Close the dialog
      setMemoryDialog({
        isOpen: false,
        experience: null,
        selectedMemoryId: null
      });
    } catch (error) {
      console.error("Error updating character memories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save the experience. Please try again."
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">
          Prompt {localPromptNumber}{localPromptLetter}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentPrompt && (
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-xl font-medium leading-relaxed text-orange-500 dark:text-orange-400">{currentPrompt.content}</p>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-base font-medium text-foreground">Your Response</h3>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response to this prompt..."
            className="min-h-[120px] text-base"
          />
          <Button 
            onClick={rollDice} 
            disabled={isRolling || !response.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            {isRolling ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Rolling dice...
              </>
            ) : (
              "Roll Dice & Continue"
            )}
          </Button>
        </div>

        {promptHistory && promptHistory.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Previous Responses</h3>
            <div className="space-y-6">
              {[...promptHistory].reverse().map((history) => (
                <div
                  key={history.id}
                  className="rounded-lg border bg-card text-card-foreground p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-xs text-muted-foreground font-medium">
                      Prompt {history.promptNumber}{history.promptLetter}
                    </div>
                    <div className="text-xs bg-muted p-1 rounded text-muted-foreground">
                      <span className="text-orange-500 font-medium">D10: {history.diceRoll.d10}</span> - 
                      <span className="text-blue-500 font-medium"> D6: {history.diceRoll.d6}</span> = 
                      <span className="font-bold"> {history.diceRoll.d10 - history.diceRoll.d6}</span>
                    </div>
                  </div>
                  
                  {/* Show the prompt content if available */}
                  {history.promptContent && (
                    <div className="mb-3 italic text-muted-foreground border-l-2 pl-3 py-1 border-primary/30 text-sm">
                      {history.promptContent}
                    </div>
                  )}
                  
                  <div className="bg-muted/20 p-3 rounded-md whitespace-pre-wrap text-base relative">
                    {history.response}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-50 hover:opacity-100"
                      onClick={() => {
                        // Open memory selection dialog with this experience
                        setMemoryDialog({
                          isOpen: true,
                          experience: history.response,
                          selectedMemoryId: null
                        });
                      }}
                    >
                      <SaveAll className="h-4 w-4 mr-1" />
                      Save to Memory
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Memory Selection Dialog */}
      <Dialog
        open={memoryDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMemoryDialog(prev => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Memory</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">Select a memory to save this experience to:</p>
            
            <RadioGroup
              value={memoryDialog.selectedMemoryId || ""}
              onValueChange={(value) => 
                setMemoryDialog(prev => ({ ...prev, selectedMemoryId: value }))
              }
              className="space-y-3"
            >
              {Array.isArray(character.memories) && 
                character.memories
                  .filter(memory => !memory.strikedOut && !memory.inDiary && 
                           (!memory.experiences || memory.experiences.length < 3))
                  .map(memory => (
                    <div key={memory.id} className="flex items-center space-x-2 border p-3 rounded-md">
                      <RadioGroupItem id={memory.id} value={memory.id} />
                      <Label htmlFor={memory.id} className="flex-1">
                        <div>
                          <div className="font-medium">{memory.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {memory.experiences?.length || 0}/3 experiences
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
              }
              
              {(!Array.isArray(character.memories) || 
                character.memories.filter(memory => !memory.strikedOut && !memory.inDiary && 
                                         (!memory.experiences || memory.experiences.length < 3)).length === 0) && (
                <div className="text-center p-3 text-muted-foreground">
                  No available memories. Create a new memory or make space in an existing one.
                </div>
              )}
            </RadioGroup>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMemoryDialog({ isOpen: false, experience: null, selectedMemoryId: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={addExperienceToMemory}
              disabled={!memoryDialog.selectedMemoryId}
            >
              Save Experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}