
import { Client } from '@/types/studio';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit01Icon, Delete02Icon, Location01Icon } from 'hugeicons-react';

interface ClientTableViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const ClientTableView = ({ clients, onEdit, onDelete }: ClientTableViewProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Client Name</TableHead>
            <TableHead className="font-semibold">Contact</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Address</TableHead>
            <TableHead className="font-semibold">Notes</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/25">
              <TableCell>
                <div className="font-medium">{client.name}</div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(client.created_at).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{client.phone}</span>
              </TableCell>
              <TableCell>
                {client.email ? (
                  <span className="text-sm">{client.email}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">No email</span>
                )}
              </TableCell>
               <TableCell className="max-w-xs">
                 {client.address ? (
                   <span className="text-sm line-clamp-2">{client.address}</span>
                 ) : (
                   <span className="text-sm text-muted-foreground">No address</span>
                 )}
               </TableCell>
              <TableCell className="max-w-xs">
                {client.notes ? (
                  <span className="text-sm line-clamp-2">{client.notes}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">No notes</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit01Icon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(client)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Delete02Icon className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientTableView;
