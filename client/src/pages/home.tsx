import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { GameInterface } from "@/components/game-interface";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@db/schema";
import { Loader2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // State to track which character is being deleted
  const [characterToDelete, setCharacterToDelete] = React.useState<Character | null>(null);

  const { data: characters, isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
    enabled: !!user,
    staleTime: 0,
  });
  
  // Mutation for deleting a character
  const deleteCharacterMutation = useMutation({
    mutationFn: async (characterId: number) => {
      const response = await fetch(`/api/character/${characterId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete character');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Update the cache to remove the deleted character
      queryClient.setQueryData<Character[]>(['/api/characters'], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(character => character.id !== data.id);
      });
      
      toast({
        title: 'Character Deleted',
        description: `${data.name} has been permanently deleted.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const handleDeleteCharacter = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    setCharacterToDelete(character);
  };

  const confirmDelete = () => {
    if (characterToDelete) {
      deleteCharacterMutation.mutate(characterToDelete.id);
      setCharacterToDelete(null);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
    }
    // Clear character data on logout
    queryClient.setQueryData(["/api/characters"], null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={characterToDelete !== null} 
        onOpenChange={(open) => !open && setCharacterToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {characterToDelete?.name} and all their history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCharacterMutation.isPending 
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                : <Trash2 className="h-4 w-4 mr-2" />
              }
              {deleteCharacterMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Thousand Year Old Vampire</h1>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome, {user?.username}!</h2>
            <p className="text-muted-foreground">
              Select a vampire to continue their journey, or create a new one.
            </p>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-6 border shadow-sm">
            <h3 className="text-2xl font-bold mb-4">Thousand Year Old Vampire - a game by Tim Hutchings</h3>
            <div className="prose dark:prose-invert max-w-none space-y-4">
              <p>
                Thousand Year Old Vampire is a lonely solo role-playing game in which you chronicle the unlife of a vampire 
                over the many centuries of their existence, beginning with the loss of mortality and ending with their 
                inevitable destruction. This vampire will surprise you as they do things that are unexpected, unpleasant, 
                and sometimes tragic. Making gut-churning decisions, performing irreconcilable acts, and resolving difficult 
                narrative threads are what this game is about as you explore the vampire's human failings, villainous acts, 
                and surprising victories.
              </p>
              <p>
                Game mechanics are simple and intuitive. Play progresses semi-randomly through the Prompt section of this book. 
                Answer Prompts to learn about your vampire's wants and needs, to learn what challenges they face, and to chart 
                their decline into senescence. Build up a character record of Memories and then lose them to the inexorable 
                crush of time. See everyone you've loved and hated grow old and die, then turn to dust.
              </p>
              <div className="bg-black/10 dark:bg-white/10 p-4 rounded-md">
                <h4 className="text-lg font-semibold mb-2">Content Warning</h4>
                <p className="text-sm">
                  While playing this game you will encounter themes of death, selfishness, and predation. Your character may be 
                  injured, victimized, trapped, or killed. Your character will murder and victimize people of all sorts, possibly 
                  including children, animals, loved ones, marginalized people, or themselves. You might find yourself exploring 
                  themes of imperialism, colonialism, or oppression. Characters might engage in self-harm or drug abuse. Illness, 
                  debilitation, and body horror may come into play. Your character may have their memories altered, they will 
                  certainly forget important things. Some of this will emerge from the Prompts, some will emerge from the choices 
                  you make as a player. This is a personal, challenging game for mature adults. Please play hard, but stay aware 
                  of yourself and your feelings.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Character Card */}
            <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => setLocation("/create-character")}>
              <CardHeader className="text-center">
                <CardTitle>Create New Vampire</CardTitle>
                <CardDescription>Begin a new immortal journey</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button variant="outline">Start New Game</Button>
              </CardContent>
            </Card>

            {/* Existing Characters */}
            {Array.isArray(characters) && characters.map((character) => {
              console.log(`Rendering character card:`, 
                { id: character.id, name: character.name });
              
              return (
                <Card 
                  key={character.id}
                  className="hover:border-primary transition-colors cursor-pointer"
                  onClick={() => {
                    console.log(`Clicked character with ID: ${character.id}`);
                    setLocation(`/character/${character.id}`);
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{character.name}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteCharacter(character, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete character</span>
                      </Button>
                    </div>
                    <CardDescription>
                      {character.memories?.[0]?.experiences?.[0]?.text?.slice(0, 100)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Continue Journey</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}