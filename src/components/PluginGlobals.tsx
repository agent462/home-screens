'use client';

import { useLayoutEffect } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Expose React, ReactDOM, and a shared SDK object on `window` so IIFE plugin
 * bundles can use them as externals without bundling their own copies.
 *
 * This must run before any plugin bundles execute.
 */
export default function PluginGlobals() {
  useLayoutEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.React = React;
    win.ReactDOM = ReactDOM;
    win.__HS_SDK__ = {
      // Shared UI components and CSS class strings will be populated
      // after the editor module loads. Plugins can access them for
      // building custom config panels.
      INPUT_CLASS: 'w-full px-2 py-1 text-xs bg-neutral-800 border border-neutral-600 rounded text-neutral-200',
      NESTED_INPUT_CLASS: 'w-full px-2 py-0.5 text-xs bg-neutral-700 border border-neutral-600 rounded text-neutral-200',
    };
  }, []);

  return null;
}
