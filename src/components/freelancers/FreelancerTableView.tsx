import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit01Icon, Delete02Icon, Call02Icon, Mail01Icon, TaskDone01Icon, Calendar01Icon } from 'hugeicons-react';
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
import { Freelancer } from '@/types/freelancer';
import { UserRole } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';

interface FreelancerTableViewProps {
  freelancers: Freelancer[];
  onEdit: (freelancer: Freelancer) => void;
  onDelete: (id: string) => void;
}

interface FreelancerStats {
  activeAssignments: number;
  completedTasks: number;
  pendingTasks: number;
  totalEarnings: number;
}

const FreelancerTableView: React.FC<FreelancerTableViewProps> = ({
  freelancers,
  onEdit,
  onDelete,
}) => {
  const { profile, currentFirmId } = useAuth();

  // Fetch freelancer stats (assignments, tasks, earnings)
  const { data: freelancerStats } = useQuery({
    queryKey: ['freelancer-stats', currentFirmId],
    queryFn: async () => {
      if (!currentFirmId) return {};
      
      const stats: Record<string, FreelancerStats> = {};
      
      for (const freelancer of freelancers) {
        // Get active assignments
        const { data: assignments } = await supabase
          .from('event_staff_assignments')
          .select('*')
          .eq('freelancer_id', freelancer.id)
          .eq('firm_id', currentFirmId);

        // Get tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*, event:events(title)')
          .eq('freelancer_id', freelancer.id)
          .eq('firm_id', currentFirmId);

        // Get earnings
        const { data: payments } = await supabase
          .from('freelancer_payments')
          .select('amount')
          .eq('freelancer_id', freelancer.id)
          .eq('firm_id', currentFirmId);

        stats[freelancer.id] = {
          activeAssignments: assignments?.length || 0,
          completedTasks: tasks?.filter(t => t.status === 'Completed').length || 0,
          pendingTasks: tasks?.filter(t => t.status !== 'Completed').length || 0,
          totalEarnings: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
        };
      }
      
      return stats;
    },
    enabled: !!currentFirmId && freelancers.length > 0,
  });


  const getRoleColor = (role: UserRole) => {
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '-');
    const roleMap: Record<string, string> = {
      'photographer': 'text-blue-600',
      'cinematographer': 'text-purple-600', 
      'videographer': 'text-purple-600',
      'drone-pilot': 'text-teal-600',
      'drone-operator': 'text-teal-600',
      'editor': 'text-cyan-400',
      'assistant': 'text-gray-600',
      'other': 'text-orange-600',
      'others': 'text-orange-600'
    };
    return roleMap[normalizedRole] || 'text-orange-600';
  };


  if (freelancers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No freelancers found. Add your first freelancer to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {freelancers.map((freelancer) => {
              const stats = freelancerStats?.[freelancer.id];
              return (
                <TableRow key={freelancer.id} className="hover:bg-muted/25">
                  <TableCell className="font-medium">
                    <div className="font-medium">{freelancer.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${getRoleColor(freelancer.role)}`}>
                      {freelancer.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {freelancer.phone && (
                        <div className="flex items-center gap-1">
                          <Call02Icon className="h-3 w-3 text-muted-foreground" />
                          {freelancer.phone}
                        </div>
                      )}
                      {freelancer.email && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail01Icon className="h-3 w-3 text-muted-foreground" />
                          {freelancer.email}
                        </div>
                      )}
                      {!freelancer.phone && !freelancer.email && (
                        <span className="text-muted-foreground">~</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      ₹{freelancer.rate?.toLocaleString() || 0}/day
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar01Icon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{stats?.activeAssignments || 0}</span>
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
              );
            })}
           </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {freelancers.map((freelancer) => {
          const stats = freelancerStats?.[freelancer.id];
          return (
            <Card key={freelancer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-foreground truncate">
                        {freelancer.full_name}
                      </span>
                    </div>
                    <div className={`text-sm font-medium ${getRoleColor(freelancer.role)}`}>
                      {freelancer.role}
                    </div>
                  </div>
                <div className="flex gap-1 ml-2">
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
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="text-sm font-medium truncate">
                      {freelancer.phone || '~'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium truncate">
                      {freelancer.email || '~'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Assignments</div>
                    <div className="text-sm font-medium">
                      {stats?.activeAssignments || 0} active
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Total Earnings</div>
                    <div className="text-sm font-medium">
                      ₹{stats?.totalEarnings?.toLocaleString() || 0}
                    </div>
                  </div>
                  {freelancer.notes && (
                    <div className="col-span-2 min-w-0">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <div className="text-sm font-medium break-words line-clamp-2">
                        {freelancer.notes}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {freelancers.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No freelancers match your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default FreelancerTableView;