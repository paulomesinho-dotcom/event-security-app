export interface EventTab {
  id: string;
  label: string;
  dates: string[];
  periods: string[];
}

export const EVENT_TABS: EventTab[] = [
  {
    id: "testes",
    label: "Testes",
    dates: ["24/jun", "25/jun", "26/jun", "27/jun"],
    periods: ["manha", "tarde"]
  },
  {
    id: "pre",
    label: "Pré-Congresso",
    dates: ["05/jul", "06/jul", "07/jul", "08/jul", "09/jul"],
    periods: ["manha", "tarde", "noite"]
  },
  {
    id: "congresso",
    label: "Congresso",
    dates: ["10/jul", "11/jul", "12/jul"],
    periods: ["manha", "tarde"]
  },
  {
    id: "pos",
    label: "Pós-Congresso",
    dates: ["13/jul", "14/jul"],
    periods: ["manha", "tarde"]
  }
];

export const ALL_PERIODS = ["manha", "tarde", "noite"] as const;
