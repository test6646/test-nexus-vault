import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FreelancerFormDialog from './FreelancerFormDialog';
import FreelancerTableView from './FreelancerTableView';
import { useFreelancers } from './hooks/useFreelancers';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';

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
  };

  const handleDelete = async (id: string) => {
    await deleteFreelancer(id);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
        </div>
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-6 w-16 bg-gray-200 animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full" />
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Freelancers</h1>
        <Button onClick={handleAddNew} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Freelancer
        </Button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">All Freelancers</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {freelancers.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <FreelancerTableView
            freelancers={freelancers}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

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