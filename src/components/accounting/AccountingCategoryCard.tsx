import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountingEntry } from '@/hooks/useAccountingEntries';
import { AccountingEntryDialog } from './AccountingEntryDialog';
import { 
  Building2, 
  Coins, 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  Wallet,
  Scale,
  Package
} from 'lucide-react';
import { useMemo } from 'react';

interface AccountingCategoryCardProps {
  category: string;
  entries: AccountingEntry[];
  onEditEntry: (entry: AccountingEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Capital':
      return Building2;
    case 'Assets':
      return Package;
    case 'Loans':
      return CreditCard;
    case 'Depreciation':
      return TrendingDown;
    case 'Investments':
      return TrendingUp;
    case 'Cash on Hand':
      return Wallet;
    case 'Liabilities':
      return Scale;
    default:
      return Coins;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Capital':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Assets':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Loans':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Depreciation':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Investments':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Cash on Hand':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Liabilities':
      return 'bg-pink-50 text-pink-700 border-pink-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const AccountingCategoryCard = ({ 
  category, 
  entries, 
  onEditEntry, 
  onDeleteEntry 
}: AccountingCategoryCardProps) => {
  const Icon = getCategoryIcon(category);
  const colorClass = getCategoryColor(category);

  const categoryStats = useMemo(() => {
    const credits = entries.filter(e => e.entry_type === 'Credit').reduce((sum, e) => sum + e.amount, 0);
    const debits = entries.filter(e => e.entry_type === 'Debit').reduce((sum, e) => sum + e.amount, 0);
    const balance = credits - debits;
    
    return { credits, debits, balance, total: entries.length };
  }, [entries]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{category}</CardTitle>
              <p className="text-sm text-muted-foreground">{categoryStats.total} entries</p>
            </div>
          </div>
          <AccountingEntryDialog />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Credits</p>
            <p className="text-sm font-bold text-green-700">₹{categoryStats.credits.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 font-medium">Debits</p>
            <p className="text-sm font-bold text-red-700">₹{categoryStats.debits.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Balance</p>
            <p className={`text-sm font-bold ${categoryStats.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              ₹{categoryStats.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No entries yet</p>
              <p className="text-xs">Add your first {category.toLowerCase()} entry</p>
            </div>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{entry.title}</h4>
                    <Badge 
                      variant={entry.entry_type === 'Credit' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {entry.entry_type}
                    </Badge>
                  </div>
                  {entry.subcategory && (
                    <p className="text-xs text-muted-foreground">{entry.subcategory}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-sm font-semibold ${
                      entry.entry_type === 'Credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.entry_type === 'Credit' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <div className="flex gap-1">
                    <AccountingEntryDialog
                      entry={entry}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Edit</span>
                          ✏️
                        </Button>
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => onDeleteEntry(entry.id)}
                    >
                      <span className="sr-only">Delete</span>
                      🗑️
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {entries.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2 border-t">
            +{entries.length - 5} more entries
          </p>
        )}
      </CardContent>
    </Card>
  );
};