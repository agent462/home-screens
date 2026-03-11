'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AffirmationsConfig, AffirmationsCategory, ModuleStyle } from '@/types/config';
import { useTZClock } from '@/hooks/useTZClock';
import ModuleWrapper from './ModuleWrapper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entry {
  text: string;
  attribution?: string;
  category: AffirmationsCategory;
  /** Time-of-day affinity: morning / afternoon / evening / night / anytime */
  time?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
  /** Day-of-week affinity: 0=Sun..6=Sat */
  days?: number[];
  /** Season affinity */
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}

interface AffirmationsModuleProps {
  config: AffirmationsConfig;
  style: ModuleStyle;
  timezone?: string;
  latitude?: number;
}

// ---------------------------------------------------------------------------
// Built-in content library (190+ entries)
// ---------------------------------------------------------------------------

const BUILT_IN: Entry[] = [
  // ── Affirmations ──────────────────────────────────────────────
  { text: 'I am worthy of love and kindness.', category: 'affirmations', time: 'anytime' },
  { text: 'I trust the journey, even when I cannot see the path.', category: 'affirmations', time: 'anytime' },
  { text: 'I am becoming the person I want to be.', category: 'affirmations', time: 'anytime' },
  { text: 'My potential is limitless.', category: 'affirmations', time: 'anytime' },
  { text: 'I release what no longer serves me.', category: 'affirmations', time: 'evening' },
  { text: 'I choose peace over perfection.', category: 'affirmations', time: 'anytime' },
  { text: 'I am allowed to take up space.', category: 'affirmations', time: 'anytime' },
  { text: 'I am enough, exactly as I am.', category: 'affirmations', time: 'anytime' },
  { text: 'I attract positive energy into my life.', category: 'affirmations', time: 'morning' },
  { text: 'I am resilient, strong, and brave.', category: 'affirmations', time: 'anytime' },
  { text: 'I give myself permission to rest.', category: 'affirmations', time: 'evening' },
  { text: 'I honor my own boundaries.', category: 'affirmations', time: 'anytime' },
  { text: 'Every setback is a setup for a comeback.', category: 'affirmations', time: 'anytime' },
  { text: 'I am at peace with who I am.', category: 'affirmations', time: 'night' },
  { text: 'My voice matters. My story matters.', category: 'affirmations', time: 'anytime' },
  { text: 'I welcome abundance in all its forms.', category: 'affirmations', time: 'morning' },
  { text: 'I am deserving of the good things in my life.', category: 'affirmations', time: 'anytime' },
  { text: 'I forgive myself for past mistakes. They helped me grow.', category: 'affirmations', time: 'evening' },
  { text: 'My body is healthy, my mind is sharp, my spirit is calm.', category: 'affirmations', time: 'morning' },
  { text: 'I radiate confidence and self-respect.', category: 'affirmations', time: 'morning' },
  { text: 'I am open to new adventures and experiences.', category: 'affirmations', time: 'morning' },
  { text: 'I let go of comparison. My path is my own.', category: 'affirmations', time: 'anytime' },
  { text: 'I am a work in progress, and that is perfectly fine.', category: 'affirmations', time: 'anytime' },
  { text: 'My mistakes do not define me. My growth does.', category: 'affirmations', time: 'anytime' },
  { text: 'I have the power to create the life I want.', category: 'affirmations', time: 'morning' },
  { text: 'I choose to focus on what I can change.', category: 'affirmations', time: 'anytime' },
  { text: 'I am surrounded by love, even when I cannot feel it.', category: 'affirmations', time: 'night' },
  { text: 'Today I will be kind to myself.', category: 'affirmations', time: 'morning' },
  { text: 'I am stronger than my doubts.', category: 'affirmations', time: 'anytime' },
  { text: 'My happiness is my responsibility, and I embrace it.', category: 'affirmations', time: 'anytime' },

  // ── Compliments ───────────────────────────────────────────────
  { text: 'You light up every room you walk into.', category: 'compliments', time: 'anytime' },
  { text: 'Your smile is contagious — never stop sharing it.', category: 'compliments', time: 'morning' },
  { text: 'You have a gift for making others feel seen.', category: 'compliments', time: 'anytime' },
  { text: 'The world is better because you are in it.', category: 'compliments', time: 'anytime' },
  { text: 'Your kindness ripples outward further than you know.', category: 'compliments', time: 'anytime' },
  { text: 'You handle challenges with remarkable grace.', category: 'compliments', time: 'afternoon' },
  { text: 'People are lucky to know you.', category: 'compliments', time: 'anytime' },
  { text: 'Your energy is magnetic.', category: 'compliments', time: 'anytime' },
  { text: 'You make hard things look easy.', category: 'compliments', time: 'afternoon' },
  { text: 'You have incredible taste.', category: 'compliments', time: 'anytime' },
  { text: 'Your creativity inspires everyone around you.', category: 'compliments', time: 'anytime' },
  { text: 'You bring out the best in people.', category: 'compliments', time: 'anytime' },
  { text: 'You deserve every good thing coming your way.', category: 'compliments', time: 'anytime' },
  { text: 'Your laugh is the best sound.', category: 'compliments', time: 'anytime' },
  { text: 'You are doing an amazing job.', category: 'compliments', time: 'afternoon' },
  { text: 'Your patience is a superpower.', category: 'compliments', time: 'afternoon' },
  { text: 'You have a beautiful way of looking at the world.', category: 'compliments', time: 'anytime' },
  { text: 'Your determination is inspiring.', category: 'compliments', time: 'anytime' },
  { text: 'You make people feel safe and valued.', category: 'compliments', time: 'anytime' },
  { text: 'You have the courage to be yourself, and that is rare.', category: 'compliments', time: 'anytime' },
  { text: 'Your perspective is unique and it matters.', category: 'compliments', time: 'anytime' },
  { text: 'You lead with empathy and it shows.', category: 'compliments', time: 'afternoon' },
  { text: 'There is nobody else quite like you. That is your strength.', category: 'compliments', time: 'anytime' },
  { text: 'You carry yourself with quiet confidence.', category: 'compliments', time: 'anytime' },
  { text: 'The effort you put in does not go unnoticed.', category: 'compliments', time: 'afternoon' },
  { text: 'Your heart is bigger than you give yourself credit for.', category: 'compliments', time: 'evening' },
  { text: 'You have great instincts. Trust them more.', category: 'compliments', time: 'anytime' },
  { text: 'Your enthusiasm is infectious.', category: 'compliments', time: 'morning' },
  { text: 'You handle pressure better than you think.', category: 'compliments', time: 'afternoon' },
  { text: 'You are someone people can rely on.', category: 'compliments', time: 'anytime' },

  // ── Motivational ──────────────────────────────────────────────
  { text: 'Start where you are. Use what you have. Do what you can.', category: 'motivational', attribution: 'Arthur Ashe', time: 'morning' },
  { text: 'The only way to do great work is to love what you do.', category: 'motivational', attribution: 'Steve Jobs', time: 'morning' },
  { text: 'It does not matter how slowly you go, as long as you do not stop.', category: 'motivational', attribution: 'Confucius', time: 'anytime' },
  { text: 'What you get by achieving your goals is not as important as what you become.', category: 'motivational', attribution: 'Zig Ziglar', time: 'anytime' },
  { text: 'Believe you can and you are halfway there.', category: 'motivational', attribution: 'Theodore Roosevelt', time: 'morning' },
  { text: 'Small daily improvements are the key to staggering long-term results.', category: 'motivational', time: 'morning' },
  { text: 'Discipline is choosing between what you want now and what you want most.', category: 'motivational', attribution: 'Abraham Lincoln', time: 'anytime' },
  { text: 'You did not come this far to only come this far.', category: 'motivational', time: 'afternoon' },
  { text: 'Dream big. Start small. Act now.', category: 'motivational', time: 'morning' },
  { text: 'The secret of getting ahead is getting started.', category: 'motivational', attribution: 'Mark Twain', time: 'morning' },
  { text: 'Your future self is watching you right now through memories.', category: 'motivational', time: 'anytime' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', category: 'motivational', time: 'anytime' },
  { text: 'Progress, not perfection.', category: 'motivational', time: 'anytime' },
  { text: 'Hardships often prepare ordinary people for an extraordinary destiny.', category: 'motivational', attribution: 'C.S. Lewis', time: 'anytime' },
  { text: 'Be so good they can\'t ignore you.', category: 'motivational', attribution: 'Steve Martin', time: 'morning' },
  { text: 'You are never too old to set another goal or to dream a new dream.', category: 'motivational', attribution: 'C.S. Lewis', time: 'anytime' },
  { text: 'The struggle you are in today is developing the strength you need for tomorrow.', category: 'motivational', time: 'afternoon' },
  { text: 'Do something today that your future self will thank you for.', category: 'motivational', time: 'morning' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', category: 'motivational', attribution: 'Robert Collier', time: 'morning' },
  { text: 'Fall seven times, stand up eight.', category: 'motivational', time: 'anytime' },
  { text: 'What seems impossible today will one day become your warm-up.', category: 'motivational', time: 'morning' },
  { text: 'You do not have to be perfect to be amazing.', category: 'motivational', time: 'anytime' },
  { text: 'Action is the foundational key to all success.', category: 'motivational', attribution: 'Pablo Picasso', time: 'morning' },
  { text: 'The comeback is always stronger than the setback.', category: 'motivational', time: 'anytime' },
  { text: 'A year from now you will wish you had started today.', category: 'motivational', time: 'morning' },
  { text: 'Everything you have ever wanted is on the other side of fear.', category: 'motivational', attribution: 'George Addair', time: 'anytime' },
  { text: 'Energy flows where attention goes.', category: 'motivational', time: 'morning' },
  { text: 'Doubt kills more dreams than failure ever will.', category: 'motivational', attribution: 'Suzy Kassem', time: 'anytime' },
  { text: 'If it were easy, everyone would do it. Keep going.', category: 'motivational', time: 'afternoon' },
  { text: 'You are one decision away from a completely different life.', category: 'motivational', time: 'anytime' },
  { text: 'Done is better than perfect.', category: 'motivational', time: 'afternoon' },
  { text: 'The only limit to our realization of tomorrow will be our doubts of today.', category: 'motivational', attribution: 'Franklin D. Roosevelt', time: 'anytime' },
  { text: 'Stars cannot shine without darkness.', category: 'motivational', time: 'evening' },
  { text: 'Courage is not the absence of fear. It is acting in spite of it.', category: 'motivational', attribution: 'Mark Twain', time: 'anytime' },
  { text: 'What would you attempt to do if you knew you could not fail?', category: 'motivational', time: 'morning' },
  { text: 'The way to get started is to quit talking and begin doing.', category: 'motivational', attribution: 'Walt Disney', time: 'morning' },

  // ── Day-of-week motivation ────────────────────────────────────
  { text: 'New week, new possibilities. Make this one count.', category: 'motivational', time: 'morning', days: [1] },
  { text: 'Mondays are for fresh starts and bold moves.', category: 'motivational', time: 'morning', days: [1] },
  { text: 'Set the tone for the week. You have got this.', category: 'motivational', time: 'morning', days: [1] },
  { text: 'Tuesday: proof that you survived Monday and kept going.', category: 'compliments', time: 'morning', days: [2] },
  { text: 'Midweek check-in: you are closer than you think.', category: 'motivational', time: 'anytime', days: [3] },
  { text: 'Wednesday — the halfway point. You are doing great.', category: 'compliments', time: 'afternoon', days: [3] },
  { text: 'Almost there. Finish the week strong.', category: 'motivational', time: 'morning', days: [4] },
  { text: 'Thursday energy: the weekend is in sight.', category: 'motivational', time: 'afternoon', days: [4] },
  { text: 'You made it through the week. Be proud of yourself.', category: 'compliments', time: 'afternoon', days: [5] },
  { text: 'Happy Friday. You earned every bit of this weekend.', category: 'compliments', time: 'afternoon', days: [5] },
  { text: 'Enjoy the weekend — you have earned it.', category: 'compliments', time: 'anytime', days: [5, 6, 0] },
  { text: 'Saturdays are for recharging. Do what fills your cup.', category: 'mindfulness', time: 'morning', days: [6] },
  { text: 'Sunday: rest, reflect, and prepare to shine again.', category: 'mindfulness', time: 'morning', days: [0] },
  { text: 'Use today to set yourself up for a great week ahead.', category: 'motivational', time: 'afternoon', days: [0] },

  // ── Gratitude ─────────────────────────────────────────────────
  { text: 'What are three things you are grateful for right now?', category: 'gratitude', time: 'morning' },
  { text: 'Take a moment to appreciate how far you have come.', category: 'gratitude', time: 'evening' },
  { text: 'Gratitude turns what we have into enough.', category: 'gratitude', time: 'anytime' },
  { text: 'Today, notice one small thing that brings you joy.', category: 'gratitude', time: 'morning' },
  { text: 'Who made you smile today? Hold that feeling.', category: 'gratitude', time: 'evening' },
  { text: 'The ordinary moments are often the most beautiful.', category: 'gratitude', time: 'anytime' },
  { text: 'Appreciate the lessons hidden in challenges.', category: 'gratitude', time: 'anytime' },
  { text: 'You have so much to be grateful for.', category: 'gratitude', time: 'anytime' },
  { text: 'What felt impossible last year is your reality today.', category: 'gratitude', time: 'anytime' },
  { text: 'Let thankfulness be your default setting.', category: 'gratitude', time: 'morning' },
  { text: 'Reflect on a kind word someone said to you recently.', category: 'gratitude', time: 'evening' },
  { text: 'Your life is full of quiet miracles. Look for them.', category: 'gratitude', time: 'anytime' },
  { text: 'Name one person who made your life better this year.', category: 'gratitude', time: 'evening' },
  { text: 'The roof over your head, the food on your table — these are not small things.', category: 'gratitude', time: 'anytime' },
  { text: 'Think of a challenge that made you stronger. Be thankful for it.', category: 'gratitude', time: 'evening' },
  { text: 'Gratitude is the healthiest of all human emotions.', category: 'gratitude', attribution: 'Zig Ziglar', time: 'anytime' },
  { text: 'What is one thing you have today that you once wished for?', category: 'gratitude', time: 'morning' },
  { text: 'Every sunrise is an invitation to brighten someone\'s day.', category: 'gratitude', time: 'morning' },
  { text: 'Today was a gift. What was your favorite part?', category: 'gratitude', time: 'evening' },
  { text: 'The people in your life love you more than you realize.', category: 'gratitude', time: 'anytime' },
  { text: 'Notice the beauty in something you see every day.', category: 'gratitude', time: 'anytime' },
  { text: 'A grateful heart is a magnet for wonderful things.', category: 'gratitude', time: 'morning' },
  { text: 'What simple pleasure did you enjoy today?', category: 'gratitude', time: 'evening' },
  { text: 'Remember: someone out there is inspired by you.', category: 'gratitude', time: 'anytime' },

  // ── Mindfulness ───────────────────────────────────────────────
  { text: 'Take a deep breath. You are exactly where you need to be.', category: 'mindfulness', time: 'anytime' },
  { text: 'Be present. This moment is all there is.', category: 'mindfulness', time: 'anytime' },
  { text: 'Breathe in calm. Breathe out tension.', category: 'mindfulness', time: 'anytime' },
  { text: 'Slow down. There is no rush to be anywhere else.', category: 'mindfulness', time: 'evening' },
  { text: 'Notice five things you can see right now.', category: 'mindfulness', time: 'anytime' },
  { text: 'Let go of what you cannot control.', category: 'mindfulness', time: 'anytime' },
  { text: 'Your thoughts are clouds. Let them pass.', category: 'mindfulness', time: 'anytime' },
  { text: 'Peace is not the absence of chaos — it is the calm within.', category: 'mindfulness', time: 'anytime' },
  { text: 'Right now, in this moment, you are safe.', category: 'mindfulness', time: 'night' },
  { text: 'Silence is not empty — it is full of answers.', category: 'mindfulness', time: 'evening' },
  { text: 'Feel your feet on the ground. You are anchored.', category: 'mindfulness', time: 'anytime' },
  { text: 'Pause. Breathe. Continue.', category: 'mindfulness', time: 'anytime' },
  { text: 'You are not your thoughts. You are the awareness behind them.', category: 'mindfulness', time: 'anytime' },
  { text: 'Notice the space between your thoughts. That is where peace lives.', category: 'mindfulness', time: 'evening' },
  { text: 'Listen to the sounds around you without naming them.', category: 'mindfulness', time: 'anytime' },
  { text: 'Place one hand on your chest. Feel your heartbeat. You are alive.', category: 'mindfulness', time: 'anytime' },
  { text: 'The present moment is the only moment that truly exists.', category: 'mindfulness', time: 'anytime' },
  { text: 'Where is tension living in your body right now? Breathe into it.', category: 'mindfulness', time: 'afternoon' },
  { text: 'Between stimulus and response there is a space. In that space is your power.', category: 'mindfulness', attribution: 'Viktor Frankl', time: 'anytime' },
  { text: 'Inhale for four counts. Hold for four. Exhale for four. Repeat.', category: 'mindfulness', time: 'anytime' },
  { text: 'Do not borrow trouble from tomorrow. Today is enough.', category: 'mindfulness', time: 'evening' },
  { text: 'Everything is temporary. The good and the hard. Savor and endure.', category: 'mindfulness', time: 'anytime' },
  { text: 'You do not need to have it all figured out. Just take the next step.', category: 'mindfulness', time: 'anytime' },
  { text: 'Your breath is always there for you. Come back to it.', category: 'mindfulness', time: 'anytime' },
  { text: 'What is one thing you can do right now to take care of yourself?', category: 'mindfulness', time: 'afternoon' },
  { text: 'Nothing in nature blooms all year. Be patient with yourself.', category: 'mindfulness', time: 'anytime' },
  { text: 'Stillness is not laziness. It is how your soul catches up.', category: 'mindfulness', time: 'evening' },
  { text: 'You are allowed to outgrow spaces that no longer fit.', category: 'mindfulness', time: 'anytime' },

  // ── Season-aware entries ──────────────────────────────────────
  { text: 'Spring reminds us that new beginnings are always possible.', category: 'affirmations', time: 'anytime', season: 'spring' },
  { text: 'Like the flowers, you too are blooming at your own pace.', category: 'affirmations', time: 'anytime', season: 'spring' },
  { text: 'The earth is waking up. Let yourself wake up with it.', category: 'mindfulness', time: 'morning', season: 'spring' },
  { text: 'Fresh air, fresh starts. Spring is on your side.', category: 'motivational', time: 'morning', season: 'spring' },
  { text: 'Let the warmth of summer fill your spirit.', category: 'mindfulness', time: 'anytime', season: 'summer' },
  { text: 'Long days, warm nights. Soak it all in.', category: 'gratitude', time: 'evening', season: 'summer' },
  { text: 'Summer light reminds you there is always more day ahead.', category: 'motivational', time: 'morning', season: 'summer' },
  { text: 'The sun is out. Let it warm more than just your skin.', category: 'mindfulness', time: 'anytime', season: 'summer' },
  { text: 'Like autumn leaves, release what is ready to fall.', category: 'mindfulness', time: 'anytime', season: 'fall' },
  { text: 'Fall teaches us that letting go can be beautiful.', category: 'affirmations', time: 'anytime', season: 'fall' },
  { text: 'The world is changing colors. You are allowed to change too.', category: 'affirmations', time: 'anytime', season: 'fall' },
  { text: 'Harvest season — gather the fruits of your hard work.', category: 'gratitude', time: 'anytime', season: 'fall' },
  { text: 'Even in winter, growth happens beneath the surface.', category: 'affirmations', time: 'anytime', season: 'winter' },
  { text: 'The quiet of winter is an invitation to go inward.', category: 'mindfulness', time: 'evening', season: 'winter' },
  { text: 'Cold outside, warm within. Tend your inner fire.', category: 'affirmations', time: 'anytime', season: 'winter' },
  { text: 'Winter nights are for rest. Spring will come again.', category: 'mindfulness', time: 'night', season: 'winter' },

  // ── Night-specific ────────────────────────────────────────────
  { text: 'Rest well. Tomorrow is a fresh start.', category: 'affirmations', time: 'night' },
  { text: 'You accomplished enough today. Let yourself sleep.', category: 'mindfulness', time: 'night' },
  { text: 'The night is for recovery, not for worry.', category: 'mindfulness', time: 'night' },
  { text: 'Close your eyes knowing you did your best today.', category: 'affirmations', time: 'night' },
  { text: 'Let the quiet of the night settle your mind.', category: 'mindfulness', time: 'night' },
  { text: 'Sleep is not a luxury. It is how you recharge for greatness.', category: 'affirmations', time: 'night' },
  { text: 'Tonight, release every worry. Tomorrow you can try again.', category: 'mindfulness', time: 'night' },

  // ── Morning-specific ──────────────────────────────────────────
  { text: 'Good morning. Today is full of possibility.', category: 'affirmations', time: 'morning' },
  { text: 'The morning is yours. Set your intention and own it.', category: 'motivational', time: 'morning' },
  { text: 'Rise and shine — not because you have to, but because you get to.', category: 'gratitude', time: 'morning' },
  { text: 'What is one thing you want to feel today? Move toward it.', category: 'mindfulness', time: 'morning' },
  { text: 'A new day means a new chance to make something wonderful.', category: 'motivational', time: 'morning' },
  { text: 'Your morning routine is an act of self-love.', category: 'affirmations', time: 'morning' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<AffirmationsCategory, string> = {
  affirmations: 'Affirmation',
  compliments: 'Compliment',
  motivational: 'Motivation',
  gratitude: 'Gratitude',
  mindfulness: 'Mindfulness',
};

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getSeason(month: number, latitude: number): 'spring' | 'summer' | 'fall' | 'winter' {
  // Flip seasons for southern hemisphere
  const southern = latitude < 0;
  if (month >= 2 && month <= 4) return southern ? 'fall' : 'spring';
  if (month >= 5 && month <= 7) return southern ? 'winter' : 'summer';
  if (month >= 8 && month <= 10) return southern ? 'spring' : 'fall';
  return southern ? 'summer' : 'winter';
}

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Content selection hook — smart shuffled rotation with context scoring
// ---------------------------------------------------------------------------

function useAffirmationRotation(
  entries: Entry[],
  intervalMs: number,
  timeAware: boolean,
  now: Date,
  latitude: number,
): { entry: Entry; key: number } | null {
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<number[]>([]);

  // Build a scored & shuffled order whenever entries or time context changes
  const timeOfDay = getTimeOfDay(now.getHours());
  const dayOfWeek = now.getDay();
  const season = getSeason(now.getMonth(), latitude);

  useEffect(() => {
    if (entries.length === 0) { setOrder([]); setIndex(0); return; }

    // Score each entry: higher score = better contextual fit (integer scores only)
    const withScores = entries.map((entry, i) => {
      let score = 1; // base score

      if (timeAware) {
        // Time affinity bonus
        if (entry.time === timeOfDay) score += 3;
        else if (entry.time === 'anytime') score += 1;
        // wrong time-of-day: no bonus (stays in lowest tier)

        // Day-of-week bonus
        if (entry.days && entry.days.includes(dayOfWeek)) score += 4;
        else if (entry.days) score = 0; // day-specific entries hidden on wrong days

        // Season bonus
        if (entry.season === season) score += 2;
        else if (entry.season && entry.season !== season) score = 0; // wrong season = hide
      }

      return { index: i, score };
    });

    // Filter out zeroes (wrong day/season) then group by score tier, shuffle within each
    const valid = withScores.filter((s) => s.score > 0);
    const tiers = new Map<number, number[]>();
    for (const s of valid) {
      if (!tiers.has(s.score)) tiers.set(s.score, []);
      tiers.get(s.score)!.push(s.index);
    }
    const sortedTiers = [...tiers.entries()].sort((a, b) => b[0] - a[0]);
    const result: number[] = [];
    for (const [, indices] of sortedTiers) {
      result.push(...shuffle(indices));
    }
    setOrder(result);
    setIndex(0);
  }, [entries, timeAware, timeOfDay, dayOfWeek, season, latitude]);

  // Rotation timer — depends on full `order` reference so it restarts on any reshuffle
  useEffect(() => {
    if (order.length <= 1) return;
    const len = order.length;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % len);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, order]);

  if (order.length === 0) return null;
  const safeIndex = index % order.length;
  const entryIndex = order[safeIndex];
  const entry = entries[entryIndex];
  if (!entry) return null;
  return { entry, key: safeIndex };
}

// ---------------------------------------------------------------------------
// View components
// ---------------------------------------------------------------------------

function ElegantView({ entry, accentColor, showCategory }: { entry: Entry; accentColor: string; showCategory: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
      <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
      {showCategory && (
        <span className="uppercase tracking-[0.2em] opacity-40" style={{ fontSize: '0.55em' }}>
          {CATEGORY_LABELS[entry.category]}
        </span>
      )}
      <p className="text-center leading-relaxed font-light italic" style={{ fontSize: '1.3em' }}>
        {entry.text}
      </p>
      {entry.attribution && (
        <p className="opacity-50 font-light" style={{ fontSize: '0.75em' }}>
          &mdash; {entry.attribution}
        </p>
      )}
      <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
    </div>
  );
}

function CardView({ entry, accentColor, showCategory }: { entry: Entry; accentColor: string; showCategory: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-2 px-5 rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}08 100%)`,
        borderLeft: `3px solid ${accentColor}50`,
      }}
    >
      {showCategory && (
        <span className="uppercase tracking-[0.15em] opacity-40" style={{ fontSize: '0.55em' }}>
          {CATEGORY_LABELS[entry.category]}
        </span>
      )}
      <p className="text-center leading-relaxed" style={{ fontSize: '1.15em' }}>
        {entry.text}
      </p>
      {entry.attribution && (
        <p className="opacity-50" style={{ fontSize: '0.75em' }}>
          &mdash; {entry.attribution}
        </p>
      )}
    </div>
  );
}

function MinimalView({ entry, showCategory }: { entry: Entry; showCategory: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
      {showCategory && (
        <span className="uppercase tracking-[0.2em] opacity-30" style={{ fontSize: '0.55em' }}>
          {CATEGORY_LABELS[entry.category]}
        </span>
      )}
      <p className="text-center leading-relaxed font-light" style={{ fontSize: '1.2em' }}>
        {entry.text}
      </p>
      {entry.attribution && (
        <p className="opacity-40 font-light" style={{ fontSize: '0.7em' }}>
          &mdash; {entry.attribution}
        </p>
      )}
    </div>
  );
}

function TypewriterView({ entry, accentColor, showCategory }: { entry: Entry; accentColor: string; showCategory: boolean }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i > entry.text.length) {
        setDone(true);
        clearInterval(id);
      } else {
        setDisplayed(entry.text.slice(0, i));
      }
    }, 35);
    return () => clearInterval(id);
  }, [entry.text]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
      {showCategory && (
        <span className="uppercase tracking-[0.2em] opacity-40" style={{ fontSize: '0.55em' }}>
          {CATEGORY_LABELS[entry.category]}
        </span>
      )}
      <p className="text-center leading-relaxed font-mono" style={{ fontSize: '1.1em' }}>
        {displayed}
        {!done && (
          <span className="animate-pulse" style={{ color: accentColor }}>|</span>
        )}
      </p>
      <AnimatePresence>
        {done && entry.attribution && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="font-light"
            style={{ fontSize: '0.7em' }}
          >
            &mdash; {entry.attribution}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AffirmationsModule({ config, style, timezone, latitude }: AffirmationsModuleProps) {
  const now = useTZClock(timezone, 60_000);

  const view = config.view ?? 'elegant';
  const rotationMs = config.rotationIntervalMs ?? 15000;
  const showCategory = config.showCategoryLabel ?? false;
  const timeAware = config.timeAware ?? true;
  const accentColor = config.accentColor ?? '#a78bfa';

  // Merge built-in (filtered by category) + custom entries (always included)
  const allEntries = useMemo(() => {
    const categories = config.categories ?? ['affirmations', 'compliments', 'motivational'];
    const customEntries = config.customEntries ?? [];
    const categorySet = new Set(categories);
    const builtIn = BUILT_IN.filter((e) => categorySet.has(e.category));
    const custom: Entry[] = customEntries.map((c) => ({
      text: c.text,
      attribution: c.attribution,
      category: 'affirmations' as AffirmationsCategory,
      time: 'anytime' as const,
    }));
    return [...builtIn, ...custom];
  }, [config.categories, config.customEntries]);

  const result = useAffirmationRotation(allEntries, rotationMs, timeAware, now, latitude ?? 0);

  if (!result) {
    return (
      <ModuleWrapper style={style}>
        <div className="flex items-center justify-center h-full opacity-50">
          <p style={{ fontSize: '0.9em' }}>No affirmations configured</p>
        </div>
      </ModuleWrapper>
    );
  }

  const { entry, key } = result;

  let viewContent: React.ReactNode;
  switch (view) {
    case 'card':
      viewContent = <CardView entry={entry} accentColor={accentColor} showCategory={showCategory} />;
      break;
    case 'minimal':
      viewContent = <MinimalView entry={entry} showCategory={showCategory} />;
      break;
    case 'typewriter':
      viewContent = <TypewriterView entry={entry} accentColor={accentColor} showCategory={showCategory} />;
      break;
    case 'elegant':
    default:
      viewContent = <ElegantView entry={entry} accentColor={accentColor} showCategory={showCategory} />;
  }

  return (
    <ModuleWrapper style={style}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${key}-${entry.text}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="h-full"
        >
          {viewContent}
        </motion.div>
      </AnimatePresence>
    </ModuleWrapper>
  );
}
