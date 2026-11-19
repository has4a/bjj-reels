export type ReelKind = 'reel' | 'p' | 'tv' | 'share' | 'other';
export type Status = 'new' | 'drill' | 'learned';
export type Gi = 'gi' | 'nogi' | 'both';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Source = 'export' | 'manual';

export interface Reel {
  /** Kľúč na duplicity: Instagram shortcode, "share:<kód>" alebo "url:<normalizovaná URL>" */
  id: string;
  url: string;
  kind: ReelKind;

  // --- z Instagram exportu (môžu chýbať pri ručne pridaných) ---
  author?: string;
  authorName?: string;
  caption?: string;
  title?: string;
  hashtags: string[];
  igCollections: string[];
  /** čas uloženia na Instagrame (ms) */
  savedAt?: number;

  // --- meta appky ---
  addedAt: number;
  updatedAt: number;
  source: Source;

  // --- moje triedenie ---
  positions: string[];
  types: string[];
  gi: Gi | null;
  level: Level | null;
  tags: string[];
  notes: string;
  status: Status;
  favorite: boolean;
  /** "Mimo BJJ" – skryté zo zoznamu a z triedenia */
  hidden: boolean;
}

export interface Settings {
  positions: string[];
  types: string[];
  /** IG kolekcie, ktoré sa pri importe rátajú ako BJJ (null = ešte nevybrané) */
  bjjCollections: string[] | null;
  /** všetky IG kolekcie videné pri poslednom importe (nové kolekcie sa predvyberú podľa názvu) */
  knownCollections: string[];
  /** náhľad cez oficiálny Instagram embed v rýchlom triedení */
  preview: boolean;
}

export const STATUSES: Status[] = ['new', 'drill', 'learned'];
export const GIS: Gi[] = ['gi', 'nogi', 'both'];
export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export const STATUS_LABEL: Record<Status, string> = { new: 'Nové', drill: 'Na drilovanie', learned: 'Naučené' };
export const GI_LABEL: Record<Gi, string> = { gi: 'Gi', nogi: 'No-gi', both: 'Obe' };
export const LEVEL_LABEL: Record<Level, string> = { beginner: 'Začiatočník', intermediate: 'Stredný', advanced: 'Pokročilý' };
export const KIND_LABEL: Record<ReelKind, string> = { reel: 'Reel', p: 'Post', tv: 'TV', share: 'Odkaz', other: 'Web' };

export const DEFAULT_POSITIONS = [
  'closed guard',
  'open guard',
  'half guard',
  'butterfly guard',
  'mount',
  'side control',
  'knee on belly',
  'north-south',
  'back',
  'turtle',
  'standing',
  'leg entanglement',
];

export const DEFAULT_TYPES = [
  'sweep',
  'submission',
  'escape',
  'takedown',
  'pass',
  'transition',
  'back take',
  'guard retention',
  'drill',
  'concept',
];

export const DEFAULT_SETTINGS: Settings = {
  positions: DEFAULT_POSITIONS,
  types: DEFAULT_TYPES,
  bjjCollections: null,
  knownCollections: [],
  preview: false,
};
