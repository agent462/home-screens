'use client';
import type { WordOfDayConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface WordOfDayModuleProps {
  config: WordOfDayConfig;
  style: ModuleStyle;
}

const WORDS = [
  { word: "Ephemeral", definition: "Lasting for a very short time" },
  { word: "Serendipity", definition: "The occurrence of events by chance in a happy way" },
  { word: "Eloquent", definition: "Fluent or persuasive in speaking or writing" },
  { word: "Resilient", definition: "Able to recover quickly from difficulties" },
  { word: "Ubiquitous", definition: "Present, appearing, or found everywhere" },
  { word: "Sanguine", definition: "Optimistic or positive, especially in a difficult situation" },
  { word: "Mellifluous", definition: "Sweet or musical; pleasant to hear" },
  { word: "Perspicacious", definition: "Having a ready insight into things; shrewd" },
  { word: "Ineffable", definition: "Too great or extreme to be expressed in words" },
  { word: "Luminous", definition: "Full of or shedding light; bright or shining" },
  { word: "Petrichor", definition: "The pleasant smell of earth after rain" },
  { word: "Quintessential", definition: "Representing the most perfect example of a quality" },
  { word: "Ethereal", definition: "Extremely delicate and light, seeming heavenly" },
  { word: "Wanderlust", definition: "A strong desire to travel and explore the world" },
  { word: "Halcyon", definition: "Denoting a period of time that was idyllically happy and peaceful" },
  { word: "Sonorous", definition: "Imposingly deep and full in sound" },
  { word: "Verdant", definition: "Green with grass or other rich vegetation" },
  { word: "Ebullient", definition: "Cheerful and full of energy" },
  { word: "Sublime", definition: "Of outstanding spiritual or intellectual worth" },
  { word: "Incandescent", definition: "Emitting light as a result of being heated; passionate" },
  { word: "Gossamer", definition: "Something very light, thin, and insubstantial" },
  { word: "Aplomb", definition: "Self-confidence or assurance, especially in a demanding situation" },
  { word: "Zenith", definition: "The highest point reached; the peak or culmination" },
  { word: "Euphoria", definition: "A feeling of intense excitement and happiness" },
  { word: "Cascade", definition: "A small waterfall, or a succession of stages" },
  { word: "Resplendent", definition: "Impressive and attractive; brilliant" },
  { word: "Labyrinthine", definition: "Like a labyrinth; irregular and twisting" },
  { word: "Cerulean", definition: "Deep sky blue in color" },
  { word: "Transcendent", definition: "Beyond or above the range of normal experience" },
  { word: "Iridescent", definition: "Showing luminous colors that change when seen from different angles" },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export default function WordOfDayModule({ config: _config, style }: WordOfDayModuleProps) {
  const dayOfYear = getDayOfYear();
  const entry = WORDS[dayOfYear % WORDS.length];

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-2xl font-bold">{entry.word}</p>
        <p className="text-center italic">{entry.definition}</p>
      </div>
    </ModuleWrapper>
  );
}
