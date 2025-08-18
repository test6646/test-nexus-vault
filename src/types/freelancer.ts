import { UserRole } from './studio';

export interface Freelancer {
  id: string;
  firm_id: string;
  full_name: string;
  role: UserRole;
  contact_info?: string;
  phone?: string;
  email?: string;
  rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FreelancerFormData {
  full_name: string;
  role: UserRole;
  contact_info?: string;
  phone?: string;
  email?: string;
  rate: number;
  notes?: string;
}

export interface FreelancerPayment {
  id: string;
  firm_id: string;
  freelancer_id: string;
  event_id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  freelancer?: Freelancer;
  event?: any;
}

export interface FreelancerPaymentFormData {
  freelancer_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  description?: string;
  event_id?: string;
}