import { FilterConfig } from '@/hooks/useBackendFilters';

export const FILTER_CONFIGS: Record<string, FilterConfig> = {
  clients: {
    tableName: 'clients',
    searchFields: ['name', 'email', 'phone', 'address'],
    sortOptions: [
      { value: 'name', label: 'Name' },
      { value: 'created_at', label: 'Date Added' },
      { value: 'email', label: 'Email' }
    ],
    filterOptions: [
      {
        key: 'has_email',
        label: 'Has Email',
        type: 'boolean',
        queryBuilder: (query) => query.not('email', 'is', null).not('email', 'eq', '')
      },
      {
        key: 'has_address',
        label: 'Has Address', 
        type: 'boolean',
        queryBuilder: (query) => query.not('address', 'is', null).not('address', 'eq', '')
      },
      {
        key: 'recent',
        label: 'Added This Week',
        type: 'boolean',
        queryBuilder: (query) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return query.gte('created_at', weekAgo.toISOString());
        }
      }
    ],
    defaultSort: 'name'
  },
  
  events: {
    tableName: 'events',
    searchFields: ['title', 'venue'],
    selectQuery: `
      *,
      client:clients(id, name, email, phone, address)
    `,
    sortOptions: [
      { value: 'event_date', label: 'Event Date' },
      { value: 'created_at', label: 'Created Date' },
      { value: 'total_amount', label: 'Amount' },
      { value: 'title', label: 'Title' }
    ],
    filterOptions: [
      {
        key: 'wedding',
        label: 'Wedding',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Wedding')
      },
      {
        key: 'pre_wedding',
        label: 'Pre-Wedding',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Pre-Wedding')
      },
      {
        key: 'ring_ceremony',
        label: 'Ring Ceremony',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Ring-Ceremony')
      },
      {
        key: 'maternity',
        label: 'Maternity Photography',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Maternity Photography')
      },
      {
        key: 'others',
        label: 'Others',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Others')
      },
      {
        key: 'this_month',
        label: 'This Month',
        type: 'boolean',
        queryBuilder: (query) => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return query.gte('event_date', start.toISOString().split('T')[0])
                      .lte('event_date', end.toISOString().split('T')[0]);
        }
      },
      {
        key: 'completed',
        label: 'Completed',
        type: 'boolean',
        queryBuilder: (query) => {
          const today = new Date().toISOString().split('T')[0];
          return query.lte('event_date', today);
        }
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        type: 'boolean',
        queryBuilder: (query) => {
          const today = new Date().toISOString().split('T')[0];
          return query.gt('event_date', today);
        }
      },
      {
        key: 'photo_editing_done',
        label: 'Photo Editing Done',
        type: 'boolean',
        queryBuilder: (query) => query.eq('photo_editing_status', true)
      },
      {
        key: 'video_editing_done',
        label: 'Video Editing Done',
        type: 'boolean',
        queryBuilder: (query) => query.eq('video_editing_status', true)
      },
      {
        key: 'fully_paid',
        label: 'Fully Paid',
        type: 'boolean',
        queryBuilder: (query) => query.eq('balance_amount', 0)
      },
      {
        key: 'has_balance',
        label: 'Has Pending Balance',
        type: 'boolean',
        queryBuilder: (query) => query.gt('balance_amount', 0)
      }
    ],
    defaultSort: 'event_date'
  },

  tasks: {
    tableName: 'tasks',
    searchFields: ['title', 'description'],
    selectQuery: `
      *,
      event:events(id, title, client:clients(name)),
      assigned_staff:profiles!tasks_assigned_to_fkey(full_name, role),
      freelancer:freelancers!tasks_freelancer_id_fkey(full_name, role)
    `,
    sortOptions: [
      { value: 'due_date', label: 'Due Date' },
      { value: 'created_at', label: 'Created Date' },
      { value: 'priority', label: 'Priority' },
      { value: 'status', label: 'Status' }
    ],
    filterOptions: [
      {
        key: 'completed',
        label: 'Completed',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Completed')
      },
      {
        key: 'in_progress',
        label: 'In Progress',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'In Progress')
      },
      {
        key: 'pending',
        label: 'Pending',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Pending')
      },
      {
        key: 'waiting_response',
        label: 'Waiting for Response',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Waiting for Response')
      },
      {
        key: 'accepted',
        label: 'Accepted',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Accepted')
      },
      {
        key: 'declined',
        label: 'Declined',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Declined')
      },
      {
        key: 'on_hold',
        label: 'On Hold',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'On Hold')
      },
      {
        key: 'under_review',
        label: 'Under Review',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Under Review')
      },
      {
        key: 'reported',
        label: 'Reported',
        type: 'boolean',
        queryBuilder: (query) => query.eq('status', 'Reported')
      },
      {
        key: 'high_priority',
        label: 'High Priority',
        type: 'boolean',
        queryBuilder: (query) => query.in('priority', ['High', 'Urgent'])
      },
      {
        key: 'urgent_priority',
        label: 'Urgent',
        type: 'boolean',
        queryBuilder: (query) => query.eq('priority', 'Urgent')
      },
      {
        key: 'medium_priority',
        label: 'Medium Priority',
        type: 'boolean',
        queryBuilder: (query) => query.eq('priority', 'Medium')
      },
      {
        key: 'low_priority',
        label: 'Low Priority',
        type: 'boolean',
        queryBuilder: (query) => query.eq('priority', 'Low')
      },
      {
        key: 'photo_editing',
        label: 'Photo Editing',
        type: 'boolean',
        queryBuilder: (query) => query.eq('task_type', 'Photo Editing')
      },
      {
        key: 'video_editing',
        label: 'Video Editing',
        type: 'boolean',
        queryBuilder: (query) => query.eq('task_type', 'Video Editing')
      },
      {
        key: 'other_task',
        label: 'Other Tasks',
        type: 'boolean',
        queryBuilder: (query) => query.eq('task_type', 'Other')
      },
      {
        key: 'assigned',
        label: 'Assigned',
        type: 'boolean',
        queryBuilder: (query) => query.or('assigned_to.not.is.null,freelancer_id.not.is.null')
      },
      {
        key: 'unassigned',
        label: 'Unassigned',
        type: 'boolean',
        queryBuilder: (query) => query.and('assigned_to.is.null,freelancer_id.is.null')
      }
    ],
    defaultSort: 'due_date'
  },

  quotations: {
    tableName: 'quotations',
    searchFields: ['title', 'venue'],
    selectQuery: `
      *,
      client:clients(*),
      event:events(id, title)
    `,
    sortOptions: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'event_date', label: 'Event Date' },
      { value: 'amount', label: 'Amount' },
      { value: 'valid_until', label: 'Valid Until' }
    ],
    filterOptions: [
      {
        key: 'converted',
        label: 'Converted to Event',
        type: 'boolean',
        queryBuilder: (query) => query.not('converted_to_event', 'is', null)
      },
      {
        key: 'pending',
        label: 'Pending',
        type: 'boolean',
        queryBuilder: (query) => query.is('converted_to_event', null)
      },
      {
        key: 'valid',
        label: 'Still Valid',
        type: 'boolean',
        queryBuilder: (query) => {
          const today = new Date().toISOString().split('T')[0];
          return query.or(`valid_until.is.null,valid_until.gte.${today}`);
        }
      },
      {
        key: 'expired',
        label: 'Expired',
        type: 'boolean',
        queryBuilder: (query) => {
          const today = new Date().toISOString().split('T')[0];
          return query.lt('valid_until', today);
        }
      }
    ],
    defaultSort: 'created_at'
  },

  freelancers: {
    tableName: 'freelancers',
    searchFields: ['full_name', 'email', 'phone'],
    sortOptions: [
      { value: 'full_name', label: 'Name' },
      { value: 'role', label: 'Role' },
      { value: 'rate', label: 'Rate' },
      { value: 'created_at', label: 'Date Added' }
    ],
    filterOptions: [
      {
        key: 'photographer',
        label: 'Photographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Photographer')
      },
      {
        key: 'cinematographer',
        label: 'Cinematographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Cinematographer')
      },
      {
        key: 'drone_pilot',
        label: 'Drone Pilot',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Drone Pilot')
      },
      {
        key: 'editor',
        label: 'Editor',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Editor')
      },
      {
        key: 'other_role',
        label: 'Other',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Other')
      },
      {
        key: 'has_email',
        label: 'Has Email',
        type: 'boolean',
        queryBuilder: (query) => query.not('email', 'is', null)
      }
    ],
    defaultSort: 'full_name'
  },

  expenses: {
    tableName: 'expenses',
    searchFields: ['description', 'notes'],
    selectQuery: `
      *,
      event:events(id, title)
    `,
    sortOptions: [
      { value: 'expense_date', label: 'Date' },
      { value: 'amount', label: 'Amount' },
      { value: 'category', label: 'Category' },
      { value: 'created_at', label: 'Created Date' }
    ],
    filterOptions: [
      {
        key: 'equipment',
        label: 'Equipment',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Equipment')
      },
      {
        key: 'travel',
        label: 'Travel',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Travel')
      },
      {
        key: 'food',
        label: 'Food',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Food')
      },
      {
        key: 'salary',
        label: 'Salary',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Salary')
      },
      {
        key: 'marketing',
        label: 'Marketing',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Marketing')
      },
      {
        key: 'maintenance',
        label: 'Maintenance',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Maintenance')
      },
      {
        key: 'accommodation',
        label: 'Accommodation',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Accommodation')
      },
      {
        key: 'software',
        label: 'Software',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Software')
      },
      {
        key: 'other',
        label: 'Other',
        type: 'boolean',
        queryBuilder: (query) => query.eq('category', 'Other')
      },
      {
        key: 'cash_payment',
        label: 'Cash Payments',
        type: 'boolean',
        queryBuilder: (query) => query.eq('payment_method', 'Cash')
      },
      {
        key: 'digital_payment',
        label: 'Digital Payments',
        type: 'boolean',
        queryBuilder: (query) => query.eq('payment_method', 'Digital')
      },
      {
        key: 'event_based',
        label: 'Event-Based',
        type: 'boolean',
        queryBuilder: (query) => query.not('event_id', 'is', null)
      },
      {
        key: 'general_expense',
        label: 'General Expenses',
        type: 'boolean',
        queryBuilder: (query) => query.is('event_id', null)
      },
      {
        key: 'this_month',
        label: 'This Month',
        type: 'boolean',
        queryBuilder: (query) => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return query.gte('expense_date', start.toISOString().split('T')[0])
                      .lte('expense_date', end.toISOString().split('T')[0]);
        }
      },
      {
        key: 'last_month',
        label: 'Last Month',
        type: 'boolean',
        queryBuilder: (query) => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          return query.gte('expense_date', start.toISOString().split('T')[0])
                      .lte('expense_date', end.toISOString().split('T')[0]);
        }
      },
      {
        key: 'high_amount',
        label: 'High Amount (>₹10K)',
        type: 'boolean',
        queryBuilder: (query) => query.gt('amount', 10000)
      },
      {
        key: 'has_receipt',
        label: 'Has Receipt',
        type: 'boolean',
        queryBuilder: (query) => query.not('receipt_url', 'is', null)
      }
    ],
    defaultSort: 'expense_date',
    pageSize: 30,
    enableRealtime: true
  },

  accounting: {
    tableName: 'accounting_entries',
    searchFields: ['title', 'description'],
    sortOptions: [
      { value: 'entry_date', label: 'Date' },
      { value: 'amount', label: 'Amount' },
      { value: 'category', label: 'Category' },
      { value: 'entry_type', label: 'Type' },
      { value: 'created_at', label: 'Created Date' },
      { value: 'title', label: 'Title' }
    ],
    filterOptions: [
      {
        key: 'credit',
        label: 'Credit',
        type: 'boolean',
        queryBuilder: (query) => query.eq('entry_type', 'Credit')
      },
      {
        key: 'debit',
        label: 'Debit',
        type: 'boolean',
        queryBuilder: (query) => query.eq('entry_type', 'Debit')
      },
      {
        key: 'reflect_to_company',
        label: 'Reflects to Company',
        type: 'boolean',
        queryBuilder: (query) => query.eq('reflect_to_company', true)
      },
      {
        key: 'this_month',
        label: 'This Month',
        type: 'boolean',
        queryBuilder: (query) => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return query.gte('entry_date', start.toISOString().split('T')[0])
                      .lte('entry_date', end.toISOString().split('T')[0]);
        }
      }
    ],
    defaultSort: 'entry_date',
    pageSize: 30,
    enableRealtime: true
  },

  // Payments backend filtering
  payments: {
    tableName: 'events',
    searchFields: ['title', 'venue'],
    selectQuery: `
      *,
      client:clients(id, name, email, phone, address),
      payments(id, amount, payment_method, payment_date, invoice_id),
      event_closing_balances(id, closing_amount, closing_reason, total_bill, collected_amount)
    `,
    sortOptions: [
      { value: 'event_date', label: 'Event Date' },
      { value: 'total_amount', label: 'Amount' },
      { value: 'created_at', label: 'Created Date' },
      { value: 'title', label: 'Title' }
    ],
    filterOptions: [
      {
        key: 'wedding',
        label: 'Wedding',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Wedding')
      },
      {
        key: 'pre_wedding',
        label: 'Pre-Wedding',
        type: 'boolean',
        queryBuilder: (query) => query.eq('event_type', 'Pre-Wedding')
      },
      {
        key: 'fully_paid',
        label: 'Fully Paid',
        type: 'boolean',
        queryBuilder: (query) => query.eq('balance_amount', 0)
      },
      {
        key: 'has_balance',
        label: 'Has Pending Balance',
        type: 'boolean',
        queryBuilder: (query) => query.gt('balance_amount', 0)
      }
    ],
    defaultSort: 'event_date',
    enableRealtime: true
  },

  // Staff salary overview - shows ALL staff with their payment status  
  staff_salary: {
    tableName: 'profiles',
    searchFields: ['full_name'],
    selectQuery: `
      *,
      staff_payments!staff_payments_staff_id_fkey(id, amount, payment_method, payment_date, description, event:events(title))
    `,
    sortOptions: [
      { value: 'full_name', label: 'Name' },
      { value: 'role', label: 'Role' },
      { value: 'created_at', label: 'Date Added' }
    ],
    filterOptions: [
      {
        key: 'photographer',
        label: 'Photographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Photographer')
      },
      {
        key: 'cinematographer',
        label: 'Cinematographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Cinematographer')
      },
      {
        key: 'editor',
        label: 'Editor',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Editor')
      },
      {
        key: 'drone',
        label: 'Drone Pilot',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Drone Pilot')
      },
      {
        key: 'admin_excluded',
        label: 'Exclude Admins',
        type: 'boolean',
        queryBuilder: (query) => query.neq('role', 'Admin')
      },
      {
        key: 'has_payments',
        label: 'Has Payments',
        type: 'boolean',
        queryBuilder: (query) => query.not('staff_payments', 'is', null)
      },
      {
        key: 'no_payments',
        label: 'No Payments Yet',
        type: 'boolean',
        queryBuilder: (query) => query.is('staff_payments', null)
      }
    ],
    defaultSort: 'full_name',
    enableRealtime: true
  },

  // Freelancer salary overview - shows ALL freelancers with their payment status
  freelancer_salary: {
    tableName: 'freelancers',
    searchFields: ['full_name', 'email', 'phone'],
    selectQuery: `
      *,
      freelancer_payments!freelancer_payments_freelancer_id_fkey(id, amount, payment_method, payment_date, description, event:events(title))
    `,
    sortOptions: [
      { value: 'full_name', label: 'Name' },
      { value: 'role', label: 'Role' },
      { value: 'created_at', label: 'Date Added' }
    ],
    filterOptions: [
      {
        key: 'photographer',
        label: 'Photographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Photographer')
      },
      {
        key: 'cinematographer',
        label: 'Cinematographer',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Cinematographer')
      },
      {
        key: 'editor',
        label: 'Editor',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Editor')
      },
      {
        key: 'drone',
        label: 'Drone Pilot',
        type: 'boolean',
        queryBuilder: (query) => query.eq('role', 'Drone Pilot')
      },
      {
        key: 'has_payments',
        label: 'Has Payments',
        type: 'boolean',
        queryBuilder: (query) => query.not('freelancer_payments', 'is', null)
      },
      {
        key: 'no_payments',
        label: 'No Payments Yet',
        type: 'boolean',
        queryBuilder: (query) => query.is('freelancer_payments', null)
      }
    ],
    defaultSort: 'full_name',
    enableRealtime: true
  },

};