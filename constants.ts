
import { Transaction, TransactionType, CategoryGroup } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

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
