'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChoreChartConfig, ChoreCompletion, ChoreTimeOfDay } from '@/types/config';
import {
  resolveAssignee,
  choreAppliesToday,
  completionKey,
  todayStr,
  TIME_OF_DAY_META,
  getCurrentTimeOfDay,
} from '@/components/modules/chore-chart/types';
import ChoreIcon from '@/components/modules/chore-chart/ChoreIcon';

interface ChoresClientProps {
  config: ChoreChartConfig;
}

export default function ChoresClient({ config }: ChoresClientProps) {
  const members = useMemo(() => config.members ?? [], [config.members]);
  const chores = useMemo(() => config.chores ?? [], [config.chores]);
  const accentColor = config.accentColor ?? '#f59e0b';

  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? '');
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Fetch completions
  const fetchCompletions = useCallback(async () => {
    try {
      const res = await fetch('/api/chores');
      if (!res.ok) return;
      const data = await res.json();
      setCompletions(data.completions ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCompletions();
    const interval = setInterval(fetchCompletions, 15_000);
    return () => clearInterval(interval);
  }, [fetchCompletions]);

  // Re-render at midnight so date-derived values stay fresh
  const [dateKey, setDateKey] = useState(todayStr);
  useEffect(() => {
    const check = () => {
      const now = todayStr();
      if (now !== dateKey) setDateKey(now);
    };
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [dateKey]);

  // Completion lookup
  const completionSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of completions) {
      set.add(completionKey(c.choreId, c.memberId, c.date));
    }
    return set;
  }, [completions]);

  // Today's assignments for the selected member
  const myAssignments = useMemo(() => {
    const today = dateKey;
    const dayOfWeek = new Date().getDay();
    const assignments: { choreId: string; choreName: string; choreEmoji: string; timeOfDay: ChoreTimeOfDay; points: number; isCompleted: boolean }[] = [];

    for (const chore of chores) {
      if (!choreAppliesToday(chore, dayOfWeek, today)) continue;
      const assignees = resolveAssignee(chore, today);
      if (!assignees.includes(selectedMemberId)) continue;

      assignments.push({
        choreId: chore.id,
        choreName: chore.name,
        choreEmoji: chore.emoji,
        timeOfDay: chore.timeOfDay,
        points: chore.points,
        isCompleted: completionSet.has(completionKey(chore.id, selectedMemberId, today)),
      });
    }

    // Sort by time of day, then incomplete first
    return assignments.sort((a, b) => {
      const orderA = TIME_OF_DAY_META[a.timeOfDay].order;
      const orderB = TIME_OF_DAY_META[b.timeOfDay].order;
      if (orderA !== orderB) return orderA - orderB;
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return 0;
    });
  }, [chores, dateKey, selectedMemberId, completionSet]);

  // Group by time of day
  const grouped = useMemo(() => {
    const groups = new Map<ChoreTimeOfDay, typeof myAssignments>();
    for (const a of myAssignments) {
      const existing = groups.get(a.timeOfDay) ?? [];
      existing.push(a);
      groups.set(a.timeOfDay, existing);
    }
    return groups;
  }, [myAssignments]);

  const totalDone = myAssignments.filter((a) => a.isCompleted).length;
  const totalCount = myAssignments.length;

  // Per-member completion counts for tabs
  const memberTabStats = useMemo(() => {
    const today = dateKey;
    const dayOfWeek = new Date(today + 'T00:00:00').getDay();
    const stats: Record<string, { total: number; done: number }> = {};
    for (const member of members) {
      let total = 0;
      let done = 0;
      for (const c of chores) {
        if (!choreAppliesToday(c, dayOfWeek, today)) continue;
        if (!resolveAssignee(c, today).includes(member.id)) continue;
        total++;
        if (completionSet.has(completionKey(c.id, member.id, today))) done++;
      }
      stats[member.id] = { total, done };
    }
    return stats;
  }, [members, chores, dateKey, completionSet]);

  // Toggle completion
  const toggle = async (choreId: string) => {
    const today = todayStr();
    const key = completionKey(choreId, selectedMemberId, today);
    setToggling((prev) => new Set(prev).add(key));

    // Optimistic update
    setCompletions((prev) => {
      const idx = prev.findIndex(
        (c) => c.choreId === choreId && c.memberId === selectedMemberId && c.date === today,
      );
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { choreId, memberId: selectedMemberId, date: today, completedAt: new Date().toISOString() }];
    });

    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId, memberId: selectedMemberId, date: today }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompletions(data.completions ?? []);
      }
    } catch {
      fetchCompletions();
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentTimeOfDay = getCurrentTimeOfDay(new Date().getHours());

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="px-4 pt-4 pb-2">
          <div className="text-sm text-neutral-500">{dayName}</div>
          <h1 className="text-xl font-bold">Chores</h1>
        </div>

        {/* Member tabs */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {members.map((member) => {
            const isActive = member.id === selectedMemberId;
            const tabStats = memberTabStats[member.id];
            const allDone = (tabStats?.total ?? 0) > 0 && tabStats?.done === tabStats?.total;

            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all shrink-0"
                style={{
                  backgroundColor: isActive ? `${member.color}25` : 'rgba(255,255,255,0.05)',
                  border: isActive ? `2px solid ${member.color}` : '2px solid transparent',
                  color: isActive ? member.color : 'rgba(255,255,255,0.6)',
                }}
              >
                {member.emoji ? (
                  <ChoreIcon value={member.emoji} size={20} color={isActive ? member.color : 'rgba(255,255,255,0.6)'} />
                ) : (
                  <span className="text-lg font-semibold" style={{ color: isActive ? member.color : undefined }}>{member.name[0]}</span>
                )}
                <span className="text-sm font-medium">{member.name}</span>
                {allDone && <span className="text-xs">&#10003;</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-400">
            {totalDone}/{totalCount} complete
          </span>
          {totalCount > 0 && totalDone === totalCount && (
            <span className="text-green-400 font-medium">All done! &#127881;</span>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-neutral-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: totalCount > 0 ? `${(totalDone / totalCount) * 100}%` : '0%',
              backgroundColor: selectedMember?.color ?? accentColor,
            }}
          />
        </div>
      </div>

      {/* Chore list */}
      <div className="px-4 pb-8 space-y-4">
        {myAssignments.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">&#127796;</div>
            <p className="text-neutral-400">No chores today!</p>
          </div>
        )}

        {(['morning', 'afternoon', 'evening', 'anytime'] as ChoreTimeOfDay[]).map((section) => {
          const items = grouped.get(section);
          if (!items?.length) return null;

          const meta = TIME_OF_DAY_META[section];
          const isCurrent = section === currentTimeOfDay;
          const sectionAllDone = items.every((a) => a.isCompleted);

          return (
            <div key={section}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{meta.icon}</span>
                <span
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{
                    color: isCurrent ? accentColor : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {meta.label}
                </span>
                {sectionAllDone && (
                  <span className="text-xs text-green-500 ml-auto">&#10003;</span>
                )}
              </div>

              {/* Chore rows */}
              <div className="space-y-1.5">
                {items.map((assignment) => {
                  const key = completionKey(assignment.choreId, selectedMemberId, dateKey);
                  const isToggling = toggling.has(key);

                  return (
                    <button
                      key={assignment.choreId}
                      onClick={() => toggle(assignment.choreId)}
                      disabled={isToggling}
                      className="w-full flex items-center gap-3 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        padding: '14px 16px',
                        backgroundColor: assignment.isCompleted
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(255,255,255,0.06)',
                        opacity: isToggling ? 0.6 : 1,
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                        style={{
                          backgroundColor: assignment.isCompleted
                            ? selectedMember?.color ?? accentColor
                            : 'transparent',
                          border: assignment.isCompleted
                            ? 'none'
                            : '2px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        {assignment.isCompleted && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3.5 8L6.5 11L12.5 5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Icon */}
                      {assignment.choreEmoji && (
                        <span className="shrink-0">
                          <ChoreIcon value={assignment.choreEmoji} size={22} color="currentColor" />
                        </span>
                      )}

                      {/* Name */}
                      <span
                        className="flex-1 text-left text-base"
                        style={{
                          textDecoration: assignment.isCompleted ? 'line-through' : 'none',
                          opacity: assignment.isCompleted ? 0.4 : 1,
                        }}
                      >
                        {assignment.choreName}
                      </span>

                      {/* Points */}
                      {config.showPoints && assignment.points > 1 && (
                        <span
                          className="text-xs shrink-0 px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            opacity: assignment.isCompleted ? 0.3 : 0.5,
                          }}
                        >
                          {assignment.points}pt
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
