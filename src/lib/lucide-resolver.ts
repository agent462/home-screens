import type { LucideIcon } from 'lucide-react';
import {
  // Icons already used in module-registry.ts
  Clock, CalendarDays, CloudSun, Hourglass, Laugh, Type, ImageIcon,
  Quote, ListTodo, StickyNote, HandMetal,
  Newspaper, TrendingUp, Bitcoin, BookOpen, History,
  Moon, Sunrise, Image, QrCode, BarChart3, Car, Trophy, Wind,
  ListChecks, CloudRain, CalendarRange, Trash2, Medal, Sparkles,
  Calendar, Globe, UtensilsCrossed, Flag, ClipboardList,
  // Additional curated icons for plugins
  Puzzle, Radar, Music, Tv, Radio, Gauge, Thermometer, Droplets,
  Zap, Bell, MapPin, Navigation, Wifi, Heart, Star,
  Camera, Video, Mic, Volume2, Headphones, Monitor,
} from 'lucide-react';

/**
 * Curated icon map — restricted to icons already imported in the app plus
 * ~20 common ones. Importing all ~1400 Lucide icons would add ~200KB.
 * Unknown icon names fall back to Puzzle.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Clock, CalendarDays, CloudSun, Hourglass, Laugh, Type, ImageIcon,
  Quote, ListTodo, StickyNote, HandMetal,
  Newspaper, TrendingUp, Bitcoin, BookOpen, History,
  Moon, Sunrise, Image, QrCode, BarChart3, Car, Trophy, Wind,
  ListChecks, CloudRain, CalendarRange, Trash2, Medal, Sparkles,
  Calendar, Globe, UtensilsCrossed, Flag, ClipboardList,
  Puzzle, Radar, Music, Tv, Radio, Gauge, Thermometer, Droplets,
  Zap, Bell, MapPin, Navigation, Wifi, Heart, Star,
  Camera, Video, Mic, Volume2, Headphones, Monitor,
};

/** Resolve a lucide icon name string to a component. Falls back to Puzzle for unknown names. */
export function resolveLucideIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Puzzle;
}
