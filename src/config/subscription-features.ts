/**
 * Unified subscription features for all plans
 * All plans have identical features - only duration and pricing differ
 */
export const UNIFIED_SUBSCRIPTION_FEATURES = [
  "Complete Studio Management System",
  "Client Management & CRM",
  "Event Planning & Scheduling",
  "Financial Tracking & Reports",
  "Task Management & Assignment",
  "Staff & Freelancer Management",
  "Expense Tracking & Categories",
  "Quotation & Invoice Generation",
  "Payment Processing & Tracking",
  "PDF Reports & Export Options",
  "WhatsApp Integration & Notifications",
  "Google Sheets Sync",
  "Cloud Storage & Backup",
  "Multi-Device Access",
  "Priority Customer Support"
];

export const PLAN_DISPLAY_NAMES = {
  monthly: 'Monthly Plan',
  quarterly: 'Quarterly Plan', 
  yearly: 'Annual Plan'
} as const;