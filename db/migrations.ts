import { db } from './index';
import { prompts, promptHistory, characters } from './schema';
import { eq, sql } from 'drizzle-orm';

// This migration script will be used to add the new columns to the database
// and populate them with default values

async function runMigrations() {
  try {
    console.log("Starting database migrations...");
    
    // 1. First, run SQL migrations for adding columns
    await addColumns();
    
    // 2. Update existing prompts with default letter 'a'
    await updateExistingPrompts();
    
    // 3. Update prompt history with the prompt number and letter info
    await updatePromptHistory();
    
    // 4. Update characters with default letter and visited prompts
    await updateCharacters();
    
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

async function addColumns() {
  console.log("Adding new columns to the database tables...");
  
  // Add columns to prompts table if they don't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE prompts ADD COLUMN prompt_letter TEXT NOT NULL DEFAULT 'a';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column prompt_letter already exists in prompts';
      END;
    END $$;
  `);
  
  // Add columns to prompt_history table if they don't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE prompt_history ADD COLUMN prompt_number INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column prompt_number already exists in prompt_history';
      END;
      
      BEGIN
        ALTER TABLE prompt_history ADD COLUMN prompt_letter TEXT;
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column prompt_letter already exists in prompt_history';
      END;
    END $$;
  `);
  
  // Add columns to characters table if they don't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE characters ADD COLUMN current_letter TEXT NOT NULL DEFAULT 'a';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column current_letter already exists in characters';
      END;
      
      BEGIN
        ALTER TABLE characters ADD COLUMN visited_prompts JSONB NOT NULL DEFAULT '[]';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'Column visited_prompts already exists in characters';
      END;
    END $$;
  `);
  
  console.log("Columns added successfully!");
}

async function updateExistingPrompts() {
  console.log("Updating existing prompts with default letter 'a'...");
  
  // Get all prompts
  const allPrompts = await db.select().from(prompts);
  
  // Update all prompts to have letter 'a'
  for (const prompt of allPrompts) {
    await db.update(prompts)
      .set({ promptLetter: 'a' })
      .where(eq(prompts.id, prompt.id));
  }
  
  console.log(`Updated ${allPrompts.length} prompts with default letter 'a'`);
}

async function updatePromptHistory() {
  console.log("Updating prompt history with prompt number and letter information...");
  
  // Get all prompt history
  const allHistory = await db.select().from(promptHistory);
  
  // Update each prompt history entry with prompt number and letter
  for (const history of allHistory) {
    // Get the prompt info
    const [promptInfo] = await db.select()
      .from(prompts)
      .where(eq(prompts.id, history.promptId));
    
    if (promptInfo) {
      await db.update(promptHistory)
        .set({ 
          promptNumber: promptInfo.promptNumber,
          promptLetter: promptInfo.promptLetter || 'a'
        })
        .where(eq(promptHistory.id, history.id));
    }
  }
  
  console.log(`Updated ${allHistory.length} prompt history entries`);
}

async function updateCharacters() {
  console.log("Updating characters with default letter and visited prompts...");
  
  // Get all characters
  const allCharacters = await db.select().from(characters);
  
  for (const character of allCharacters) {
    // Get all history for this character to determine visited prompts
    const characterHistory = await db.select()
      .from(promptHistory)
      .where(eq(promptHistory.characterId, character.id));
    
    // Build visited prompts data
    const visitedPrompts: Array<{promptNumber: number, letters: string[]}> = [];
    
    // Group prompt history by prompt number
    const historyByPrompt = characterHistory.reduce((acc, history) => {
      const promptNum = history.promptNumber;
      if (!acc[promptNum]) {
        acc[promptNum] = [];
      }
      
      if (history.promptLetter && !acc[promptNum].includes(history.promptLetter)) {
        acc[promptNum].push(history.promptLetter);
      }
      
      return acc;
    }, {} as Record<number, string[]>);
    
    // Convert to array format
    for (const [promptNum, letters] of Object.entries(historyByPrompt)) {
      visitedPrompts.push({
        promptNumber: parseInt(promptNum),
        letters: letters
      });
    }
    
    // Update character
    await db.update(characters)
      .set({ 
        currentLetter: 'a',
        visitedPrompts: visitedPrompts
      })
      .where(eq(characters.id, character.id));
  }
  
  console.log(`Updated ${allCharacters.length} characters`);
}

// Export the migration function
export { runMigrations };