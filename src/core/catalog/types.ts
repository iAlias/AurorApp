// ——— Catalogo ———
export type CategoryId = 'MOT'|'CRE'|'SEN'|'COG'|'MUS'|'SIM'|'ACQ'|'NAT'|'CUC'|'CAL';
export type Energy = 'alta'|'media'|'bassa';
export type Place = 'casa'|'esterno'|'entrambi';
export type Weather = 'sole'|'pioggia'|'caldo';
export type InterestTag = 'animali'|'disegno'|'musica'|'acqua'|'costruzioni'
                 |'travestimenti'|'natura'|'libri'|'cucinare'|'movimento';
export type SpaceTag = 'casa'|'giardino'|'terrazzo'|'parco';

export interface Activity {
  id: string;                 // 'MOT-01' … 'CAL-15'
  category: CategoryId;
  title: string;
  emoji: string;              // per le card
  durationMin: number;        // 15–60
  energy: Energy;
  place: Place;
  requiresDry: boolean;       // serve esterno asciutto
  heatFriendly: boolean;      // ideale col caldo (acqua/ombra/fresco)
  mess: 0|1|2;                // 0 pulita, 1 media, 2 si sporca
  materials: string[];
  steps: string[];            // 2–4 passi, rivolti al genitore
  develops: string[];         // obiettivi di sviluppo, es. ['motricità fine','linguaggio']
  variation: string;          // "In più"
  interests: InterestTag[];
  family: boolean;            // adatta al weekend famiglia
  safety?: string;            // nota di sicurezza
}

// ——— Profilo e impostazioni ———
export interface ChildProfile {
  id: string; name: string; avatarId: string;
  birthdate: string;          // ISO yyyy-MM-dd
  interests: InterestTag[];   // ≥1
  spaces: SpaceTag[];         // ≥1
  vacationStart: string; vacationEnd: string;  // ISO
  createdAt: string;          // ISO datetime — entra nel seed
}

export interface RoutineSettings {
  wakeTime: string;           // 'HH:mm' — default '09:00'
  breakfastEnd: string;       //           default '09:45'
  morningSnackStart: string;  //           default '11:00'
  morningSnackEnd: string;    //           default '11:20'
  lunchStart: string;         //           default '13:00'
  napStart: string;           //           default '14:00'
  napMinutes: number;         // 30–180 —  default 120
  afternoonSnackEnd: string;  //           default '16:30'
  preDinnerMinutes: number;   // bagnetto — default 30
  dinnerStart: string;        //           default '19:30'
  bedTime: string;            //           default '21:00'
}

export interface MealSettings { lunchMinutes: number; dinnerMinutes: number;  // 15–90, default 60
                         soundsOn: boolean; volume: number; }          // default true, 0.8
export interface Settings { routine: RoutineSettings; meals: MealSettings;
                     reducedMotion: 'system'|'on'|'off'; }

// ——— Piani e stato ———
export type SlotId = 'M1'|'M2'|'P1'|'P2'|'SERA';
export type SlotStatus = 'planned'|'done'|'skipped';

export interface PlannedSlot { slotId: SlotId; activityId: string;
                        status: SlotStatus; swapCount: number; }

export interface DayPlan {
  date: string;               // ISO yyyy-MM-dd
  familyDay: boolean;         // sab/dom
  special?: { kind: 'mare'|'nonni'|'viaggio'|'altro'; label?: string };
  weather: Weather;           // default 'sole'
  regenNonce: number;         // incrementa a ogni "Rigenera giorno"
  slots: PlannedSlot[];       // 5 feriale, 2 weekend, 0 speciale
}

export interface TimerSession {
  meal: 'pranzo'|'cena';
  dateISO: string;
  startedAt: number;          // epoch ms — fonte di verità
  durationMs: number;
  pausedAt: number | null;    // epoch ms se in pausa
  pausedTotalMs: number;      // pause accumulate
  status: 'running'|'paused'|'celebrating'|'done';
}

export type BadgeId =
  | 'prima-stella' | 'tre-di-fila' | 'settimana-arcobaleno' | 'mese-magico'
  | 'piccola-artista' | 'esploratrice' | 'sirenetta' | 'ballerina'
  | 'chef-stellata' | 'scienziata' | 'campionessa' | 'attrice' | 'buona-forchetta';

export interface ProgressState {
  streak: number;
  lastStreakDate: string | null;
  badges: Partial<Record<BadgeId, string>>;   // id → ISO sblocco
  doneByCategory: Record<CategoryId, number>;
  mealTimersCompleted: number;
}

// ——— Persistenza ———
export interface StorageEnvelope {
  schemaVersion: 1;
  savedAt: string;
  profile: ChildProfile | null;   // null = wizard da fare
  settings: Settings;
  plans: Record<string, DayPlan>; // chiave = date ISO
  progress: ProgressState;
  timer: TimerSession | null;
}

// ——— Costanti ———
export const ALL_INTERESTS: InterestTag[] = ['animali','disegno','musica','acqua',
  'costruzioni','travestimenti','natura','libri','cucinare','movimento'];
export const ALL_SPACES: SpaceTag[] = ['casa','giardino','terrazzo','parco'];

export const DEFAULT_ROUTINE: RoutineSettings = {
  wakeTime: '09:00', breakfastEnd: '09:45', morningSnackStart: '11:00',
  morningSnackEnd: '11:20', lunchStart: '13:00', napStart: '14:00',
  napMinutes: 120, afternoonSnackEnd: '16:30', preDinnerMinutes: 30,
  dinnerStart: '19:30', bedTime: '21:00',
};
export const DEFAULT_MEALS: MealSettings = {
  lunchMinutes: 60, dinnerMinutes: 60, soundsOn: true, volume: 0.8,
};
export const DEFAULT_SETTINGS: Settings = {
  routine: DEFAULT_ROUTINE, meals: DEFAULT_MEALS, reducedMotion: 'system',
};

export { CATEGORIES } from './categories';
