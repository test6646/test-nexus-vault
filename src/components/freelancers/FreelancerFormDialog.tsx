import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';
import { UserRole } from '@/types/studio';
import { getRoleOptions } from '@/lib/role-utils';

const freelancerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['Photographer', 'Cinematographer', 'Editor', 'Drone Pilot', 'Other'] as const),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  rate: z.number().min(0, 'Rate must be non-negative'),
});

interface FreelancerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancer?: Freelancer | null;
  onSubmit: (data: FreelancerFormData) => Promise<void>;
}

const FreelancerFormDialog: React.FC<FreelancerFormDialogProps> = ({
  open,
  onOpenChange,
  freelancer,
  onSubmit,
}) => {
  const isEditing = !!freelancer;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FreelancerFormData>({
    resolver: zodResolver(freelancerSchema),
    defaultValues: {
      full_name: freelancer?.full_name || '',
      role: freelancer?.role || 'Other',
      phone: freelancer?.phone || '',
      email: freelancer?.email || '',
      rate: freelancer?.rate || 0,
    },
  });

  React.useEffect(() => {
    if (freelancer) {
      form.reset({
        full_name: freelancer.full_name,
        role: freelancer.role,
        phone: freelancer.phone || '',
        email: freelancer.email || '',
        rate: freelancer.rate,
      });
    } else {
      form.reset({
        full_name: '',
        role: 'Other',
        phone: '',
        email: '',
        rate: 0,
      });
    }
  }, [freelancer, form]);

  const handleSubmit = async (data: FreelancerFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = getRoleOptions(false); // Don't include Admin for freelancers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Freelancer' : 'Add New Freelancer'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Full Name - Top */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone and Email - Same Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role - Own Row */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rate - Own Row */}
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate (per day/project)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <DialogFooter className="flex flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting 
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update' : 'Create')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FreelancerFormDialog;