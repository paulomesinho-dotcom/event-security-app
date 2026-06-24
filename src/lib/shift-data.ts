export interface PeriodTime {
  start: string;
  end: string;
}

export interface DayShifts {
  manha: PeriodTime;
  tarde: PeriodTime;
}

export interface LocalShifts {
  "10/jul": DayShifts;
  "11/jul": DayShifts;
  "12/jul": DayShifts;
}

export const predefinedShifts: Record<string, LocalShifts> = {
  "Porta - Torniquete": {
    "10/jul": { manha: { start: "07:00", end: "13:40" }, tarde: { start: "13:40", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:30" }, tarde: { start: "12:30", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:30" }, tarde: { start: "12:30", end: "16:45" } },
  },
  "Porta - PDA": {
    "10/jul": { manha: { start: "07:00", end: "13:40" }, tarde: { start: "13:40", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:30" }, tarde: { start: "12:30", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:30" }, tarde: { start: "12:30", end: "16:45" } },
  },
  "Bancada": {
    "10/jul": { manha: { start: "07:00", end: "14:10" }, tarde: { start: "14:10", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "13:10" }, tarde: { start: "13:10", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "13:10" }, tarde: { start: "13:10", end: "16:45" } },
  },
  "Galeria": {
    "10/jul": { manha: { start: "07:00", end: "14:40" }, tarde: { start: "14:40", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "13:40" }, tarde: { start: "13:40", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "13:40" }, tarde: { start: "13:40", end: "16:45" } },
  },
  "PE - Norte": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  },
  "PE - Sul": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  },
  "PE - Nascente": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  },
  "PE - Poente": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  },
  "Controlo de acessos": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  },
  "Central de comunicações": {
    "10/jul": { manha: { start: "07:00", end: "13:55" }, tarde: { start: "13:55", end: "17:30" } },
    "11/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "17:30" } },
    "12/jul": { manha: { start: "08:00", end: "12:55" }, tarde: { start: "12:55", end: "16:45" } },
  }
};
