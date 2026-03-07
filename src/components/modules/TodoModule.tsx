'use client';

import type { TodoConfig, ModuleStyle } from '@/types/config';
import ModuleWrapper from './ModuleWrapper';

interface TodoModuleProps {
  config: TodoConfig;
  style: ModuleStyle;
}

export default function TodoModule({ config, style }: TodoModuleProps) {
  const title = config.title ?? 'To Do';

  return (
    <ModuleWrapper style={style}>
      <div className="flex flex-col h-full">
        <h2 className="font-semibold mb-3" style={{ fontSize: '1.25em' }}>
          {title}
        </h2>
        <ul className="space-y-1">
          {config.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2"
              style={{
                textDecoration: item.completed ? 'line-through' : 'none',
                opacity: item.completed ? 0.5 : 1,
              }}
            >
              <span>{item.completed ? '\u2611' : '\u2610'}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </ModuleWrapper>
  );
}
