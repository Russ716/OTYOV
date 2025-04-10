import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Character, Trait } from "@db/schema";
import { cn } from "@/lib/utils";
import { Check, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CharacterSheetProps {
  character: Character;
  onCheck: (name: string) => void;
  onStrike: (type: keyof Character, name: string) => void;
}

interface TraitListProps {
  title: string;
  traits: Trait[] | null | undefined;
  type: keyof Character;
  canCheck?: boolean;
  onCheck?: (name: string) => void;
  onStrike: (type: keyof Character, name: string) => void;
}

function TraitList({ 
  title, 
  traits, 
  type,
  canCheck = false,
  onCheck,
  onStrike
}: TraitListProps) {
  const items = Array.isArray(traits) ? traits : [];

  // Skills help content
  const skillsHelpContent = `
    Skills describe the capabilities and characteristics of your vampire. They indicate what your vampire can do and what they might do. Swordplay, Relaxing Banter, Operate Heavy Machinery, I Do Not Blink The Sand Away, and I Teach the Nanissáanah are all acceptable Skills. When instructed to record a new Skill you should relate it to the content of the Prompt.

    What will it feel like for a vampire to use a Skill tied to a Memory that has been long lost?

    Some Prompts will instruct you to check a Skill. To do this, place a checkmark next to that skill on your record sheet. Mechanically, this indicates that the Skill has been used. Narratively, a checked Skill gives you something to flavor your answers to later Prompts.

    If unchecked Skills are what your vampire is capable of, checked Skills are what they have done. They are a part of your vampire's being, they are who the vampire is. Of course, it is entirely possible that your vampire might have Skills that you do not want to check. Instead of fighting this, revel in the plight of your humane vampire when they go to help a friend out of a bureaucratic jam and find that the only Skill they can check is Rage and Kill.

    You may only check a Skill once. If you are instructed to lose a Skill, strike it out—it is gone and no longer influences the way your vampire moves through the world.
  `;
  
  // Resources help content
  const resourcesHelpContent = `
    Resources are assets or structures that are useful to your vampire, or items that they value. Knightly equipage, a loyal impi, a diamond tiara, the Castle Umbrecht, a business empire, a lucky penny, a screened-in charabanc, a Roman legion, the silvered key to the potentate's treasure vault, a carboy of acid, a box of tallow candles—all are acceptable and engaging Resources.

    In the Prompts, there will occasionally be reference made to Stationary Resources. These are possessions that cannot be physically hauled away with the vampire when they leave the area. Examples might be a haunted cave, an elephant-sized statue of Set, a chandlery, a hidden pit house, a hereditary title to land.

    When a Prompt instructs you to create Resources, be sure to create Resources that are contextually appropriate even if this leads to Resources that aren't necessarily the most exciting or most useful. When a Prompt causes your vampire to lose a Resource, strike it out. Leave the entry legible because lost things might come back in time.

    Let your available Resources flavor how you write your Experiences. Curry your horse, ply your whip, command your submarine. Let Resources figure prominently when you are made to strike them out; don't just lose your mansion but burn it to the ground, or at least describe a fierce legal battle over the deed.

    Don't limit your vampire's stuff to the Resources listed on the record sheet when answering Prompts. Of course, your rich Flemish vampire will have a fencing foil if one is needed, it's just not a Resource which can be spent to satisfy the mechanical needs of the game. If tools or homes or tombs are needed for narrative color you may create them as needed, just don't write them down.
  `;
  
  // Characters help content
  const charactersHelpContent = `
    Characters are the people with whom your vampire has a relationship. Each Character should be named and described in a sentence fragment, such as Lawrence Hollmueller, a descendant of Baron Hollmueller, or Sister Adelpho, a meddlesome nun. Add more descriptors each time you interact with them in the course of resolving a Prompt. Lawrence, from the previous example, might become Lawrence Hollmueller, a descendant of Baron Hollmueller; I freed him from a Turkish prison.

    If it makes sense to include a Character when resolving a Prompt, do so even if the Prompt doesn't tell you to include a Character. In addition, create a new Character if a Prompt instructs you to include one but none are available.

    A Character can be mortal or immortal; you will be told which type when you are instructed to create a new Character. Mortals are regular human beings or other creatures that die with the passage of time. Immortals, on the other hand, are supernatural beings for whom time has little meaning. They might be other vampires, angels or demons, ghosts, scientific experiments gone wrong, forgotten deities, underground lurkers, meddlesome ancestors, invisible shamblers, softly-spoken animated corpses, household gods or sprites, disembodied heads enduring cursed existences under bell jars, or anything else suitably bizarre.

    Occasionally, you will realize that a Mortal must have died of old age. This might happen every four or five Prompts. When it does, strike out the Character's name. Outside of this, Characters cannot be killed unless a Prompt tells you to do so, but you can otherwise narrate about them as you would like.
  `;
  
  // Marks help content
  const marksHelpContent = `
    A Mark is a visible indication of your vampire's undying state or any other thing that sets them apart from mortal people. An ever-bleeding wound on the throat, eyes that are blank and white, a trailing specter, a ferocious scar, a hollow abdomen full of rats. A Mark is something your vampire carries for their entire existence. When creating a Mark, consider whether your vampire conceals it, and how.

    Example Marks include:
    - A pair of great bat wings— I cut them off with a saw but the stubs remain
    - My eyes are hypnotic so I must wear smoked glasses
    - A dark halo I cover with tall military hats
    - Under the Moon my shadow takes the shape of a jaguar
    - Animals fear me, children cry; I can become a wolf or a rat
    - I have hands with the fingers bent into backward claws, I wear long sleeves to cover them from view
  `;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        
        {type === 'skills' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Skills help</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" side="left">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">About Skills</h4>
                <p>Skills describe the capabilities and characteristics of your vampire. They indicate what your vampire can do and what they might do.</p>
                <p>Some Prompts will instruct you to check a Skill. This indicates the Skill has been used. Checked Skills give you flavor for answers to later Prompts.</p>
                <p>You may only check a Skill once. If you are instructed to lose a Skill, strike it out—it is gone and no longer influences your vampire.</p>
                <p className="text-xs italic text-muted-foreground">What will it feel like for a vampire to use a Skill tied to a Memory that has been long lost?</p>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {type === 'resources' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Resources help</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" side="left">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">About Resources</h4>
                <p>Resources are assets or structures that are useful to your vampire, or items that they value.</p>
                <p>Some Resources are Stationary and cannot be physically hauled away when the vampire leaves the area (like a haunted cave or a hereditary title to land).</p>
                <p>When instructed to create Resources, make them contextually appropriate. When a Prompt causes your vampire to lose a Resource, strike it out.</p>
                <p className="text-xs text-muted-foreground">Let your Resources flavor how you write your Experiences. Don't limit your vampire's possessions to only what's listed here.</p>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {type === 'relationships' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Characters help</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" side="left">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">About Characters</h4>
                <p>Characters are the people with whom your vampire has a relationship. Each should be named and described in a sentence fragment.</p>
                <p>Characters can be mortal (humans who age and die) or immortal (supernatural beings like other vampires, ghosts, or demons).</p>
                <p>Occasionally, you will realize that a Mortal must have died of old age (every 4-5 Prompts). When this happens, strike out the Character's name.</p>
                <p className="text-xs text-muted-foreground">Add more descriptors to Characters each time you interact with them during a Prompt.</p>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {type === 'marks' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Marks help</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" side="left">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold">About Marks</h4>
                <p>A Mark is a visible indication of your vampire's undying state or any other thing that sets them apart from mortal people.</p>
                <p>A Mark is something your vampire carries for their entire existence. When creating a Mark, consider whether your vampire conceals it, and how.</p>
                <p>Examples include hypnotic eyes covered by smoked glasses, bat wing stubs hidden under clothing, or a shadow that takes the shape of a jaguar under the moon.</p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <ScrollArea className="h-32 rounded-md border p-2">
        {items.map((trait, i) => (
          <div
            key={i}
            className={cn(
              "py-1 flex items-center justify-between group",
              trait.strikedOut && "text-muted-foreground line-through italic opacity-60",
              trait.checked && "font-semibold text-primary"
            )}
          >
            <span className="flex items-center gap-2">
              {trait.checked && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              {trait.name}
            </span>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canCheck && onCheck && !trait.checked && !trait.strikedOut && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                  onClick={() => onCheck(trait.name)}
                  title="Mark as experienced"
                >
                  <Check className="h-4 w-4" />
                  <span className="sr-only">Mark as experienced</span>
                </Button>
              )}
              {!trait.strikedOut && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onStrike(type, trait.name)}
                  title="Lose this trait"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Lose {type}</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

export function CharacterSheet({ character, onCheck, onStrike }: CharacterSheetProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{character.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TraitList title="Skills" traits={character.skills} type="skills" canCheck onCheck={onCheck} onStrike={onStrike} />
        <TraitList title="Resources" traits={character.resources} type="resources" onStrike={onStrike} />
        <TraitList title="Characters" traits={character.relationships} type="relationships" onStrike={onStrike} />
        <TraitList title="Marks" traits={character.marks} type="marks" onStrike={onStrike} />
      </CardContent>
    </Card>
  );
}