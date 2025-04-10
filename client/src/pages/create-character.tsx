import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Character } from "@db/schema";
import { nanoid } from "nanoid";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Step = "background" | "mortals" | "traits" | "experiences" | "immortal";

export default function CreateCharacter() {
  const [step, setStep] = useState<Step>("background");
  const [character, setCharacter] = useState<Partial<Character>>({
    name: "",
    skills: [],
    resources: [],
    relationships: [],
    memories: [],
    marks: [],
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [inputs, setInputs] = useState({
    background: "",
    mortal1: "",
    mortal2: "",
    mortal3: "",
    skill1: "",
    skill2: "",
    skill3: "",
    resource1: "",
    resource2: "",
    resource3: "",
    experience1: "",
    experience2: "",
    experience3: "",
    immortal: "",
    mark: "",
  });

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(character),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newCharacter = await response.json();
      console.log("Created character:", newCharacter);

      // Force invalidation of relevant query caches
      await queryClient.invalidateQueries({ queryKey: ["/api/characters"] });

      toast({
        title: "Success",
        description: "Character created successfully",
      });

      // Navigate directly to the new character's page
      setLocation(`/character/${newCharacter.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case "background":
        return (
          <>
            <CardHeader>
              <CardTitle>Create Your Vampire</CardTitle>
              <CardDescription>
                Start by imagining a person in the distant past. Who were they before becoming a vampire?
              </CardDescription>
            </CardHeader>
            <div className="mx-4 mt-2 mb-4 bg-muted/30 rounded-lg p-4 border text-sm">
              <h3 className="font-semibold text-base mb-2">What is a Vampire?</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  The vampire is the character you will follow through the narrative. How they manifest their vampiric nature 
                  is up to you, but Thousand Year Old Vampire makes several assumptions. To get the best experience out of 
                  this game system, your vampire…
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>should prey on human beings for sustenance;</li>
                  <li>should seek to camouflage themselves among those on which they feed;</li>
                  <li>should have been a human once, and still have human needs in one sense or another;</li>
                  <li>should be susceptible to environmental dangers that regular mortals might not care about, such as sunlight;</li>
                  <li>should be practically immortal;</li>
                  <li>should be mostly a loner. The Prompts are not necessarily geared toward complex political machinations between factions of immortal beings.</li>
                </ul>
                <div className="border-t pt-3 mt-2">
                  <h4 className="font-semibold">Vampire Creation</h4>
                  <p className="mt-1">
                    Start by imagining a person in the distant past—a Roman emperor, a Mesopotamian midwife, a French knight. 
                    This person will become your vampire. Imagine when and where they were born and who they were in life.
                  </p>
                  <p className="mt-1">
                    Start with one Experience that encapsulates their history. For instance: <span className="italic">"I am Henri, son of Jon, 
                    born near the Loire Valley in the 13th Century of Our Lord; I am a poor knight swindled out of my inheritance."</span>
                  </p>
                  <p className="mt-1">
                    This first Experience is a broad summary of the vampire's life before becoming an undead thing.
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your vampire's name..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <Textarea
                  id="background"
                  value={inputs.background}
                  onChange={(e) => setInputs(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Describe who they were in life..."
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!character.name || !inputs.background) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Please fill in all fields",
                    });
                    return;
                  }

                  // Create first memory with background
                  setCharacter(prev => ({
                    ...prev,
                    memories: [{
                      id: nanoid(),
                      title: "Origin",
                      experiences: [{
                        text: inputs.background,
                        createdAt: new Date().toISOString(),
                      }],
                      inDiary: false,
                      strikedOut: false,
                    }],
                  }));
                  setStep("mortals");
                }}
              >
                Next
              </Button>
            </CardContent>
          </>
        );

      case "mortals":
        return (
          <>
            <CardHeader>
              <CardTitle>Create Three Mortals</CardTitle>
              <CardDescription>
                Add three mortals who have a relationship with your vampire - relatives, friends, enemies, or mentors.
              </CardDescription>
            </CardHeader>
            <div className="mx-4 mt-2 mb-4 bg-muted/30 rounded-lg p-4 border text-sm">
              <h3 className="font-semibold text-base mb-2">About Characters</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  Characters are the people with whom your vampire has a relationship. Each Character should be named and 
                  described in a sentence fragment, such as "Lawrence Hollmueller, a descendant of Baron Hollmueller" or 
                  "Sister Adelpho, a meddlesome nun."
                </p>
                <p>
                  A Character can be mortal or immortal. Mortals are regular human beings or other creatures that die with the 
                  passage of time. Immortals are supernatural beings for whom time has little meaning - other vampires, angels, 
                  demons, ghosts, or anything suitably bizarre.
                </p>
                <p>
                  Occasionally, you will realize that a Mortal must have died of old age. When this happens, strike out the 
                  Character's name. Outside of this, Characters cannot be killed unless a Prompt tells you to do so.
                </p>
              </div>
            </div>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`mortal${i}`}>Mortal {i}</Label>
                  <Input
                    id={`mortal${i}`}
                    value={inputs[`mortal${i}` as keyof typeof inputs]}
                    onChange={(e) => setInputs(prev => ({ ...prev, [`mortal${i}`]: e.target.value }))}
                    placeholder="Name and brief description..."
                  />
                </div>
              ))}
              <Button
                className="w-full"
                onClick={() => {
                  if (!inputs.mortal1 || !inputs.mortal2 || !inputs.mortal3) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Please fill in all fields",
                    });
                    return;
                  }

                  setCharacter(prev => ({
                    ...prev,
                    relationships: [
                      { name: inputs.mortal1 },
                      { name: inputs.mortal2 },
                      { name: inputs.mortal3 },
                    ],
                  }));
                  setStep("traits");
                }}
              >
                Next
              </Button>
            </CardContent>
          </>
        );

      case "traits":
        return (
          <>
            <CardHeader>
              <CardTitle>Skills and Resources</CardTitle>
              <CardDescription>
                Give your vampire three skills fitting for their mortal life, and three resources they obtained.
              </CardDescription>
            </CardHeader>
            <div className="mx-4 mt-2 mb-4 bg-muted/30 rounded-lg p-4 border text-sm">
              <h3 className="font-semibold text-base mb-2">About Skills</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  Skills describe the capabilities and characteristics of your vampire. They indicate what your vampire can do and what they might do.
                  Swordplay, Relaxing Banter, Operate Heavy Machinery, I Do Not Blink The Sand Away, and I Teach the Nanissáanah are all acceptable Skills.
                </p>
                <p>
                  Some Prompts will instruct you to check a Skill. This indicates the Skill has been used. Checked Skills give you flavor for answers to later Prompts.
                  If unchecked Skills are what your vampire is capable of, checked Skills are what they have done. They are who the vampire is.
                </p>
                <p>
                  You may only check a Skill once. If you are instructed to lose a Skill, it is gone and no longer influences your vampire.
                </p>
                <p className="italic">
                  What will it feel like for a vampire to use a Skill tied to a Memory that has been long lost?
                </p>
              </div>
            </div>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`skill${i}`}>Skill {i}</Label>
                  <Input
                    id={`skill${i}`}
                    value={inputs[`skill${i}` as keyof typeof inputs]}
                    onChange={(e) => setInputs(prev => ({ ...prev, [`skill${i}`]: e.target.value }))}
                    placeholder="Enter a skill..."
                  />
                </div>
              ))}
              
              <div className="mt-6 mb-2">
                <h4 className="font-semibold text-base">About Resources</h4>
                <div className="bg-muted/30 rounded-lg p-4 border text-sm my-2">
                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      Resources are assets or structures that are useful to your vampire, or items that they value. Knightly equipage, a loyal impi, 
                      a diamond tiara, the Castle Umbrecht, a business empire, a lucky penny, a screened-in charabanc, a Roman legion, the silvered key 
                      to the potentate's treasure vault, a carboy of acid, a box of tallow candles—all are acceptable and engaging Resources.
                    </p>
                    <p>
                      Some Resources are Stationary and cannot be physically hauled away when the vampire leaves the area (like a haunted cave or 
                      a hereditary title to land).
                    </p>
                    <p>
                      When instructed to create Resources, make them contextually appropriate. When a Prompt causes your vampire to lose a Resource, 
                      strike it out. Leave the entry legible because lost things might come back in time.
                    </p>
                  </div>
                </div>
              </div>
              
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`resource${i}`}>Resource {i}</Label>
                  <Input
                    id={`resource${i}`}
                    value={inputs[`resource${i}` as keyof typeof inputs]}
                    onChange={(e) => setInputs(prev => ({ ...prev, [`resource${i}`]: e.target.value }))}
                    placeholder="Enter a resource..."
                  />
                </div>
              ))}
              <Button
                className="w-full"
                onClick={() => {
                  if (!inputs.skill1 || !inputs.skill2 || !inputs.skill3 ||
                    !inputs.resource1 || !inputs.resource2 || !inputs.resource3) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Please fill in all fields",
                    });
                    return;
                  }

                  setCharacter(prev => ({
                    ...prev,
                    skills: [
                      { name: inputs.skill1 },
                      { name: inputs.skill2 },
                      { name: inputs.skill3 },
                    ],
                    resources: [
                      { name: inputs.resource1 },
                      { name: inputs.resource2 },
                      { name: inputs.resource3 },
                    ],
                  }));
                  setStep("experiences");
                }}
              >
                Next
              </Button>
            </CardContent>
          </>
        );

      case "experiences":
        return (
          <>
            <CardHeader>
              <CardTitle>Create Three Experiences</CardTitle>
              <CardDescription>
                Create three experiences that combine your vampire's traits. Each will be entered into a separate memory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display existing traits for reference */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Characters</h3>
                  <ul className="text-sm space-y-1">
                    {character.relationships?.map((rel, idx) => (
                      <li key={idx} className="text-muted-foreground">{rel.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Skills</h3>
                  <ul className="text-sm space-y-1">
                    {character.skills?.map((skill, idx) => (
                      <li key={idx} className="text-muted-foreground">{skill.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Resources</h3>
                  <ul className="text-sm space-y-1">
                    {character.resources?.map((resource, idx) => (
                      <li key={idx} className="text-muted-foreground">{resource.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Experience inputs */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Using the traits listed above, create three experiences that combine different elements.
                  For example, use a skill with a resource, or involve a character with your skills.
                </p>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 mb-4">
                    <Label htmlFor={`experience${i}`}>Experience {i}</Label>
                    <Textarea
                      id={`experience${i}`}
                      value={inputs[`experience${i}` as keyof typeof inputs]}
                      onChange={(e) => setInputs(prev => ({ ...prev, [`experience${i}`]: e.target.value }))}
                      placeholder="Describe an experience combining your traits..."
                      className="min-h-24"
                    />
                  </div>
                ))}
              </div>
              
              <Button
                className="w-full"
                onClick={() => {
                  if (!inputs.experience1 || !inputs.experience2 || !inputs.experience3) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Please fill in all fields",
                    });
                    return;
                  }

                  setCharacter(prev => ({
                    ...prev,
                    memories: [
                      ...(prev.memories || []),
                      {
                        id: nanoid(),
                        title: "Memory 2",
                        experiences: [{
                          text: inputs.experience1,
                          createdAt: new Date().toISOString(),
                        }],
                        inDiary: false,
                        strikedOut: false,
                      },
                      {
                        id: nanoid(),
                        title: "Memory 3",
                        experiences: [{
                          text: inputs.experience2,
                          createdAt: new Date().toISOString(),
                        }],
                        inDiary: false,
                        strikedOut: false,
                      },
                      {
                        id: nanoid(),
                        title: "Memory 4",
                        experiences: [{
                          text: inputs.experience3,
                          createdAt: new Date().toISOString(),
                        }],
                        inDiary: false,
                        strikedOut: false,
                      },
                    ],
                  }));
                  setStep("immortal");
                }}
              >
                Next
              </Button>
            </CardContent>
          </>
        );

      case "immortal":
        return (
          <>
            <CardHeader>
              <CardTitle>The Immortal and the Mark</CardTitle>
              <CardDescription>
                Describe the creature that turned your character into a vampire and the mark they now bear.
              </CardDescription>
            </CardHeader>
            <div className="mx-4 mt-2 mb-4 bg-muted/30 rounded-lg p-4 border text-sm">
              <h3 className="font-semibold text-base mb-2">About Marks</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  A Mark is a visible indication of your vampire's undying state or any other thing that sets them apart from mortal people. 
                  An ever-bleeding wound on the throat, eyes that are blank and white, a trailing specter, a ferocious scar, a hollow abdomen full of rats.
                </p>
                <p>
                  A Mark is something your vampire carries for their entire existence. When creating a Mark, consider whether your vampire conceals it, and how.
                </p>
                <p className="italic">Example Marks include:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A pair of great bat wings— I cut them off with a saw but the stubs remain</li>
                  <li>My eyes are hypnotic so I must wear smoked glasses</li>
                  <li>A dark halo I cover with tall military hats</li>
                  <li>Under the Moon my shadow takes the shape of a jaguar</li>
                  <li>Animals fear me, children cry; I can become a wolf or a rat</li>
                  <li>I have hands with the fingers bent into backward claws, I wear long sleeves to cover them from view</li>
                </ul>
              </div>
            </div>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="immortal">The Immortal</Label>
                <Input
                  id="immortal"
                  value={inputs.immortal}
                  onChange={(e) => setInputs(prev => ({ ...prev, immortal: e.target.value }))}
                  placeholder="Who turned you into a vampire?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mark">The Mark</Label>
                <Textarea
                  id="mark"
                  value={inputs.mark}
                  onChange={(e) => setInputs(prev => ({ ...prev, mark: e.target.value }))}
                  placeholder="What visible mark shows your vampiric nature?"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!inputs.immortal || !inputs.mark) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Please fill in all fields",
                    });
                    return;
                  }

                  // Create the final memory structure
                  const currentMemories = [...(prev.memories || [])];
                  
                  // Add the transformation memory
                  currentMemories.push({
                    id: nanoid(),
                    title: "Transformation",
                    experiences: [{
                      text: `${inputs.immortal} turned me into a vampire, leaving me with this mark: ${inputs.mark}`,
                      createdAt: new Date().toISOString(),
                    }],
                    inDiary: false,
                    strikedOut: false,
                  });
                  
                  // Add an empty fifth memory if needed
                  if (currentMemories.length < 5) {
                    currentMemories.push({
                      id: nanoid(),
                      title: "Memory 5",
                      experiences: [],
                      inDiary: false,
                      strikedOut: false,
                    });
                  }
                  
                  setCharacter(prev => ({
                    ...prev,
                    relationships: [
                      ...(prev.relationships || []),
                      { name: inputs.immortal },
                    ],
                    marks: [{ name: inputs.mark }],
                    memories: currentMemories,
                  }));
                  handleCreate();
                }}
              >
                Create Character
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        {renderStep()}
      </Card>
    </div>
  );
}