export type DashboardWidgetKey =
  | "kpiMembers"
  | "kpiRevenue"
  | "kpiLatePayments"
  | "kpiUpcomingEvents"
  | "chartPayments"
  | "tablePlayers"
  | "alerts";

export type PlayerColumnKey =
  | "avatarNom"
  | "poste"
  | "sexe"
  | "statut"
  | "categorie"
  | "cotisation"
  | "montant"
  | "dernierPaiement"
  | "saison"
  | "programme"
  | "actions";

export const DEFAULT_CATEGORIES = [
  "ti toro",
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
  "U19",
  "U20",
];

export interface DashboardWidgetConfig {
  key: DashboardWidgetKey;
  label: string;
  enabled: boolean;
}

export interface PlayerColumnConfig {
  key: PlayerColumnKey;
  label: string;
  enabled: boolean;
}

export interface DashboardConfig {
  widgets: DashboardWidgetConfig[];
  playerColumns: PlayerColumnConfig[];
}

export const DASHBOARD_CONFIG_STORAGE_KEY = "club-dashboard-config-v1";

const defaultWidgets: DashboardWidgetConfig[] = [
  { key: "kpiMembers", label: "KPI: Joueurs actifs", enabled: true },
  { key: "kpiRevenue", label: "KPI: Paiements du mois", enabled: true },
  { key: "kpiLatePayments", label: "KPI: Paiements en retard", enabled: true },
  {
    key: "kpiUpcomingEvents",
    label: "KPI: Evenements a venir",
    enabled: true,
  },
  { key: "chartPayments", label: "Graphique: Paiements mensuels", enabled: true },
  { key: "tablePlayers", label: "Table: Derniers joueurs inscrits", enabled: true },
  { key: "alerts", label: "Bloc: Alertes", enabled: true },
];

const defaultPlayerColumns: PlayerColumnConfig[] = [
  { key: "avatarNom", label: "Avatar + Nom", enabled: true },
  { key: "poste", label: "Poste", enabled: true },
  { key: "sexe", label: "Sexe", enabled: true },
  { key: "statut", label: "Statut", enabled: true },
  { key: "categorie", label: "Categorie", enabled: true },
  { key: "cotisation", label: "Cotisation", enabled: true },
  { key: "montant", label: "Montant", enabled: true },
  { key: "dernierPaiement", label: "Dernier paiement", enabled: true },
  { key: "saison", label: "Saison", enabled: true },
  { key: "programme", label: "Programme", enabled: true },
  { key: "actions", label: "Actions", enabled: true },
];

export const createDefaultDashboardConfig = (): DashboardConfig => ({
  widgets: defaultWidgets.map((widget) => ({ ...widget })),
  playerColumns: defaultPlayerColumns.map((column) => ({ ...column })),
});

const widgetKeys: DashboardWidgetKey[] = defaultWidgets.map((widget) => widget.key);
const playerColumnKeys: PlayerColumnKey[] = defaultPlayerColumns.map(
  (column) => column.key,
);

const isWidgetKey = (value: string): value is DashboardWidgetKey =>
  widgetKeys.includes(value as DashboardWidgetKey);

const isPlayerColumnKey = (value: string): value is PlayerColumnKey =>
  playerColumnKeys.includes(value as PlayerColumnKey);

export const mergeDashboardConfig = (
  input: Partial<DashboardConfig> | null | undefined,
): DashboardConfig => {
  const nextConfig = createDefaultDashboardConfig();

  if (!input) {
    return nextConfig;
  }

  if (Array.isArray(input.widgets)) {
    const overrides = new Map<DashboardWidgetKey, boolean>();
    input.widgets.forEach((widget) => {
      if (widget && isWidgetKey(widget.key)) {
        overrides.set(widget.key, Boolean(widget.enabled));
      }
    });
    nextConfig.widgets = nextConfig.widgets.map((widget) =>
      overrides.has(widget.key)
        ? { ...widget, enabled: overrides.get(widget.key) ?? widget.enabled }
        : widget,
    );
  }

  if (Array.isArray(input.playerColumns)) {
    const overrides = new Map<PlayerColumnKey, boolean>();
    input.playerColumns.forEach((column) => {
      if (column && isPlayerColumnKey(column.key)) {
        overrides.set(column.key, Boolean(column.enabled));
      }
    });
    nextConfig.playerColumns = nextConfig.playerColumns.map((column) =>
      overrides.has(column.key)
        ? { ...column, enabled: overrides.get(column.key) ?? column.enabled }
        : column,
    );
  }

  return nextConfig;
};
