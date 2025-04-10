import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { characters, prompts, promptHistory, type SelectUser } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { setupAuth } from "./auth";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/characters", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userCharacters = await db
        .select()
        .from(characters)
        .where(eq(characters.userId, req.user.id));

      console.log("Fetched characters:", userCharacters);
      return res.json(userCharacters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      return res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/character/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const characterId = parseInt(req.params.id);
      console.log(`Fetching character with ID: ${characterId} for user ${req.user.id}`);
      
      if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character ID" });
      }

      // Log all characters to help with debugging
      const allUserCharacters = await db
        .select({ id: characters.id, name: characters.name })
        .from(characters)
        .where(eq(characters.userId, req.user.id));
        
      console.log(`All characters for user ${req.user.id}:`, allUserCharacters);

      // Fixed query to properly filter by ID AND user using and() operator
      const userCharacters = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        );

      console.log(`Query for character ${characterId} returned ${userCharacters.length} results`);
        
      // Take the first result if there is one
      const character = userCharacters.length > 0 ? userCharacters[0] : null;

      if (!character) {
        console.log(`Character with ID ${characterId} not found for user ${req.user.id}`);
        return res.status(404).json({ error: "Character not found" });
      }

      console.log(`Returning character ${characterId}:`, { id: character.id, name: character.name });
      return res.json(character);
    } catch (error) {
      console.error("Error fetching character:", error);
      return res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  app.post("/api/character", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { name, memories, skills, resources, relationships, marks } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const [character] = await db
        .insert(characters)
        .values({
          userId: req.user.id,
          name,
          memories: memories || [],
          skills: skills || [],
          resources: resources || [],
          relationships: relationships || [],
          marks: marks || [],
          diary: [],
          currentPrompt: 1, // Explicitly set to 1
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return res.status(201).json(character);
    } catch (error) {
      console.error("Error creating character:", error);
      return res.status(500).json({ error: "Failed to create character" });
    }
  });

  app.patch("/api/character/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const characterId = parseInt(req.params.id);
      if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character ID" });
      }

      const [character] = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        )
        .limit(1);

      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      console.log(`Updating character ${characterId} with:`, req.body);
      
      // Ensure proper structure of traits if they're being updated
      const updateData = { ...req.body };
      
      // Make sure these are always arrays if provided
      if (updateData.skills) updateData.skills = Array.isArray(updateData.skills) ? updateData.skills : [];
      if (updateData.resources) updateData.resources = Array.isArray(updateData.resources) ? updateData.resources : [];
      if (updateData.relationships) updateData.relationships = Array.isArray(updateData.relationships) ? updateData.relationships : [];
      if (updateData.marks) updateData.marks = Array.isArray(updateData.marks) ? updateData.marks : [];
      
      const [updated] = await db
        .update(characters)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(characters.id, characterId))
        .returning();
        
      console.log(`Character ${characterId} updated successfully`);

      return res.json(updated);
    } catch (error) {
      console.error("Error updating character:", error);
      return res.status(500).json({ error: "Failed to update character" });
    }
  });
  
  app.delete("/api/character/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const characterId = parseInt(req.params.id);
      console.log(`Deleting character with ID: ${characterId} for user ${req.user.id}`);
      
      if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character ID" });
      }

      // First, verify the character belongs to this user
      const [character] = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        )
        .limit(1);
      
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Delete related prompt history first (maintain referential integrity)
      await db
        .delete(promptHistory)
        .where(eq(promptHistory.characterId, characterId));
      
      console.log(`Deleted prompt history for character ${characterId}`);
      
      // Now delete the character
      await db
        .delete(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        );
      
      console.log(`Character ${characterId} deleted successfully`);
      
      return res.status(200).json({ 
        message: "Character deleted successfully",
        id: characterId,
        name: character.name
      });
    } catch (error) {
      console.error("Error deleting character:", error);
      return res.status(500).json({ error: "Failed to delete character" });
    }
  });

  app.get("/api/prompts/:number/:letter?", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const promptNumber = parseInt(req.params.number);
      const promptLetter = req.params.letter || 'a'; // Default to 'a' if not provided
      
      console.log(`Fetching prompt: number=${promptNumber}, letter=${promptLetter}`);
      
      // Get all the prompts first to figure out the max
      const allPrompts = await db
        .select()
        .from(prompts)
        .orderBy(prompts.promptNumber);
        
      if (allPrompts.length === 0) {
        return res.status(404).json({ error: "No prompts available in the database" });
      }
      
      // Try to find the requested prompt with the specific letter
      const prompt = allPrompts.find(p => 
        p.promptNumber === promptNumber && 
        p.promptLetter === promptLetter
      );

      if (prompt) {
        return res.json(prompt);
      }
      
      // If specific letter not found, try to find any prompt with the same number
      const anyPromptWithNumber = allPrompts.find(p => p.promptNumber === promptNumber);
      
      if (anyPromptWithNumber) {
        console.warn(`Prompt ${promptNumber}${promptLetter} not found, but found prompt ${promptNumber}${anyPromptWithNumber.promptLetter}. Using that instead.`);
        return res.json({
          ...anyPromptWithNumber,
          promptLetter, // Override with requested letter
          content: `[This is a placeholder for prompt ${promptNumber}${promptLetter}. Using content from ${promptNumber}${anyPromptWithNumber.promptLetter} for now.]`,
          isPlaceholder: true
        });
      }
      
      // If no prompt with this number found, create a placeholder
      console.warn(`Prompt ${promptNumber}${promptLetter} not found. Creating placeholder content.`);
      
      // Find a fallback prompt to use as a template
      const maxPromptNumber = Math.max(...allPrompts.map(p => p.promptNumber));
      const fallbackPromptNumber = Math.min(maxPromptNumber, 15); // Use 15 or max available
      const fallbackPrompt = allPrompts.find(p => p.promptNumber === fallbackPromptNumber) || allPrompts[0];
      
      // Create a synthetic prompt that indicates content is not yet available
      const placeholder = {
        ...fallbackPrompt,
        promptNumber,
        promptLetter,
        entry: "placeholder",
        content: `[Prompt ${promptNumber}${promptLetter} - Please work with your game master to create content for this prompt]`,
        isPlaceholder: true
      };
      
      return res.json(placeholder);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      return res.status(500).json({ error: "Failed to fetch prompt" });
    }
  });

  app.get("/api/prompt-history/:characterId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const characterId = parseInt(req.params.characterId);
      console.log(`Fetching prompt history for character ID: ${characterId}`);
      
      if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character ID" });
      }

      // Check if the character belongs to the current user
      const [character] = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        )
        .limit(1);

      if (!character) {
        console.log(`Character with ID ${characterId} not found for user ${req.user.id}`);
        return res.status(404).json({ error: "Character not found" });
      }

      console.log(`Found character ${character.name} (ID: ${character.id}), fetching prompt history`);
      
      // Get character history
      const characterHistory = await db
        .select({
          id: promptHistory.id,
          characterId: promptHistory.characterId,
          promptId: promptHistory.promptId,
          promptNumber: promptHistory.promptNumber,
          promptLetter: promptHistory.promptLetter,
          diceRoll: promptHistory.diceRoll,
          response: promptHistory.response,
          createdAt: promptHistory.createdAt,
          // Include prompt info from the prompts table
          promptContent: prompts.content
        })
        .from(promptHistory)
        .leftJoin(prompts, eq(promptHistory.promptId, prompts.id))
        .where(eq(promptHistory.characterId, characterId))
        .orderBy(promptHistory.createdAt);

      console.log(`Returning ${characterHistory.length} prompt history entries for character ID ${characterId}`);
      return res.json(characterHistory);
    } catch (error) {
      console.error("Error fetching prompt history:", error);
      return res.status(500).json({ error: "Failed to fetch prompt history" });
    }
  });

  app.post("/api/prompt-history", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { characterId, promptId, promptNumber, promptLetter, diceRoll, response } = req.body;
      console.log("Creating prompt history:", { characterId, promptId, promptNumber, promptLetter, diceRoll, response });
      
      // Use the promptNumber from the client if provided, as it's more reliable than looking up character.currentPrompt
      // This fixes issues where the local UI state might be more accurate than the database state

      // Verify character ownership
      const [character] = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            eq(characters.userId, req.user.id)
          )
        )
        .limit(1);

      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Get the current prompt for the memory title
      const [currentPromptData] = await db
        .select()
        .from(prompts)
        .where(eq(prompts.id, promptId))
        .limit(1);

      // Calculate next prompt number
      const movement = diceRoll.d10 - diceRoll.d6;
      // Use the promptNumber from the client if available (more reliable), otherwise fall back to character.currentPrompt
      const currentPromptValue = promptNumber || character.currentPrompt;
      // If movement is 0 (same dice values), stay at the current prompt
      let nextPrompt = movement === 0 
        ? currentPromptValue // Stay at current prompt if no movement
        : Math.max(1, currentPromptValue + movement);
      
      // Get the current letter of the prompt
      const currentLetterValue = promptLetter || character.currentLetter || 'a';
      
      // Get all available prompts first to use for logic
      const availablePrompts = await db
        .select()
        .from(prompts)
        .orderBy(prompts.promptNumber);
      
      if (availablePrompts.length === 0) {
        return res.status(500).json({ error: "No prompts available in the database" });
      }
      
      // Initialize nextLetter as 'a' (will be adjusted below based on movement and visit history)
      let nextLetter = 'a';  // Default to 'a' for new number
      let redirectedPrompt = false;
      
      // Check if we've already visited this prompt number before (for handling the letter sequence)
      const visitedEntryForNextPrompt = character.visitedPrompts && character.visitedPrompts.find(
        (p: any) => p.promptNumber === nextPrompt
      );
      
      if (movement === 0) {
        // Same dice, stay at same prompt number but change letter
        // Convert letter to next in sequence (a -> b -> c)
        const letterCode = currentLetterValue.charCodeAt(0);
        nextLetter = String.fromCharCode(letterCode + 1);
        
        // Check if we're already at letter 'c' and need to redirect
        // There's no 'd' variant, so we need to find the next unvisited prompt
        if (currentLetterValue === 'c') {
          console.log(`Letter progression beyond 'c' needed for prompt ${currentPromptValue}, finding next unvisited prompt...`);
          
          // Find the next prompt number that hasn't been fully visited yet
          // Get all prompt numbers
          const allPromptNumbers = availablePrompts.map((p: any) => p.promptNumber);
          
          // Deduplicate them manually without using Set
          const uniquePromptNumbers: number[] = [];
          allPromptNumbers.forEach(num => {
            if (!uniquePromptNumbers.includes(num)) {
              uniquePromptNumbers.push(num);
            }
          });
          
          // Sort them numerically
          const sortedPromptNumbers = uniquePromptNumbers.sort((a, b) => a - b);
          
          console.log(`Available prompt numbers: ${sortedPromptNumbers.join(', ')}`);
          
          // Start looking for the next unvisited prompt, starting from the current one
          let currentIndex = sortedPromptNumbers.indexOf(currentPromptValue);
          if (currentIndex >= 0) {
            let foundNext = false;
            
            // Try to find a prompt number that hasn't been fully visited yet
            for (let i = currentIndex + 1; i < sortedPromptNumbers.length; i++) {
              const candidatePromptNumber = sortedPromptNumbers[i];
              
              // Check if this prompt number has been fully visited (a, b, and c)
              const visitedEntry = character.visitedPrompts.find(
                (p: any) => p.promptNumber === candidatePromptNumber
              );
              
              if (!visitedEntry || visitedEntry.letters.length < 3 || 
                  !visitedEntry.letters.includes('a') || 
                  !visitedEntry.letters.includes('b') || 
                  !visitedEntry.letters.includes('c')) {
                
                // Found a prompt that hasn't been fully visited yet
                nextPrompt = candidatePromptNumber;
                
                // Determine which letter to use based on already visited letters
                if (visitedEntry) {
                  if (!visitedEntry.letters.includes('a')) {
                    nextLetter = 'a';
                  } else if (!visitedEntry.letters.includes('b')) {
                    nextLetter = 'b';
                  } else if (!visitedEntry.letters.includes('c')) {
                    nextLetter = 'c';
                  } else {
                    // Should not happen, but default to 'a' just in case
                    nextLetter = 'a';
                  }
                } else {
                  // Not visited at all, start with 'a'
                  nextLetter = 'a';
                }
                
                console.log(`Redirecting from ${currentPromptValue}c to ${nextPrompt}${nextLetter}`);
                redirectedPrompt = true;
                foundNext = true;
                break;
              }
            }
            
            // If we've exhausted all prompts, use the highest number and increment by one
            if (!foundNext) {
              const highestPromptNumber = sortedPromptNumbers[sortedPromptNumbers.length - 1];
              nextPrompt = highestPromptNumber + 1;
              nextLetter = 'a';
              console.log(`All prompts fully visited, proceeding to new prompt ${nextPrompt}${nextLetter}`);
              redirectedPrompt = true;
            }
          }
        }
      }
      
      // If we're not at the same prompt (meaning the movement wasn't 0) and we're moving to a 
      // prompt we've visited before, we need to check which letter to use next
      if (movement !== 0 && visitedEntryForNextPrompt) {
        console.log(`Moving to a previously visited prompt ${nextPrompt}, determining letter...`);
        
        // Check which letters have been visited already
        const visitedLetters = visitedEntryForNextPrompt.letters || [];
        console.log(`Previously visited letters for prompt ${nextPrompt}: ${visitedLetters.join(', ')}`);
        
        // Check if all letters have been visited - if yes, either pick 'c' or the highest letter
        if (visitedLetters.includes('a') && visitedLetters.includes('b') && visitedLetters.includes('c')) {
          nextLetter = 'c'; // If all letters visited, stick with 'c'
        } 
        // Otherwise pick the next letter in sequence that hasn't been visited
        else if (!visitedLetters.includes('a')) {
          nextLetter = 'a';
        } else if (!visitedLetters.includes('b')) {
          nextLetter = 'b';
        } else if (!visitedLetters.includes('c')) {
          nextLetter = 'c';
        }
        
        console.log(`Selected letter for prompt ${nextPrompt}: ${nextLetter}`);
      }
      
      console.log(`Calculated move from prompt ${currentPromptValue}${currentLetterValue} by ${movement} to prompt ${nextPrompt}${nextLetter}`);

      // Try to find the next prompt with the specific letter
      let nextPromptData = availablePrompts.find(p => 
        p.promptNumber === nextPrompt && 
        p.promptLetter === nextLetter
      );
      
      // If not found, fallback to any prompt with the same number
      if (!nextPromptData) {
        nextPromptData = availablePrompts.find(p => p.promptNumber === nextPrompt);
      }
      
      // If still not found, create a placeholder
      if (!nextPromptData) {
        console.warn(`Warning: Prompt ${nextPrompt}${nextLetter} not found in database. Creating placeholder.`);
        
        // Find the highest available prompt to use as a content fallback
        const maxPromptNumber = Math.max(...availablePrompts.map(p => p.promptNumber));
        const fallbackPromptNumber = Math.min(maxPromptNumber, 15); // Use 15 or max available
        
        // Get data from a fallback prompt but keep the original number
        const fallbackPrompt = availablePrompts.find(p => p.promptNumber === fallbackPromptNumber);
        
        if (fallbackPrompt) {
          // Create a synthetic prompt data with original number but placeholder content
          nextPromptData = {
            ...fallbackPrompt,
            id: fallbackPrompt.id,
            promptNumber: nextPrompt,
            promptLetter: nextLetter,
            content: `[Prompt ${nextPrompt}${nextLetter} - Please work with your game master to create content for this prompt]`
          };
        } else {
          // Extreme fallback if we can't find any prompts at all
          const highestPrompt = availablePrompts[availablePrompts.length - 1];
          nextPromptData = {
            ...highestPrompt,
            promptNumber: nextPrompt,
            promptLetter: nextLetter,
            content: `[Prompt ${nextPrompt}${nextLetter} - Content not yet available]`
          };
        }
        
        console.log(`Created placeholder for prompt ${nextPrompt}${nextLetter}`);
      }

      // Track this prompt in the character's visited prompts
      let visitedPrompts = character.visitedPrompts || [];
      
      // Look for this prompt number in visitedPrompts
      const existingPromptIdx = visitedPrompts.findIndex((p: any) => p.promptNumber === nextPrompt);
      
      if (existingPromptIdx >= 0) {
        // Add letter if it's not already tracked
        if (!visitedPrompts[existingPromptIdx].letters.includes(nextLetter)) {
          visitedPrompts[existingPromptIdx].letters.push(nextLetter);
        }
      } else {
        // Add new entry for this prompt number
        visitedPrompts.push({
          promptNumber: nextPrompt,
          letters: [nextLetter]
        });
      }

      // Get the prompt number and letter for the current history entry
      const currentPromptNumber = promptNumber || character.currentPrompt;
      const currentPromptLetter = promptLetter || character.currentLetter || 'a';

      // Create history entry with the number and letter explicitly set
      const [entry] = await db
        .insert(promptHistory)
        .values({
          characterId,
          promptId,
          promptNumber: currentPromptNumber,
          promptLetter: currentPromptLetter,
          diceRoll,
          response,
          createdAt: new Date(),
        })
        .returning();

      console.log("Created prompt history entry:", entry);
      
      // Now handle memory and experience creation
      // Create a new experience from the response
      const newExperience = {
        text: response,
        createdAt: new Date().toISOString(),
      };
      
      // Define memory title based on the prompt
      const promptTitle = currentPromptData ? 
        `Prompt ${currentPromptNumber}${currentPromptLetter}: ${currentPromptData.content.substring(0, 30)}...` : 
        `Response to Prompt ${currentPromptNumber}${currentPromptLetter}`;
        
      // Get current memories from character
      let memories = Array.isArray(character.memories) ? [...character.memories] : [];
      let memoryUpdated = false;
      let updatedMemories = null;
      
      // First try to find an existing memory that's not full (< 3 experiences) and not in a diary
      const existingMemoryIndex = memories.findIndex(memory => 
        !memory.inDiary && 
        !memory.strikedOut && 
        Array.isArray(memory.experiences) && 
        memory.experiences.length < 3
      );
      
      if (existingMemoryIndex >= 0) {
        // Add experience to existing memory
        memories[existingMemoryIndex].experiences.push(newExperience);
        memoryUpdated = true;
        console.log(`Added experience to existing memory: ${memories[existingMemoryIndex].title}`);
      } else {
        // Need to create a new memory
        // Check if we have less than 5 unstriked memories
        const activeMemoriesCount = memories.filter(m => !m.strikedOut).length;
        
        if (activeMemoriesCount < 5) {
          // We can add a new memory
          const newMemory = {
            id: Math.random().toString(36).substring(2, 15), // Simple ID generation
            title: promptTitle,
            experiences: [newExperience],
            inDiary: false,
            strikedOut: false,
          };
          
          memories.push(newMemory);
          memoryUpdated = true;
          console.log(`Created new memory: ${newMemory.title}`);
        } else {
          // We would need to strike out an existing memory
          // We'll let the client handle this as it requires user choice
          console.log("Character has 5 active memories already, client will handle memory management");
        }
      }
      
      if (memoryUpdated) {
        updatedMemories = memories;
      }
      
      // Update character with new memory/experience and update prompt tracking
      const updateData: any = {
        currentPrompt: nextPrompt,
        currentLetter: nextLetter,
        visitedPrompts: visitedPrompts,
        updatedAt: new Date(),
      };
      
      // Only update memories if they changed
      if (updatedMemories) {
        updateData.memories = updatedMemories;
      }
      
      const [updated] = await db
        .update(characters)
        .set(updateData)
        .where(eq(characters.id, characterId))
        .returning();

      console.log("Updated character:", {
        currentPrompt: updated.currentPrompt,
        currentLetter: updated.currentLetter,
        visitedPrompts: updated.visitedPrompts,
        memoriesUpdated: memoryUpdated
      });

      return res.status(201).json({ 
        ...entry, 
        nextPrompt,
        nextLetter,
        previousPrompt: currentPromptValue,
        previousLetter: currentLetterValue,
        movement,
        promptInfo: nextPromptData || null,
        updatedMemories: memoryUpdated ? updatedMemories : null
      });
    } catch (error) {
      console.error("Error creating prompt history:", error);
      return res.status(500).json({ error: "Failed to create prompt history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}