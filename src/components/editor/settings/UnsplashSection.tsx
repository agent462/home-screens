'use client';

interface UnsplashSettings {
  unsplashKey: string;
}

interface Props {
  values: UnsplashSettings;
  onChange: (updates: Partial<UnsplashSettings>) => void;
}

export default function UnsplashSection({ values, onChange }: Props) {
  const { unsplashKey } = values;

  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-300 mb-3 uppercase tracking-wider">
        Backgrounds (Unsplash)
      </h3>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-neutral-400">
            Access Key
            <span className="text-neutral-500 ml-1">
              — free at unsplash.com/developers
            </span>
          </span>
          <input
            type="password"
            value={unsplashKey}
            onChange={(e) => onChange({ unsplashKey: e.target.value })}
            placeholder="Paste your Unsplash access key"
            className="mt-1 block w-full rounded-md bg-neutral-800 border border-neutral-600 text-sm text-neutral-200 px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </label>
        <p className="text-xs text-neutral-500">
          Enables browsing thousands of free HD photos by category in the background picker.
          50 requests/hour on the free tier.
        </p>
      </div>
    </section>
  );
}
