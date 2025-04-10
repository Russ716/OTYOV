# Thousand Year Old Vampire

A sophisticated text-based RPG web application that delivers an immersive, adaptive storytelling experience through intelligent character memory management and dynamic gameplay mechanics.

## About the Game

Thousand Year Old Vampire is a digital adaptation of a solo journaling RPG where you play as a vampire who exists across centuries, watching the world change while struggling with memory and identity. As your vampire lives through the ages, you'll:

- Answer prompts that shape your narrative
- Track your Memories, Skills, Resources, Characters, and Marks
- Roll dice to determine which prompts you encounter
- Experience the consequence of immortality as your memories fade and transform

## Key Features

- **Memory Management System**: Limit of 5 active memories with 3 experiences each
- **Diary System**: Archive old memories as your vampire progresses through time
- **Dynamic Prompt System**: Over 220 unique prompts with multiple variations
- **Character Sheet**: Track skills, resources, relationships and marks
- **Dice Rolling**: Integrated d10/d6 dice system to determine story progression
- **Full Authentication**: User accounts to track multiple vampire characters

## Technologies Used

- React frontend with TypeScript
- PostgreSQL database for persistent game state
- Drizzle ORM for database interactions
- Shadcn UI components
- Express backend for API routes

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/thousand-year-old-vampire.git

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with the following:
DATABASE_URL=postgresql://username:password@localhost:5432/tyov

# Run database migrations
npm run db:push

# Start the development server
npm run dev
```

## Game Mechanics

The game follows these core mechanics:

1. **Prompts**: The main driver of the narrative, with dice rolls determining which prompt you receive
2. **Memories**: Limited to 5 at a time, each containing up to 3 experiences
3. **Skills**: Abilities your vampire has acquired, which can be checked off (used) once
4. **Resources**: Physical or intangible assets your vampire possesses
5. **Characters**: Mortals or immortals your vampire interacts with
6. **Marks**: Physical signs of your vampire's undead nature

## License

[MIT](LICENSE)