import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { GameInterface } from "@/components/game-interface";
import { PromptSystem } from "@/components/prompt-system";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@db/schema";
import { Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function CharacterPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const characterId = params.id;
  const queryClient = useQueryClient();

  // This effect runs when characterId changes to clear any cached prompt history
  // from a previous character
  useEffect(() => {
    if (characterId) {
      console.log(`Character ID changed in URL to: ${characterId}, clearing old data`);
      
      // Clear all previous character data from cache
      queryClient.removeQueries({ queryKey: ["/api/prompt-history"] });
    }
  }, [characterId, queryClient]);

  const { data: character, isLoading, error } = useQuery<Character>({
    queryKey: ["/api/character", characterId],
    queryFn: async () => {
      console.log(`Fetching character data for ID: ${characterId}`);
      
      // Add cache busting to prevent browser caching
      const response = await fetch(`/api/character/${characterId}?t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching character ${characterId}:`, errorText);
        throw new Error(errorText);
      }

      const characterData = await response.json();
      
      // Verify the character ID matches what we requested
      if (characterData.id.toString() !== characterId) {
        console.error(`Character ID mismatch! Requested ID: ${characterId}, but received ID: ${characterData.id}`);
        throw new Error(`Character ID mismatch error. Please try refreshing the page.`);
      }
      
      console.log(`Successfully received character data for ${characterId}:`, 
        { id: characterData.id, name: characterData.name });
      
      // Clear any stale prompt history data for other characters
      queryClient.removeQueries({ queryKey: ["/api/prompt-history"] });
      
      return characterData;
    },
    enabled: !!characterId && !!user,
    retry: false,
    refetchOnWindowFocus: false,  // Prevent automatic refetching which might override our character data
    staleTime: 0, // Don't cache this at all to ensure fresh data
    refetchOnMount: true // Always refetch when the component mounts
  });

  const handleUpdate = async (updates: Partial<Character>) => {
    try {
      // Log what we're updating for debugging
      console.log("Updating character with:", updates);
      
      const res = await fetch(`/api/character/${characterId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Get the updated character data
      const updatedCharacter = await res.json();
      
      // Update the cache with the fresh data
      queryClient.setQueryData(["/api/character", characterId], updatedCharacter);
      
      // No need for a success toast as the component handlers will show their own toasts
      console.log("Character updated successfully:", updatedCharacter.id);
    } catch (error: any) {
      console.error("Error updating character:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Character</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold">Character not found</h1>
        <p className="text-muted-foreground">The requested character could not be found.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Thousand Year Old Vampire</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Back to Characters
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GameInterface character={character} onSave={handleUpdate} />
          <PromptSystem character={character} onUpdate={handleUpdate} />
        </div>
      </main>
    </div>
  );
}