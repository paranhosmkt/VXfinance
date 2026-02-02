
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum CategoryGroup {
  REVENUE = 'Receita',
  COGS = 'Custos de Venda',
  OPERATING_EXPENSE = 'Despesa Operacional',
  FINANCIAL = 'Financeiro',
  ASSET = 'Ativo',
  LIABILITY = 'Passivo'
}

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  group: CategoryGroup;
  clientId?: string;
  projectId?: string;
}

export interface MonthlyReport {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}
