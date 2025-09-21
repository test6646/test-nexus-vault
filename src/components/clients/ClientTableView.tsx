
import { Client } from '@/types/studio';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit01Icon, Delete02Icon } from 'hugeicons-react';

interface ClientTableViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const ClientTableView = ({ clients, onEdit, onDelete }: ClientTableViewProps) => {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Client Name</TableHead>
              <TableHead className="text-center">Contact</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Address</TableHead>
              <TableHead className="text-center">Notes</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="hover:bg-muted/25">
                <TableCell className="text-center">
                  <div className="font-medium">{client.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{client.phone}</span>
                </TableCell>
                <TableCell className="text-center">
                   <span className="text-sm">{client.email || '~'}</span>
                </TableCell>
                  <TableCell className="max-w-32 lg:max-w-xs text-center">
                    <span className="text-sm line-clamp-2 break-words">{client.address || '~'}</span>
                  </TableCell>
                 <TableCell className="max-w-32 lg:max-w-xs text-center">
                   <span className="text-sm line-clamp-2 break-words">{client.notes || '~'}</span>
                 </TableCell>
                 <TableCell className="text-center">
                   <div className="flex items-center justify-center gap-2">
                     <Button
                       variant="action-edit"
                       size="sm"
                       onClick={() => onEdit(client)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Edit client"
                     >
                       <Edit01Icon className="h-3.5 w-3.5" />
                     </Button>
                     <Button
                       variant="action-delete"
                       size="sm"
                       onClick={() => onDelete(client)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Delete client"
                     >
                       <Delete02Icon className="h-3.5 w-3.5" />
                     </Button>
                   </div>
                 </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-foreground mb-1 truncate">
                    {client.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="action-edit"
                    size="sm"
                    onClick={() => onEdit(client)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Edit client"
                  >
                    <Edit01Icon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="action-delete"
                    size="sm"
                    onClick={() => onDelete(client)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Delete client"
                  >
                    <Delete02Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Contact</div>
                  <div className="text-sm font-medium truncate">{client.phone}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium truncate">{client.email || '~'}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="text-sm font-medium break-words line-clamp-2">{client.address || '~'}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="text-sm font-medium break-words line-clamp-2">{client.notes || '~'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default ClientTableView;
