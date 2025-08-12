import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import FreelancerFormDialog from './FreelancerFormDialog';
import FreelancerTableView from './FreelancerTableView';
import { useFreelancers } from './hooks/useFreelancers';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import StatsGrid from '@/components/ui/stats-grid';
import { User, Mail, Phone, Clock } from 'lucide-react';

const FreelancerManagement: React.FC = () => {
  const { freelancers, loading, createFreelancer, updateFreelancer, deleteFreelancer } = useFreelancers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);

  const handleAddNew = () => {
    setSelectedFreelancer(null);
    setDialogOpen(true);
  };

  const handleEdit = (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: FreelancerFormData) => {
    if (selectedFreelancer) {
      await updateFreelancer(selectedFreelancer.id, data);
    } else {
      await createFreelancer(data);
    }
    setDialogOpen(false);
    setSelectedFreelancer(null);
  };

  const handleDelete = async (id: string) => {
    await deleteFreelancer(id);
  };

  // Show all freelancers without filtering
  const freelancersToShow = freelancers;

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Freelancers</h1>
        <Button onClick={handleAddNew} className="rounded-full p-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Freelancer Statistics */}
      <StatsGrid stats={[
        {
          title: "Total Freelancers",
          value: freelancers.length,
          icon: <User className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "With Email",
          value: freelancers.filter(f => f.email).length,
          icon: <Mail className="h-4 w-4" />,
          colorClass: "bg-primary/15 text-primary"
        },
        {
          title: "With Notes",
          value: freelancers.filter(f => f.notes).length,
          icon: <Phone className="h-4 w-4" />,
          colorClass: "bg-primary/25 text-primary"
        },
        {
          title: "Recent",
          value: freelancers.filter(f => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(f.created_at) > weekAgo;
          }).length,
          icon: <Clock className="h-4 w-4" />,
          colorClass: "bg-primary/10 text-primary"
        }
      ]} />


      {/* Freelancers List */}
      <FreelancerTableView
        freelancers={freelancersToShow}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FreelancerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        freelancer={selectedFreelancer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default FreelancerManagement;