export interface Unit {
  name: string;
  enabled: boolean;
  pending: boolean;
}

export interface Session {
  username: string;
  role: 'admin' | 'unit';
  unitName: string;
  token: string;
}

export interface Lead {
  id: string;
  unitName: string;
  createdTimeRaw: string;
  createdTimeFormatted: string;
  clienteRaw: string;
  clienteLabel: string;
  clienteColor: 'green' | 'yellow' | 'gray';
  interesseRaw: string;
  interesseLabel: string;
  nome: string;
  whatsappRaw: string;
  whatsappDigits: string;
  whatsappLink: string;
  statusRaw: string;
  statusLabel: string;
  statusColor: 'green' | 'yellow';
  createdAtForSorting: number; // millisecond timestamp
}

export interface LoadingStatus {
  unitName: string;
  status: 'idle' | 'loading' | 'success' | 'error' | 'pending';
  errorMessage?: string;
}

export const INITIAL_UNITS: Unit[] = [
  {
    name: "Espaçolaser | Araripina",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Serra Talhada",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Garanhuns",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Cajazeiras",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Vitória Sto Antão",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Livramento",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Muriaé",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Vilhena",
    enabled: false,
    pending: true,
  },
  {
    name: "Espaçolaser | Corumbá",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Fortaleza",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Plaza Macaé",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Centro Macaé",
    enabled: true,
    pending: false,
  },
  {
    name: "Espaçolaser | Quixadá",
    enabled: true,
    pending: false,
  },
];
