
import { Transaction, TransactionType, CategoryGroup } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2024-03-01',
    description: 'Venda de Software VX',
    amount: 15000,
    type: TransactionType.INCOME,
    category: 'Vendas Diretas',
    group: CategoryGroup.REVENUE
  },
  {
    id: '2',
    date: '2024-03-05',
    description: 'Servidores AWS',
    amount: 1200,
    type: TransactionType.EXPENSE,
    category: 'Infraestrutura',
    group: CategoryGroup.COGS
  },
  {
    id: '3',
    date: '2024-03-10',
    description: 'Salários Equipe Dev',
    amount: 8000,
    type: TransactionType.EXPENSE,
    category: 'Folha de Pagamento',
    group: CategoryGroup.OPERATING_EXPENSE
  },
  {
    id: '4',
    date: '2024-03-15',
    description: 'Marketing Digital',
    amount: 2500,
    type: TransactionType.EXPENSE,
    category: 'Publicidade',
    group: CategoryGroup.OPERATING_EXPENSE
  }
];

export const CATEGORIES = [
  { name: 'Vendas Diretas', group: CategoryGroup.REVENUE },
  { name: 'Serviços', group: CategoryGroup.REVENUE },
  { name: 'Infraestrutura', group: CategoryGroup.COGS },
  { name: 'Folha de Pagamento', group: CategoryGroup.OPERATING_EXPENSE },
  { name: 'Aluguel & Escritório', group: CategoryGroup.OPERATING_EXPENSE },
  { name: 'Publicidade', group: CategoryGroup.OPERATING_EXPENSE },
  { name: 'Impostos', group: CategoryGroup.OPERATING_EXPENSE },
  { name: 'Juros & Taxas', group: CategoryGroup.FINANCIAL }
];
