import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  isAlert: boolean;
  resolve: ((value: boolean) => void) | null;

  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  respond: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: { message: '' },
  isAlert: false,
  resolve: null,

  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      const options = typeof opts === 'string' ? { message: opts } : opts;
      set({ open: true, isAlert: false, options, resolve });
    }),

  alert: (message, title) =>
    new Promise<void>((resolve) => {
      set({
        open: true,
        isAlert: true,
        options: {
          title: title ?? 'Notice',
          message,
          confirmLabel: 'OK',
        },
        resolve: () => resolve(),
      });
    }),

  respond: (value) => {
    const { resolve } = get();
    resolve?.(value);
    set({ open: false, resolve: null });
  },
}));
