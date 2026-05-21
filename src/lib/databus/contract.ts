// Atlas Studio DataBus — contrat de données partagé.
//
// Source de vérité des objets échangés entre apps. Chaque app (satellite ou
// console) importe ou recopie ce fichier pour produire/consommer des objets
// typés, ce qui supprime le retraitement Excel ENTRE les apps de la suite.

/** Types d'objets canoniques transitant sur le bus. */
export const DATABUS_OBJECT_TYPES = {
  /** Écritures comptables prêtes à intégrer (ex: TableSmart → Atlas F&A). */
  ACCOUNTING_ENTRIES: "accounting.entries",
  /** Balance générale (ex: Atlas F&A → Cockpit F&A, Liass'Pilot). */
  TRIAL_BALANCE: "trial.balance",
  /** Facture émise (ex: TableSmart → Atlas F&A). */
  INVOICE: "invoice",
  /** Relevé Mobile Money normalisé (ingestion → Atlas F&A / AtlasBanx / Cockpit). */
  MOBILE_MONEY_STATEMENT: "mobile_money.statement",
  /** Dossier signé clôturé (ex: Advist → Atlas F&A pour archivage/compta). */
  DOCUMENT_SIGNED: "document.signed",
  /** Liasse / déclaration fiscale produite (ex: Liass'Pilot → archivage). */
  FISCAL_RETURN: "fiscal.return",
} as const;

export type DataBusObjectType =
  (typeof DATABUS_OBJECT_TYPES)[keyof typeof DATABUS_OBJECT_TYPES];

export type DataBusStatus =
  | "pending"
  | "claimed"
  | "consumed"
  | "failed"
  | "archived";

/** Objet tel que stocké/renvoyé par le bus. */
export interface DataBusObject<T = unknown> {
  id: string;
  owner_id: string;
  company_id: string | null;
  producer_app: string;
  consumer_app: string | null;
  object_type: DataBusObjectType | string;
  schema_version: number;
  status: DataBusStatus;
  payload: T;
  idempotency_key: string | null;
  error: string | null;
  created_at: string;
  claimed_at: string | null;
  consumed_at: string | null;
  consumed_by: string | null;
}

/** Enveloppe de publication. */
export interface PublishInput<T = unknown> {
  object_type: DataBusObjectType | string;
  payload: T;
  consumer_app?: string | null;
  company_id?: string | null;
  idempotency_key?: string;
  schema_version?: number;
  /** Réservé portail/admin : publier au nom d'une app. */
  producer_app?: string;
}

// ─── Payloads canoniques ────────────────────────────────────────────────────

export interface AccountingEntryLine {
  account: string;        // compte SYSCOHADA (ex: '701000')
  label: string;
  debit: number;
  credit: number;
}

export interface AccountingEntry {
  date: string;           // ISO
  journal: string;        // ex: 'VE', 'BQ'
  piece_ref: string;
  lines: AccountingEntryLine[];
}

export interface AccountingEntriesPayload {
  currency: string;       // XOF, XAF...
  period: string;         // ex: '2026-05'
  entries: AccountingEntry[];
}

export interface TrialBalanceLine {
  account: string;
  label: string;
  opening_debit: number;
  opening_credit: number;
  movement_debit: number;
  movement_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalancePayload {
  currency: string;
  fiscal_year: number;
  as_of: string;          // ISO date
  lines: TrialBalanceLine[];
}

export interface MobileMoneyStatementPayload {
  statement_id: string;
  provider: string;
  currency: string;
  account_msisdn: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  totals: { debit: number; credit: number; fees: number; count: number };
  transactions: Array<{
    occurred_at: string;
    direction: "debit" | "credit";
    amount: number;
    fee: number;
    balance_after: number | null;
    counterparty: string | null;
    counterparty_msisdn: string | null;
    reference: string | null;
    raw_label: string | null;
    category: string | null;
  }>;
}
