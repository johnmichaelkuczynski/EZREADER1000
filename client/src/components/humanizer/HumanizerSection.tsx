import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Download, Copy, RefreshCw, FileText, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

// Writing samples data structure - ACTUAL STYLE SAMPLES
const WRITING_SAMPLES = {
  'content-neutral': [
    {
      id: 'formal-functional',
      title: 'Formal and Functional Relationships',
      content: `There are two broad types of relationships: formal and functional.
Formal relationships hold between descriptions. A description is any statement that can be true or false.
Example of a formal relationship: The description that a shape is a square cannot be true unless the description that it has four equal sides is true. Therefore, a shape's being a square depends on its having four equal sides.

Functional relationships hold between events or conditions. (An event is anything that happens in time.)
Example of a functional relationship: A plant cannot grow without water. Therefore, a plant's growth depends on its receiving water.

The first type is structural, i.e., it holds between statements about features.
The second is operational, i.e., it holds between things in the world as they act or change.

Descriptions as objects of consideration
The objects of evaluation are descriptions. Something is not evaluated unless it is described, and it is not described unless it can be stated. One can notice non-descriptions — sounds, objects, movements — but in the relevant sense one evaluates descriptions of them.

Relationships not known through direct observation
Some relationships are known, not through direct observation, but through reasoning. Such relationships are structural, as opposed to observational. Examples of structural relationships are:

If A, then A or B.

All tools require some form of use.

Nothing can be both moving and perfectly still.

There are no rules without conditions.

1 obviously expresses a relationship; 2–4 do so less obviously, as their meanings are:

2*. A tool's being functional depends on its being usable.
3*. An object's being both moving and still depends on contradictory conditions, which cannot occur together.
4*. The existence of rules depends on the existence of conditions to which they apply.

Structural truth and structural understanding
Structural understanding is always understanding of relationships. Observational understanding can be either direct or indirect; the same is true of structural understanding.`
    }
  ],
  'philosophical': [
    {
      id: 'explanatory-efficiency',
      title: 'Alternative Account of Explanatory Efficiency',
      content: `A continuation of the earlier case will make it clear what this means and why it matters. Why doesn't the outcome change under the given conditions? Because, says the standard account, the key factor remained in place. But, the skeptic will counter, perhaps we can discard that account; perhaps there's an alternative that fits the observations equally well. But, I would respond, even granting for argument's sake that such an alternative exists, it doesn't follow that it avoids more gaps than the one it replaces. It doesn't follow that it is comparable from a trade-off standpoint to the original—that it reduces as many issues as the old view while introducing no more new ones. In fact, the opposite often holds. Consider the alternative mentioned earlier. The cost of that account—meaning what new puzzles it creates—is vastly greater than its value—meaning what old puzzles it removes. It would be difficult to devise an account inconsistent with the conventional one that, while still matching the relevant evidence, is equally efficient in explanatory terms. You can test this for yourself. If there is reason to think even one such account exists, it is not because it has ever been produced. That reason, if it exists, must be purely theoretical. And for reasons soon to be made clear, no such purely theoretical reason can justify accepting it.`
    },
    {
      id: 'rational-belief',
      title: 'Rational Belief and Underlying Structure',
      content: `When would it become rational to believe that, next time, you're more likely than not to roll this as opposed to that number—that, for example, you're especially likely to roll a 27? This belief becomes rational when, and only when, you have reason to believe that a 27-roll is favored by the structures involved in the game. And that belief, in its turn, is rational if you know that circumstances at all like the following obtain: *The dice are magnetically attracted to the 27-slot. *On any given occasion, you have an unconscious intention to roll a 27 (even though you have no conscious intention of doing this), and you're such a talented dice-thrower that, if you can roll a 27 if it is your (subconscious) intention to do so. *The 27-slot is much bigger than any of the other slots. In fact, it takes up so much space on the roulette wheel that the remaining spaces are too small for the ball to fit into them. You are rational to believe that you'll continue to roll 27s to the extent that your having thus far rolled multiple 27s in a row gives you reason to believe there to be some underlying structure favoring that outcome.`
    },
    {
      id: 'hume-induction',
      title: 'Hume, Induction, and the Logic of Explanation',
      content: `We haven't yet refuted Hume's argument—we've only taken the first step towards doing so. Hume could defend his view against what we've said thus by far by saying the following: Suppose that, to explain why all phi's thus far known are psi's, you posit some underlying structure or law that disposes phi's to be psi's. Unless you think that nature is uniform, you have no right to expect that connection to continue to hold. But if, in order to deal with this, you suppose that nature is uniform, then you're using the very principle—the uniformity of nature—whose legitimacy is in question. So you haven't solved the problem; you've just pushed it back a level.`
    },
    {
      id: 'explanatory-goodness',
      title: 'Explanatory Goodness vs. Correctness',
      content: `For an explanation to be good isn't for it to be correct. Sometimes the right explanations are bad ones. A story will make this clear. I'm on a bus. The bus driver is smiling. A mystery! 'What on Earth does he have to smile about?' I ask myself. His job is so boring, and his life must therefore be such a horror.' But then I remember that, just a minute ago, a disembarking passenger gave him fifty $100 bills as a tip. So I have my explanation: 'he just came into a lot of money.' But wait. That explanation is wrong. The passenger didn't give him $5000. He gave him fake bills. They looked real to me, but the bus driver could see that they were fake. So why is he smiling? Because he thinks it's funny that somebody tried to pay him with counterfeit money. That's the right explanation. But it's also a worse explanation than the wrong one.`
    },
    {
      id: 'knowledge-awareness',
      title: 'Knowledge vs. Awareness',
      content: `Knowledge is conceptually articulated awareness. In order for me to know that my shoes are uncomfortably tight, I need to have the concepts shoe, tight, discomfort, etc. I do not need to have these concepts—or, arguably, any concepts—to be aware of the uncomfortable tightness in my shoes. My knowledge of that truth is a conceptualization of my awareness of that state of affairs. Equivalently, there are two kinds of awareness: propositional and objectual. My visual perception of a red rose involves objectual awareness of that rose. My knowledge that the rose is red involves propositional awareness of the fact that it is red. The first is non-conceptual; the second is conceptual.`
    }
  ],
  'paradoxes': [
    {
      id: 'loser-paradox',
      title: 'The Loser Paradox',
      content: `People who are the bottom of a hierarchy are far less likely to spurn that hierarchy than they are to use it against people who are trying to climb the ranks of that hierarchy. The person who never graduated from college may in some contexts claim that a college degree is worthless, but he is unlikely to act accordingly. When he comes across someone without a college degree who is trying to make something of himself, he is likely to pounce on that person, claiming he is an uncredentialed fraud. Similarly, the person who never got his driver's license may claim that cars are a waste of money, but when he comes across someone who just got his driver's license, he is likely to be highly critical of that person's driving.`
    },
    {
      id: 'secretary-paradox',
      title: 'The Sour Secretary Paradox',
      content: `The more useless a given employee is to the organization that employs her, the more unstintingly she will toe that organization's line. This is a corollary of the loser paradox.`
    },
    {
      id: 'indie-writer-paradox',
      title: 'The Indie Writer\'s Paradox',
      content: `People don't give good reviews to writers who do not already have positive reviews. Analysis: This is a veridical paradox, in the sense that it describes an actual vicious circle and does not represent a logical blunder. An independent writer is by definition one who does not have a marketing apparatus behind him, and such a writer depends on uncoerced positive reviews. But people are extremely reluctant to give good reviews to writers who are not popular already or who do not have institutional backing.`
    },
    {
      id: 'connectedness-paradox',
      title: 'Paradox of Connectedness',
      content: `Communications technology is supposed to connect us but separates us into self-contained, non-interacting units. Solution: Communications technology is not supposed to connect us emotionally. On the contrary, it is supposed to connect us in such a way that we can transact without having to bond emotionally. And that is what it does. It connects us logically while disconnecting us emotionally.`
    },
    {
      id: 'information-paradox',
      title: 'Arrow\'s Information Paradox',
      content: `If you don't know what it is, you don't buy it. Therefore, you don't buy information unless you know what it is. But if you know what it is, you don't need to buy it. But information is bought. Solution: The obvious solution is that information can be described without being disclosed. I can tell you that I have the so and so's phone number without giving you that number, and the circumstances may give you reason to believe me. But oftentimes it isn't until a given person has bought the information that he can adequately judge whether that information was worth buying.`
    },
    {
      id: 'education-paradox',
      title: 'Soft Communism and the Paradox of American Education',
      content: `The more money that the United States invests in education, the worse American education is. Explanation: In the US, when money is poured into education, it is not to improve education but is rather to provide incompetent people with fake employment as educational administrators or teachers. So with each new wave of educational funding, a bloated, entrenched and incompetent cadre of educational bureaucrats becomes even more bloated, entrenched and incompetent, with predictably adverse effects on student-learning.`
    },
    {
      id: 'buridans-ass',
      title: 'Buridan\'s Ass',
      content: `An ass that has to choose between food and water and is exactly as hungry as it is thirsty cannot make a choice and will therefore be paralyzed by indecision. But such an ass would in fact be able to make a decision. Explanation: This isn't exactly a paradox. There is nothing absurd in the supposition that a creature in such a situation might simply 'halt', and we don't know that actual biological creatures would not in fact halt in such a situation, since it seldom if ever happens that a creature is confronted with options that are exactly equally appealing.`
    },
    {
      id: 'obsessive-compulsive-paradox',
      title: 'Obsessive-compulsive\'s Paradox',
      content: `If the obsessive-compulsive doesn't give in to his compulsions, he suffers. If he does give into them, they get worse. Solution: If the obsessive-compulsive fights his compulsions, they wither and go away.`
    },
    {
      id: 'analysis-paralysis-paradox',
      title: 'Analysis Paralysis Paradox',
      content: `Given that there is almost always a more rational course of action, the ability to identify rational courses of action may lead to a failure to act. Solution: There is a difference between intelligence and rationality. Intelligence answers the question: What is it objectively possible to do? Rationality answers the question: What do my limited resources of time, energy and intelligence make it incumbent on me to do? And the second answer breaks any deadlocks created by the first.`
    },
    {
      id: 'primerica-paradox',
      title: 'The Primerica Paradox',
      content: `In order to work for Primerica, you need to have money, since you don't make any money working there. But if you have money you won't work for Primerica, because there is no reason to do so. And yet people work for Primerica. Explanation: People who are on welfare often have to provide proof that either have employment or are looking for it. If you pay a monthly fee of $50 to Primerica, you can list it as an employer. Plus, given that you are technically employed but are making no money at all, you are entitled to major tax exemptions.`
    },
    {
      id: 'leno-paradox',
      title: 'The Leno Paradox',
      content: `The people who should commit suicide don't.`
    },
    {
      id: 'skeptical-bureaucrat-paradox',
      title: 'Skeptical Bureaucrat Paradox',
      content: `When bureaucrats say they 'need more information', it's because they don't need it. They are determined not to help you and they're sending you on a fool's errand.`
    },
    {
      id: 'forest-paradox',
      title: 'The Forest Paradox',
      content: `Knowing involves not knowing too much. If you know too much about Smith, you are likely to make excuses for him. If you know just enough, you can't make excuses for him and you'll see him for what he is.`
    },
    {
      id: 'larry-david-paradox',
      title: 'The Larry David Paradox',
      content: `It is only when somebody has no merit that it becomes politically obligatory to say that they have merit.`
    },
    {
      id: 'gratitude-paradox',
      title: 'The Gratitude Paradox',
      content: `The people who should be the most grateful are the least grateful. Explanation: The people who should be the most grateful are losers who were bailed out, and they needed to bailed out because they don't have enough integrity to give credit where it is due.`
    }
  ]
};

// Style presets - top 8 are most important for humanization
const STYLE_PRESETS = [
  // Most important for humanization (1-8)
  { id: 'mixed-cadence', label: 'Mixed cadence + clause sprawl', description: 'Alternate short and long sentences; allow some long sentences to wander with extra clauses.', priority: 'high' },
  { id: 'asymmetric-emphasis', label: 'Asymmetric emphasis', description: 'Over-elaborate one point; compress or skate past another.', priority: 'high' },
  { id: 'one-aside', label: 'One aside', description: 'Add a quick parenthetical or em-dash remark — factual, not jokey.', priority: 'high' },
  { id: 'hedge-twice', label: 'Hedge twice', description: 'Use two mild uncertainty markers ("probably," "seems," "roughly," "I think").', priority: 'high' },
  { id: 'local-disfluency', label: 'Local disfluency', description: 'Keep one redundant or slightly awkward phrase that still makes sense.', priority: 'high' },
  { id: 'analogy-injection', label: 'Analogy injection', description: 'Insert a short, concrete comparison to something unrelated but illustrative.', priority: 'high' },
  { id: 'topic-snap', label: 'Topic snap', description: 'Abruptly shift focus once, then return.', priority: 'high' },
  { id: 'friction-detail', label: 'Friction detail', description: 'Drop in a small, seemingly unnecessary but real-world-plausible detail.', priority: 'high' },
  
  // Structure & Cadence
  { id: 'compression-light', label: 'Compression — light (−15%)', description: 'Cut filler; merge short clauses; keep meaning.', priority: 'medium' },
  { id: 'compression-medium', label: 'Compression — medium (−30%)', description: 'Trim hard; delete throat-clearing; tighten syntax.', priority: 'medium' },
  { id: 'compression-heavy', label: 'Compression — heavy (−45%)', description: 'Sever redundancies; collapse repeats; keep core claims.', priority: 'medium' },
  { id: 'decrease-50', label: 'Decrease by 50%', description: 'Reduce the length by half while preserving meaning.', priority: 'medium' },
  { id: 'increase-150', label: 'Increase by 150%', description: 'Expand the text to 150% longer with additional detail and elaboration.', priority: 'medium' },
  { id: 'mixed-cadence-alt', label: 'Mixed cadence', description: 'Alternate 5–35-word sentences; no uniform rhythm.', priority: 'medium' },
  { id: 'clause-surgery', label: 'Clause surgery', description: 'Reorder main/subordinate clauses in 30% of sentences.', priority: 'medium' },
  { id: 'front-load-claim', label: 'Front-load claim', description: 'Put the main conclusion in sentence 1; support follows.', priority: 'medium' },
  { id: 'back-load-claim', label: 'Back-load claim', description: 'Delay the conclusion to the final 2–3 sentences.', priority: 'medium' },
  { id: 'seam-pivot', label: 'Seam/pivot', description: 'Drop smooth connectors once; abrupt turn is fine.', priority: 'medium' },
  
  // Framing & Inference
  { id: 'imply-one-step', label: 'Imply one step', description: 'Omit an obvious inferential step; leave it implicit.', priority: 'medium' },
  { id: 'conditional-framing', label: 'Conditional framing', description: 'Recast one key sentence as "If/Unless …, then …".', priority: 'medium' },
  { id: 'local-contrast', label: 'Local contrast', description: 'Use "but/except/aside" once to mark a boundary—no new facts.', priority: 'medium' },
  { id: 'scope-check', label: 'Scope check', description: 'Replace one absolute with a bounded form ("in cases like these").', priority: 'medium' },
  
  // Diction & Tone
  { id: 'deflate-jargon', label: 'Deflate jargon', description: 'Swap nominalizations for verbs where safe (e.g., "utilization" → "use").', priority: 'medium' },
  { id: 'kill-stock-transitions', label: 'Kill stock transitions', description: 'Delete "Moreover/Furthermore/In conclusion" everywhere.', priority: 'medium' },
  { id: 'hedge-once', label: 'Hedge once', description: 'Use exactly one: "probably/roughly/more or less."', priority: 'medium' },
  { id: 'drop-intensifiers', label: 'Drop intensifiers', description: 'Remove "very/clearly/obviously/significantly."', priority: 'medium' },
  { id: 'low-heat-voice', label: 'Low-heat voice', description: 'Prefer plain verbs; avoid showy synonyms.', priority: 'medium' },
  { id: 'one-aside-alt', label: 'One aside', description: 'One short parenthetical or em-dash aside; keep it factual.', priority: 'medium' },
  
  // Concreteness & Benchmarks
  { id: 'concrete-benchmark', label: 'Concrete benchmark', description: 'Replace one vague scale with a testable one (e.g., "enough to X").', priority: 'medium' },
  { id: 'swap-generic-example', label: 'Swap generic example', description: 'If the source has an example, make it slightly more specific; else skip.', priority: 'medium' },
  { id: 'metric-nudge', label: 'Metric nudge', description: 'Replace "more/better" with a minimal, source-safe comparator ("more than last case").', priority: 'medium' },
  
  // Asymmetry & Focus
  { id: 'asymmetric-emphasis-alt', label: 'Asymmetric emphasis', description: 'Linger on the main claim; compress secondary points sharply.', priority: 'medium' },
  { id: 'cull-repeats', label: 'Cull repeats', description: 'Delete duplicated sentences/ideas; keep the strongest instance.', priority: 'medium' },
  { id: 'topic-snap-alt', label: 'Topic snap', description: 'Change focus abruptly once; no recap.', priority: 'medium' },
  
  // Formatting & Output Hygiene
  { id: 'no-lists', label: 'No lists', description: 'Force continuous prose; remove bullets/numbering.', priority: 'low' },
  { id: 'no-meta', label: 'No meta', description: 'No prefaces, apologies, or "as requested" scaffolding.', priority: 'low' },
  { id: 'exact-nouns', label: 'Exact nouns', description: 'Replace vague pronouns where antecedent is ambiguous.', priority: 'low' },
  { id: 'quote-once', label: 'Quote once', description: 'If the source contains a strong phrase, quote it once; else skip.', priority: 'low' },
  
  // Safety / Guardrails
  { id: 'claim-lock', label: 'Claim lock', description: 'Do not add examples, scenarios, or data not present in the source.', priority: 'low' },
  { id: 'entity-lock', label: 'Entity lock', description: 'Keep names, counts, and attributions exactly as given.', priority: 'low' },
  
  // Combo presets
  { id: 'lean-sharp', label: 'Lean & Sharp', description: 'Compression-medium + mixed cadence + imply one step + kill stock transitions.', priority: 'medium' },
  { id: 'analytic', label: 'Analytic', description: 'Clause surgery + front-load claim + scope check + exact nouns + no lists.', priority: 'medium' }
];

interface ChunkSelectionDialogProps {
  chunks: string[];
  onSelect: (selectedIndices: number[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

function ChunkSelectionDialog({ chunks, onSelect, onClose, isOpen }: ChunkSelectionDialogProps) {
  const [selectedChunks, setSelectedChunks] = useState<number[]>([]);

  const toggleChunk = (index: number) => {
    setSelectedChunks(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleConfirm = () => {
    onSelect(selectedChunks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Select Chunks to Humanize</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your document has been divided into {chunks.length} chunks. Select which ones you want to humanize:
        </p>
        
        <div className="space-y-3 mb-6">
          {chunks.map((chunk, index) => (
            <div key={index} className="border rounded p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedChunks.includes(index)}
                  onCheckedChange={() => toggleChunk(index)}
                />
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Chunk {index + 1}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {chunk.substring(0, 200)}...
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setSelectedChunks(chunks.map((_, i) => i))}>
            Select All
          </Button>
          <Button variant="outline" onClick={() => setSelectedChunks([])}>
            Clear All
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedChunks.length === 0}>
              Humanize Selected ({selectedChunks.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HumanizerSectionProps {
  onSendToInput?: (text: string) => void;
  initialText?: string;
}

export function HumanizerSection({ onSendToInput, initialText }: HumanizerSectionProps) {
  const { toast } = useToast();
  
  // State for the three main boxes
  const [aiText, setAiText] = useState('');

  // Update aiText when initialText changes
  React.useEffect(() => {
    if (initialText && initialText.trim()) {
      setAiText(initialText);
    }
  }, [initialText]);
  const [styleText, setStyleText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  
  // State for custom instructions
  const [customInstructions, setCustomInstructions] = useState('');
  
  // State for controls
  const [selectedLLM, setSelectedLLM] = useState('anthropic');
  const [selectedWritingSample, setSelectedWritingSample] = useState('formal-functional');
  const [selectedStylePresets, setSelectedStylePresets] = useState<string[]>([]);
  
  // State for AI detection results
  const [aiTextDetection, setAiTextDetection] = useState<{ confidence: number } | null>(null);
  const [styleTextDetection, setStyleTextDetection] = useState<{ confidence: number } | null>(null);
  const [humanizedTextDetection, setHumanizedTextDetection] = useState<{ confidence: number } | null>(null);
  
  // State for processing
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  
  // State for chunking
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [showChunkSelection, setShowChunkSelection] = useState(false);
  
  // State for expandable writing samples
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());
  
  // File upload refs
  const aiTextFileRef = useRef<HTMLInputElement>(null);
  const styleTextFileRef = useRef<HTMLInputElement>(null);

  // Dropzone for AI text
  const aiTextDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files[0], 'ai'),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  // Dropzone for style text
  const styleTextDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files[0], 'style'),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  // File upload handler
  const handleFileUpload = async (file: File, boxType: 'ai' | 'style') => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (boxType === 'ai') {
        setAiText(data.text);
        // Auto-detect AI for uploaded text
        detectAI(data.text, 'ai');
      } else {
        setStyleText(data.text);
        // Auto-detect AI for uploaded style text
        detectAI(data.text, 'style');
      }

      toast({
        title: "File uploaded successfully",
        description: `Document processed and text extracted.`
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not process file",
        variant: "destructive"
      });
    }
  };

  // AI Detection function
  const detectAI = async (text: string, boxType: 'ai' | 'style' | 'humanized') => {
    if (!text.trim()) return;
    
    try {
      setIsDetectingAI(true);
      
      const response = await fetch('/api/detect-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`AI detection failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (boxType === 'ai') {
        setAiTextDetection(result);
      } else if (boxType === 'style') {
        setStyleTextDetection(result);
      } else {
        setHumanizedTextDetection(result);
      }
    } catch (error: any) {
      console.error('AI detection error:', error);
      toast({
        title: "AI detection failed",
        description: error.message || "Could not analyze text",
        variant: "destructive"
      });
    } finally {
      setIsDetectingAI(false);
    }
  };

  // Auto-detect AI when text changes
  useEffect(() => {
    if (aiText.trim()) {
      const debounceTimer = setTimeout(() => detectAI(aiText, 'ai'), 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [aiText]);

  useEffect(() => {
    if (styleText.trim()) {
      const debounceTimer = setTimeout(() => detectAI(styleText, 'style'), 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [styleText]);

  useEffect(() => {
    if (humanizedText.trim()) {
      const debounceTimer = setTimeout(() => detectAI(humanizedText, 'humanized'), 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [humanizedText]);

  // Text chunking function
  const chunkText = (text: string, chunkSize: number = 500): string[] => {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  };

  // Handle humanization
  const handleHumanize = async (textToHumanize?: string) => {
    const sourceText = textToHumanize || aiText;
    
    if (!sourceText.trim()) {
      toast({
        title: "No text to humanize",
        description: "Please enter or upload text in Box A first.",
        variant: "destructive"
      });
      return;
    }

    // Check if text is long and needs chunking
    const wordCount = sourceText.split(' ').length;
    if (wordCount > 500) {
      const chunks = chunkText(sourceText);
      setTextChunks(chunks);
      setShowChunkSelection(true);
      return;
    }

    await performHumanization(sourceText);
  };

  // Handle chunk selection
  const handleChunkSelection = async (selectedIndices: number[]) => {
    const selectedText = selectedIndices.map(i => textChunks[i]).join('\n\n');
    await performHumanization(selectedText);
  };

  // Perform actual humanization
  const performHumanization = async (text: string) => {
    try {
      setIsHumanizing(true);

      // Get style source - either uploaded text or selected writing sample
      let styleSource = styleText;
      if (!styleSource.trim() && selectedWritingSample) {
        // Find the selected writing sample
        for (const category of Object.values(WRITING_SAMPLES)) {
          const sample = category.find(s => s.id === selectedWritingSample);
          if (sample) {
            styleSource = sample.content;
            break;
          }
        }
      }

      // Map frontend preset IDs to backend preset labels
      const mappedPresets = selectedStylePresets.map(presetId => {
        const preset = STYLE_PRESETS.find(p => p.id === presetId);
        return preset ? preset.label : '';
      }).filter(Boolean);

      const response = await fetch('/api/humanize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          styleSource,
          customInstructions,
          selectedPresets: mappedPresets,
          llmProvider: selectedLLM
        })
      });

      if (!response.ok) {
        throw new Error(`Humanization failed: ${response.status}`);
      }

      const result = await response.json();
      setHumanizedText(result.humanizedText);

      toast({
        title: "Text humanized successfully",
        description: "The humanized text has been generated and AI detection is running."
      });
    } catch (error: any) {
      console.error('Humanization error:', error);
      toast({
        title: "Humanization failed",
        description: error.message || "Could not humanize text",
        variant: "destructive"
      });
    } finally {
      setIsHumanizing(false);
    }
  };

  // Handle re-humanization
  const handleReHumanize = () => {
    if (!humanizedText.trim()) {
      toast({
        title: "No text to re-humanize",
        description: "Generate a humanized text first.",
        variant: "destructive"
      });
      return;
    }
    
    handleHumanize(humanizedText);
  };

  // Export functions
  const exportText = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!humanizedText.trim()) {
      toast({
        title: "No content to export",
        description: "Generate humanized text first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/export-${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: humanizedText, title: 'Humanized Text' })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `humanized-text.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Text exported as ${format.toUpperCase()}`
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Could not export text",
        variant: "destructive"
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text copied successfully"
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">AI Text Humanizer</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Convert AI-written text into human-like text that bypasses AI detection
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* LLM Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Language Model</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Default)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Writing Samples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Writing Samples</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedWritingSample} onValueChange={setSelectedWritingSample}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRITING_SAMPLES['content-neutral'].map(sample => (
                    <SelectItem key={sample.id} value={sample.id}>
                      📝 {sample.title}
                    </SelectItem>
                  ))}
                  {WRITING_SAMPLES['philosophical'].map(sample => (
                    <SelectItem key={sample.id} value={sample.id}>
                      🧠 {sample.title}
                    </SelectItem>
                  ))}
                  {WRITING_SAMPLES['paradoxes'].map(sample => (
                    <SelectItem key={sample.id} value={sample.id}>
                      ❓ {sample.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Writing Sample Previews */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Preview Writing Samples:</p>
                {Object.values(WRITING_SAMPLES).flat().map(sample => (
                  <div key={sample.id} className="border rounded-md">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSamples);
                        if (newExpanded.has(sample.id)) {
                          newExpanded.delete(sample.id);
                        } else {
                          newExpanded.add(sample.id);
                        }
                        setExpandedSamples(newExpanded);
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-xs font-medium">{sample.title}</p>
                        <p className="text-xs text-gray-500">
                          {selectedWritingSample === sample.id ? '✓ Currently Selected' : 'Click to preview writing style'}
                        </p>
                      </div>
                      {expandedSamples.has(sample.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                    {expandedSamples.has(sample.id) && (
                      <div className="p-3 border-t bg-gray-50 dark:bg-gray-900">
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {sample.content}
                        </p>
                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>{sample.content.length} characters</span>
                          <button
                            onClick={() => setSelectedWritingSample(sample.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Use This Writing Style
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Style Presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Style Presets</CardTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Presets 1-8 are most effective for humanization
              </p>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {STYLE_PRESETS.map(preset => (
                  <div key={preset.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={preset.id}
                      checked={selectedStylePresets.includes(preset.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStylePresets(prev => [...prev, preset.id]);
                        } else {
                          setSelectedStylePresets(prev => prev.filter(id => id !== preset.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={preset.id} 
                        className="text-sm font-medium cursor-pointer flex items-center gap-1"
                      >
                        {preset.label}
                        {preset.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">★</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Three Boxes */}
        <div className="lg:col-span-3 space-y-6">
          {/* Box A - AI Text Input */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  Box A: AI Text to Humanize
                  {aiTextDetection && (
                    <Badge variant={aiTextDetection.confidence > 0.5 ? "destructive" : "secondary"}>
                      {aiTextDetection.confidence > 0.5 ? 
                        `${Math.round(aiTextDetection.confidence * 100)}% AI` : 
                        `${Math.round((1 - aiTextDetection.confidence) * 100)}% Human`
                      }
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => aiTextFileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiText('')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div 
                  {...aiTextDropzone.getRootProps()}
                  className={`absolute inset-0 ${
                    aiTextDropzone.isDragActive 
                      ? 'border-4 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-950 bg-opacity-75 rounded-lg z-10' 
                      : 'pointer-events-none'
                  }`}
                >
                  <input {...aiTextDropzone.getInputProps()} />
                  {aiTextDropzone.isDragActive && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Drop file here to upload
                      </p>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={aiTextFileRef}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'ai');
                  }}
                />
                
                <Textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Type, paste, or upload AI-generated text here... Supports PDF, Word, and text files."
                  className="min-h-[200px] border-2 border-dashed border-gray-200 dark:border-gray-700 resize-none focus-visible:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Instructions (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Enter any specific instructions for how the text should be rewritten..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Box B - Style Sample */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  Box B: Human Writing Style Sample
                  {styleTextDetection && (
                    <Badge variant={styleTextDetection.confidence > 0.5 ? "destructive" : "secondary"}>
                      {styleTextDetection.confidence > 0.5 ? 
                        `${Math.round(styleTextDetection.confidence * 100)}% AI` : 
                        `${Math.round((1 - styleTextDetection.confidence) * 100)}% Human`
                      }
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => styleTextFileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStyleText('')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div 
                  {...styleTextDropzone.getRootProps()}
                  className={`absolute inset-0 ${
                    styleTextDropzone.isDragActive 
                      ? 'border-4 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-950 bg-opacity-75 rounded-lg z-10' 
                      : 'pointer-events-none'
                  }`}
                >
                  <input {...styleTextDropzone.getInputProps()} />
                  {styleTextDropzone.isDragActive && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Drop file here to upload
                      </p>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={styleTextFileRef}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'style');
                  }}
                />
                
                <Textarea
                  value={styleText}
                  onChange={(e) => setStyleText(e.target.value)}
                  placeholder="Upload your own writing sample or leave empty to use the selected writing sample from the dropdown..."
                  className="min-h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-700 resize-none focus-visible:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Humanize Button */}
          <div className="text-center">
            <Button 
              onClick={() => handleHumanize()}
              disabled={isHumanizing || !aiText.trim()}
              size="lg"
              className="w-64 h-12"
            >
              {isHumanizing ? 'Humanizing...' : 'Humanize Text'}
            </Button>
          </div>

          {/* Box C - Humanized Output */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  Box C: Humanized Text
                  {humanizedTextDetection && (
                    <Badge variant={humanizedTextDetection.confidence > 0.5 ? "destructive" : "secondary"}>
                      {humanizedTextDetection.confidence > 0.5 ? 
                        `${Math.round(humanizedTextDetection.confidence * 100)}% AI` : 
                        `${Math.round((1 - humanizedTextDetection.confidence) * 100)}% Human`
                      }
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(humanizedText)}
                    disabled={!humanizedText.trim()}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportText('txt')}
                    disabled={!humanizedText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportText('docx')}
                    disabled={!humanizedText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportText('pdf')}
                    disabled={!humanizedText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  {onSendToInput && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        onSendToInput(humanizedText);
                        toast({
                          title: "Text sent to main input",
                          description: "Humanized text has been sent to the main input box"
                        });
                      }}
                      disabled={!humanizedText.trim()}
                    >
                      Send to Main Input
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[300px]">
                {humanizedText ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {humanizedText}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Humanized text will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Re-Humanize Button */}
          {humanizedText && (
            <div className="text-center">
              <Button 
                onClick={handleReHumanize}
                disabled={isHumanizing}
                variant="outline"
                size="lg"
                className="w-64 h-12"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isHumanizing ? 'Re-Humanizing...' : 'Re-Humanize'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chunk Selection Dialog */}
      <ChunkSelectionDialog
        chunks={textChunks}
        onSelect={handleChunkSelection}
        onClose={() => setShowChunkSelection(false)}
        isOpen={showChunkSelection}
      />
    </div>
  );
}