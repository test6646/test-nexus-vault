import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit01Icon, Delete02Icon, Call02Icon, Mail01Icon } from 'hugeicons-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Freelancer } from '@/types/freelancer';
import { UserRole } from '@/types/studio';

interface FreelancerTableViewProps {
  freelancers: Freelancer[];
  onEdit: (freelancer: Freelancer) => void;
  onDelete: (id: string) => void;
}

const FreelancerTableView: React.FC<FreelancerTableViewProps> = ({
  freelancers,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'Photographer', label: 'Photographer' },
    { value: 'Cinematographer', label: 'Cinematographer' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Drone Pilot', label: 'Drone Pilot' },
    { value: 'Other', label: 'Other' },
  ];

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Photographer':
        return 'default';
      case 'Cinematographer':
        return 'secondary';
      case 'Editor':
        return 'outline';
      case 'Drone Pilot':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const filteredFreelancers = useMemo(() => {
    return freelancers.filter(freelancer => {
      const matchesSearch = 
        freelancer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || freelancer.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [freelancers, searchTerm, roleFilter]);

  if (freelancers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No freelancers found. Add your first freelancer to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search freelancers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFreelancers.map((freelancer) => (
              <TableRow key={freelancer.id}>
                <TableCell className="font-medium">
                  {freelancer.full_name}
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(freelancer.role)}>
                    {freelancer.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                     {freelancer.phone && (
                       <div className="flex items-center gap-1 text-sm">
                         <Call02Icon className="h-3 w-3" />
                         {freelancer.phone}
                       </div>
                     )}
                     {freelancer.email && (
                       <div className="flex items-center gap-1 text-sm">
                         <Mail01Icon className="h-3 w-3" />
                         {freelancer.email}
                       </div>
                     )}
                    {freelancer.contact_info && (
                      <div className="text-sm text-muted-foreground">
                        {freelancer.contact_info}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  ₹{freelancer.rate.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {freelancer.notes || '-'}
                  </div>
                </TableCell>
                 <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                     <Button
                       variant="action-edit"
                       size="sm"
                       onClick={() => onEdit(freelancer)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Edit freelancer"
                     >
                       <Edit01Icon className="h-3.5 w-3.5" />
                     </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button 
                           variant="action-delete" 
                           size="sm" 
                           className="h-8 w-8 p-0 rounded-full"
                           title="Delete freelancer"
                         >
                           <Delete02Icon className="h-3.5 w-3.5" />
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Freelancer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {freelancer.full_name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(freelancer.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredFreelancers.length === 0 && searchTerm && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No freelancers match your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default FreelancerTableView;