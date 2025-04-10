import { db } from "../db";
import { prompts } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name for ESM (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PromptEntry {
  promptNumber: number;
  promptLetter: string;
  content: string;
}

function parsePromptsFromFile(filePath: string): PromptEntry[] {
  const data = fs.readFileSync(filePath, 'utf8');
  const fileContent = data.toString();
  
  // Remove the "Prompts" header if present
  const contentWithoutHeader = fileContent.replace(/^Prompts\s*\n\s*\n/i, '');
  
  // Split by empty lines to get blocks
  const blocks = contentWithoutHeader.split(/\n\s*\n\s*\n/);
  
  const promptEntries: PromptEntry[] = [];
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    
    // Split the block into lines
    const lines = block.trim().split('\n');
    
    // The first line should be the prompt identifier (e.g., "1a")
    const firstLine = lines[0].trim();
    // Match patterns like "1a", "10b", "72c" - number followed by one of a, b, or c
    const promptPattern = /^(\d+)([a-c])$/;
    const match = firstLine.match(promptPattern);
    
    if (match) {
      const promptNumber = parseInt(match[1]);
      const promptLetter = match[2];
      
      // The rest of the lines constitute the content
      const content = lines.slice(1).join('\n').trim();
      
      if (content) {
        promptEntries.push({
          promptNumber,
          promptLetter,
          content
        });
        
        console.log(`Parsed prompt ${promptNumber}${promptLetter}, content length: ${content.length} chars`);
      }
    }
  }
  
  // Sort prompts by number and then by letter
  promptEntries.sort((a, b) => {
    if (a.promptNumber !== b.promptNumber) {
      return a.promptNumber - b.promptNumber;
    }
    return a.promptLetter.localeCompare(b.promptLetter);
  });
  
  return promptEntries;
}

async function insertPrompts() {
  try {
    // Path to the prompts file
    const promptsFilePath = path.join(__dirname, '..', 'attached_assets', 'Pasted--Prompts-1a-In-your-blood-hunger-you-destroy-someone-close-to-you-Kill-a-mortal-Character--1744216713331.txt');
    
    // Parse prompts from the file
    const promptEntries = parsePromptsFromFile(promptsFilePath);
    
    console.log(`Found ${promptEntries.length} prompts in the file`);
    
    // Check if we have at least 1 prompt
    if (promptEntries.length === 0) {
      console.error('No prompts found in the file. Check the file format.');
      process.exit(1);
    }

    // Get existing prompts to either update or insert
    const existingPrompts = await db.select().from(prompts);
    console.log(`Found ${existingPrompts.length} existing prompts in the database`);
    
    // Map of existing prompts for quick lookup
    const existingPromptMap = new Map();
    existingPrompts.forEach(p => {
      const key = `${p.promptNumber}${p.promptLetter}`;
      existingPromptMap.set(key, p);
    });
    
    // Insert or update each prompt
    let insertCount = 0;
    let updateCount = 0;
    
    for (const entry of promptEntries) {
      const key = `${entry.promptNumber}${entry.promptLetter}`;
      const existingPrompt = existingPromptMap.get(key);
      
      if (existingPrompt) {
        // Update existing prompt
        await db.update(prompts)
          .set({
            content: entry.content,
            entry: entry.promptLetter,
          })
          .where(and(
            eq(prompts.promptNumber, entry.promptNumber),
            eq(prompts.promptLetter, entry.promptLetter)
          ));
        
        console.log(`Updated prompt ${entry.promptNumber}${entry.promptLetter}`);
        updateCount++;
      } else {
        // Insert new prompt
        await db.insert(prompts).values({
          promptNumber: entry.promptNumber,
          promptLetter: entry.promptLetter,
          entry: entry.promptLetter, // Use the letter as the entry value
          content: entry.content
        });
        
        console.log(`Inserted prompt ${entry.promptNumber}${entry.promptLetter}`);
        insertCount++;
      }
    }
    
    console.log(`Successfully processed all prompts: ${insertCount} inserted, ${updateCount} updated`);
    
    // Verify that all prompts are now in the database
    const finalPromptCount = await db.select({ count: sql`count(*)` }).from(prompts);
    console.log(`Total prompts in database: ${finalPromptCount[0].count}`);
    
  } catch (error) {
    console.error('Error processing prompts:', error);
  } finally {
    process.exit(0); // Exit the script when done
  }
}

// Run the script
insertPrompts();