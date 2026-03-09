'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { TodoistConfig, TodoistGroupBy, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

// ─── Types ───

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  priority: number; // 1=normal(p4), 2=p3, 3=p2, 4=urgent(p1)
  due: {
    date: string;
    datetime: string | null;
    isRecurring: boolean;
  } | null;
  labels: string[];
  labelColors: Record<string, string>;
  projectId: string;
  projectName: string;
  projectColor: string;
  sectionName: string;
  parentId: string | null;
  order: number;
  commentCount: number;
}

interface TodoistData {
  tasks: TodoistTask[];
  projects: { id: string; name: string; color: string; order: number }[];
}

interface TodoistModuleProps {
  config: TodoistConfig;
  style: ModuleStyle;
}

// ─── Constants ───

const PRIORITY_COLORS: Record<number, string> = {
  4: '#d1453b', // P1 urgent
  3: '#eb8909', // P2 high
  2: '#246fe0', // P3 medium
  1: 'transparent', // P4 normal
};

const PRIORITY_LABELS: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Normal',
};

// ─── Date Helpers ───

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function formatDueDate(due: TodoistTask['due'], now: Date): { text: string; color: string } {
  if (!due) return { text: '', color: '' };

  const dueDate = new Date(due.datetime ?? due.date + 'T23:59:59');
  const diff = daysBetween(dueDate, now);

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    return {
      text: absDiff === 1 ? 'Yesterday' : `${absDiff}d overdue`,
      color: '#ef4444',
    };
  }
  if (diff === 0) {
    if (due.datetime) {
      const h = dueDate.getHours();
      const m = dueDate.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return {
        text: `Today ${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
        color: '#f59e0b',
      };
    }
    return { text: 'Today', color: '#f59e0b' };
  }
  if (diff === 1) return { text: 'Tomorrow', color: '#22c55e' };
  if (diff <= 7) {
    const dayName = dueDate.toLocaleDateString('en-US', { weekday: 'short' });
    return { text: dayName, color: '#6b7280' };
  }
  const formatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { text: formatted, color: '#6b7280' };
}

function getDueDateGroup(due: TodoistTask['due'], now: Date): string {
  if (!due) return 'No Date';
  const dueDate = new Date(due.datetime ?? due.date + 'T23:59:59');
  const diff = daysBetween(dueDate, now);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return 'This Week';
  return 'Upcoming';
}

// ─── Sorting & Filtering ───

function filterTasks(
  tasks: TodoistTask[],
  config: TodoistConfig,
): TodoistTask[] {
  let filtered = tasks;

  // Filter out subtasks if hidden
  if (!config.showSubtasks) {
    filtered = filtered.filter((t) => !t.parentId);
  }

  // Filter by project
  if (config.projectFilter) {
    const names = config.projectFilter.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (names.length > 0) {
      filtered = filtered.filter((t) => names.includes(t.projectName.toLowerCase()));
    }
  }

  // Filter by label
  if (config.labelFilter) {
    const names = config.labelFilter.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (names.length > 0) {
      filtered = filtered.filter((t) =>
        t.labels.some((l) => names.includes(l.toLowerCase())),
      );
    }
  }

  // Filter tasks without due dates
  if (!config.showNoDueDate) {
    filtered = filtered.filter((t) => t.due !== null);
  }

  return filtered;
}

function sortTasks(tasks: TodoistTask[], sortBy: string): TodoistTask[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'priority':
      sorted.sort((a, b) => b.priority - a.priority);
      break;
    case 'due_date':
      sorted.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return new Date(a.due.datetime ?? a.due.date).getTime() -
          new Date(b.due.datetime ?? b.due.date).getTime();
      });
      break;
    case 'alphabetical':
      sorted.sort((a, b) => a.content.localeCompare(b.content));
      break;
    default:
      sorted.sort((a, b) => a.order - b.order);
  }
  return sorted;
}

interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  tasks: TodoistTask[];
}

function groupTasks(
  tasks: TodoistTask[],
  groupBy: TodoistGroupBy,
  now: Date,
): TaskGroup[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', tasks }];
  }

  const map = new Map<string, TaskGroup>();
  const order: string[] = [];

  for (const task of tasks) {
    let key: string;
    let label: string;
    let color: string | undefined;

    switch (groupBy) {
      case 'project':
        key = task.projectId;
        label = task.projectName;
        color = task.projectColor;
        break;
      case 'priority':
        key = `p${task.priority}`;
        label = PRIORITY_LABELS[task.priority] ?? 'Normal';
        color = PRIORITY_COLORS[task.priority];
        break;
      case 'date':
        label = getDueDateGroup(task.due, now);
        key = label;
        if (label === 'Overdue') color = '#ef4444';
        else if (label === 'Today') color = '#f59e0b';
        else if (label === 'Tomorrow') color = '#22c55e';
        break;
      case 'label':
        if (task.labels.length === 0) {
          key = '__no_label';
          label = 'No Label';
        } else {
          key = task.labels[0];
          label = task.labels[0];
          color = task.labelColors[task.labels[0]];
        }
        break;
      default:
        key = 'all';
        label = '';
    }

    if (!map.has(key)) {
      map.set(key, { key, label, color, tasks: [] });
      order.push(key);
    }
    map.get(key)!.tasks.push(task);
  }

  // Sort groups for date grouping in logical order
  if (groupBy === 'date') {
    const dateOrder = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Upcoming', 'No Date'];
    order.sort((a, b) => dateOrder.indexOf(a) - dateOrder.indexOf(b));
  }
  if (groupBy === 'priority') {
    order.sort((a, b) => {
      const pa = Number(a.replace('p', ''));
      const pb = Number(b.replace('p', ''));
      return pb - pa;
    });
  }

  return order.map((k) => map.get(k)!);
}

// ─── Subtask Tree ───

interface TaskNode {
  task: TodoistTask;
  children: TaskNode[];
}

function buildTaskTree(tasks: TodoistTask[]): TaskNode[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const roots: TaskNode[] = [];
  const childrenMap = new Map<string, TaskNode[]>();

  for (const task of tasks) {
    const node: TaskNode = { task, children: [] };
    if (task.parentId && taskMap.has(task.parentId)) {
      if (!childrenMap.has(task.parentId)) childrenMap.set(task.parentId, []);
      childrenMap.get(task.parentId)!.push(node);
    } else {
      roots.push(node);
    }
  }

  // Attach children
  function attachChildren(node: TaskNode) {
    node.children = childrenMap.get(node.task.id) ?? [];
    node.children.forEach(attachChildren);
  }
  roots.forEach(attachChildren);

  return roots;
}

// ─── Task Row ───

function TaskRow({
  task,
  config,
  now,
  depth = 0,
}: {
  task: TaskNode;
  config: TodoistConfig;
  now: Date;
  depth?: number;
}) {
  const t = task.task;
  const dueInfo = formatDueDate(t.due, now);
  const isOverdue = t.due
    ? daysBetween(new Date(t.due.datetime ?? t.due.date + 'T23:59:59'), now) < 0
    : false;
  const priorityColor = PRIORITY_COLORS[t.priority];

  return (
    <>
      <div
        className="flex items-start gap-2 rounded-lg px-2.5 py-2 group"
        style={{
          backgroundColor: isOverdue
            ? 'rgba(239, 68, 68, 0.08)'
            : 'rgba(255,255,255,0.04)',
          marginLeft: depth * 20,
        }}
      >
        {/* Priority bar */}
        <div
          className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5"
          style={{
            backgroundColor: priorityColor,
            minHeight: 16,
          }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="leading-tight font-medium"
              style={{ fontSize: '0.85em' }}
            >
              {depth > 0 && (
                <span className="opacity-30 mr-1" style={{ fontSize: '0.8em' }}>
                  ↳
                </span>
              )}
              {t.content}
              {t.due?.isRecurring && (
                <span
                  className="opacity-40 ml-1.5 inline-block"
                  style={{ fontSize: '0.75em' }}
                  title="Recurring"
                >
                  ↻
                </span>
              )}
            </p>

            {/* Due date badge */}
            {dueInfo.text && (
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap"
                style={{
                  fontSize: '0.65em',
                  color: dueInfo.color,
                  backgroundColor: `${dueInfo.color}15`,
                }}
              >
                {dueInfo.text}
              </span>
            )}
          </div>

          {/* Description */}
          {config.showDescription && t.description && (
            <p
              className="opacity-40 leading-snug mt-0.5 line-clamp-2"
              style={{ fontSize: '0.7em' }}
            >
              {t.description}
            </p>
          )}

          {/* Meta row: project + labels */}
          {(config.showProject || config.showLabels) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {config.showProject && (
                <span
                  className="flex items-center gap-1 opacity-50"
                  style={{ fontSize: '0.65em' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: t.projectColor }}
                  />
                  {t.projectName}
                </span>
              )}
              {config.showLabels &&
                t.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full px-1.5 py-px"
                    style={{
                      fontSize: '0.6em',
                      backgroundColor: `${t.labelColors[label] ?? '#808080'}25`,
                      color: t.labelColors[label] ?? '#808080',
                    }}
                  >
                    {label}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {config.showSubtasks &&
        task.children.map((child) => (
          <TaskRow
            key={child.task.id}
            task={child}
            config={config}
            now={now}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

// ─── List View ───

function ListView({
  tasks,
  config,
  now,
}: {
  tasks: TodoistTask[];
  config: TodoistConfig;
  now: Date;
}) {
  const groups = useMemo(
    () => groupTasks(tasks, config.groupBy, now),
    [tasks, config.groupBy, now],
  );

  return (
    <div className="flex flex-col gap-3 overflow-hidden h-full">
      {groups.map((group) => {
        const tree = buildTaskTree(group.tasks);
        return (
          <div key={group.key}>
            {/* Group header */}
            {group.label && (
              <div className="flex items-center gap-2 mb-1.5">
                {group.color && group.color !== 'transparent' && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span
                  className="font-semibold uppercase tracking-wider shrink-0"
                  style={{
                    fontSize: '0.65em',
                    opacity: group.key === 'Overdue' ? 1 : 0.6,
                    color:
                      group.key === 'Overdue' ? '#ef4444' : undefined,
                  }}
                >
                  {group.label}
                </span>
                <span
                  className="opacity-30"
                  style={{ fontSize: '0.6em' }}
                >
                  {group.tasks.length}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              {tree.map((node) => (
                <TaskRow
                  key={node.task.id}
                  task={node}
                  config={config}
                  now={now}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Board View ───

function BoardView({
  tasks,
  config,
  now,
}: {
  tasks: TodoistTask[];
  config: TodoistConfig;
  now: Date;
}) {
  const groupBy = config.groupBy === 'none' ? 'project' : config.groupBy;
  const allGroups = useMemo(
    () => groupTasks(tasks, groupBy as TodoistGroupBy, now),
    [tasks, groupBy, now],
  );
  // Cap at 3 columns to avoid broken multi-row layouts in fixed-height widget
  const groups = allGroups.slice(0, 3);

  return (
    <div
      className="grid gap-2 h-full overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${groups.length}, 1fr)`,
      }}
    >
      {groups.map((group) => (
        <div
          key={group.key}
          className="flex flex-col rounded-lg overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          {/* Column header */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.06]">
            {group.color && group.color !== 'transparent' && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
            )}
            <span
              className="font-semibold truncate"
              style={{ fontSize: '0.75em' }}
            >
              {group.label}
            </span>
            <span
              className="opacity-30 shrink-0"
              style={{ fontSize: '0.65em' }}
            >
              {group.tasks.length}
            </span>
          </div>

          {/* Task cards */}
          <div className="flex flex-col gap-1 p-1.5 overflow-hidden flex-1">
            {group.tasks.map((t) => {
              const dueInfo = formatDueDate(t.due, now);
              const isOverdue = t.due
                ? daysBetween(
                    new Date(t.due.datetime ?? t.due.date + 'T23:59:59'),
                    now,
                  ) < 0
                : false;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-1.5 rounded-md px-2 py-1.5"
                  style={{
                    backgroundColor: isOverdue
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    className="w-[3px] self-stretch rounded-full shrink-0"
                    style={{
                      backgroundColor: PRIORITY_COLORS[t.priority],
                      minHeight: 14,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="leading-tight font-medium truncate"
                      style={{ fontSize: '0.75em' }}
                    >
                      {t.content}
                    </p>
                    {dueInfo.text && (
                      <span
                        className="opacity-70 mt-0.5 block"
                        style={{
                          fontSize: '0.6em',
                          color: dueInfo.color,
                        }}
                      >
                        {dueInfo.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Focus View ───

function FocusView({
  allTasks,
  config,
  now,
}: {
  allTasks: TodoistTask[];
  config: TodoistConfig;
  now: Date;
}) {
  // Show only today + overdue tasks
  const focusTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (!t.due) return false;
      const dueDate = new Date(t.due.datetime ?? t.due.date + 'T23:59:59');
      const diff = daysBetween(dueDate, now);
      return diff <= 0; // today or overdue
    });
  }, [allTasks, now]);

  const overdue = focusTasks.filter((t) => {
    const dueDate = new Date(t.due!.datetime ?? t.due!.date + 'T23:59:59');
    return daysBetween(dueDate, now) < 0;
  });
  const today = focusTasks.filter((t) => {
    const dueDate = new Date(t.due!.datetime ?? t.due!.date + 'T23:59:59');
    return daysBetween(dueDate, now) === 0;
  });

  const totalToday = today.length + overdue.length;

  // Estimate how much of today's work is done based on time of day
  // (Todoist API only returns active tasks, so we can't see completed ones)
  // Show the remaining count as the metric instead
  const tree = buildTaskTree(focusTasks);

  return (
    <div className="flex flex-col h-full">
      {/* Remaining tasks header */}
      <div className="flex items-center justify-center py-3">
        <div className="text-center">
          <span className="font-bold block" style={{ fontSize: '2em', opacity: totalToday === 0 ? 0.3 : 0.9 }}>
            {totalToday}
          </span>
          <span className="opacity-50" style={{ fontSize: '0.7em' }}>
            {totalToday === 0
              ? 'All clear for today!'
              : `task${totalToday !== 1 ? 's' : ''} remaining`}
          </span>
        </div>
      </div>

      {totalToday === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="block opacity-20" style={{ fontSize: '2em' }}>
              ✓
            </span>
            <p className="opacity-30 mt-1" style={{ fontSize: '0.8em' }}>
              You&apos;re all caught up!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-hidden flex-1">
          {/* Overdue section */}
          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-semibold uppercase tracking-wider"
                  style={{ fontSize: '0.65em', color: '#ef4444' }}
                >
                  Overdue
                </span>
                <span className="opacity-30" style={{ fontSize: '0.6em' }}>
                  {overdue.length}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                {tree
                  .filter((n) => overdue.some((t) => t.id === n.task.id))
                  .map((node) => (
                    <TaskRow
                      key={node.task.id}
                      task={node}
                      config={config}
                      now={now}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Today section */}
          {today.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-semibold uppercase tracking-wider"
                  style={{ fontSize: '0.65em', color: '#f59e0b' }}
                >
                  Today
                </span>
                <span className="opacity-30" style={{ fontSize: '0.6em' }}>
                  {today.length}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                {tree
                  .filter((n) => today.some((t) => t.id === n.task.id))
                  .map((node) => (
                    <TaskRow
                      key={node.task.id}
                      task={node}
                      config={config}
                      now={now}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

// Custom fetch hook that surfaces errors instead of silently swallowing them.
function useTodoistData(refreshMs: number) {
  const [data, setData] = useState<TodoistData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/todoist');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `API error ${res.status}`);
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError('Failed to connect to Todoist');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, fetchData]);

  return { data, error, refetch: fetchData };
}

export default function TodoistModule({ config, style }: TodoistModuleProps) {
  const { data, error } = useTodoistData(config.refreshIntervalMs ?? 300000);

  const { tasks, filteredAll, totalCount } = useMemo(() => {
    if (!data?.tasks) return { tasks: [] as TodoistTask[], filteredAll: [] as TodoistTask[], totalCount: 0 };
    const filtered = filterTasks(data.tasks, config);
    const sorted = sortTasks(filtered, config.sortBy);
    const limited = sorted.slice(0, config.maxTasks ?? 30);
    return { tasks: limited, filteredAll: filtered, totalCount: filtered.length };
  }, [data, config]);

  const title = config.title || 'Todoist';
  const viewMode = config.viewMode ?? 'list';
  // Stabilize `now` so useMemo deps in child views don't bust on every render.
  // Recompute only when fresh data arrives from the API.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [data]);

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold" style={{ fontSize: '1.1em' }}>
            {title}
          </h2>
          {data && (
            <span className="opacity-40" style={{ fontSize: '0.7em' }}>
              {totalCount} task{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Subtle divider under header */}
        {data && viewMode !== 'focus' && (
          <div className="mb-3">
            <div className="w-full h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>
        )}

        {/* Content */}
        {!data ? (
          <div className="flex-1 flex items-center justify-center">
            {error ? (
              <div className="text-center px-4">
                <p className="opacity-60 mb-1" style={{ fontSize: '0.8em', color: '#ef4444' }}>
                  Error
                </p>
                <p className="opacity-40" style={{ fontSize: '0.65em' }}>
                  {error}
                </p>
              </div>
            ) : (
              <p className="opacity-30" style={{ fontSize: '0.8em' }}>
                Loading...
              </p>
            )}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="block opacity-20" style={{ fontSize: '2em' }}>
                ✓
              </span>
              <p className="opacity-30 mt-1" style={{ fontSize: '0.8em' }}>
                No tasks to show
              </p>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <BoardView tasks={tasks} config={config} now={now} />
        ) : viewMode === 'focus' ? (
          <FocusView allTasks={filteredAll} config={config} now={now} />
        ) : (
          <ListView tasks={tasks} config={config} now={now} />
        )}
      </div>
    </ModuleWrapper>
  );
}
