import React from 'react';
import { Calendar01Icon, UserStoryIcon, Dollar01Icon, UserMultipleIcon, Invoice01Icon, CheckmarkSquare01Icon, ChartBarLineIcon, WhatsappIcon } from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const FeaturesPage = () => {
  const mainFeatures = [
    {
      category: 'Event Management',
      icon: Calendar01Icon,
      features: [
        'Wedding & Pre-wedding session tracking',
        'Event scheduling with calendar integration',
        'Client assignment to events',
        'Staff assignment and role management',
        'Payment tracking and status updates',
        'Event-specific quotations and invoices'
      ]
    },
    {
      category: 'Client Management',
      icon: UserStoryIcon,
      features: [
        'Comprehensive client database',
        'Contact information management',
        'Event history tracking',
        'Payment history and outstanding amounts',
        'Client communication logs',
        'Automated client notifications'
      ]
    },
    {
      category: 'Financial Management',
      icon: Dollar01Icon,
      features: [
        'Income and expense tracking',
        'Detailed financial reports',
        'Category-wise expense management',
        'Profit & loss statements',
        'Cash flow analysis',
        'Tax-ready financial summaries'
      ]
    },
    {
      category: 'Staff Management',
      icon: UserMultipleIcon,
      features: [
        'Photographer, cinematographer, and editor profiles',
        'Salary tracking and payment history',
        'Assignment management',
        'Performance tracking',
        'Freelancer management',
        'Staff availability scheduling'
      ]
    },
    {
      category: 'Invoice & Quotations',
      icon: Invoice01Icon,
      features: [
        'Professional invoice generation',
        'Customizable quotation templates',
        'Automated payment reminders',
        'Multiple payment method support',
        'UPI and bank transfer integration',
        'PDF export and sharing'
      ]
    },
    {
      category: 'Task Management',
      icon: CheckmarkSquare01Icon,
      features: [
        'Assignment creation and tracking',
        'Task prioritization',
        'Deadline management',
        'Progress monitoring',
        'Team collaboration tools',
        'Status updates and notifications'
      ]
    },
    {
      category: 'Reporting & Analytics',
      icon: ChartBarLineIcon,
      features: [
        'Comprehensive business reports',
        'Revenue analytics',
        'Staff performance metrics',
        'Event completion rates',
        'Financial trend analysis',
        'Export reports to PDF/Excel'
      ]
    },
    {
      category: 'Communication',
      icon: WhatsappIcon,
      features: [
        'WhatsApp integration',
        'Automated client notifications',
        'Staff communication tools',
        'Event confirmation messages',
        'Payment receipt sharing',
        'Document sharing capabilities'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Complete Feature Set for
            <span className="block text-primary">Professional Studios</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover all the powerful features designed specifically for photography and videography businesses.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mainFeatures.map((category, index) => (
              <div
                key={index}
                className="bg-card rounded-lg p-8 border border-border"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {category.category}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {category.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Seamless Integrations
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Connect with the tools and services you already use.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <WhatsappIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">WhatsApp</h3>
              <p className="text-muted-foreground">Send notifications and documents directly to clients and staff.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Invoice01Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Payment Gateways</h3>
              <p className="text-muted-foreground">Support for UPI, bank transfers, and online payment methods.</p>
            </div>
            
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ChartBarLineIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Google Sheets</h3>
              <p className="text-muted-foreground">Sync data with Google Sheets for advanced analytics.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;