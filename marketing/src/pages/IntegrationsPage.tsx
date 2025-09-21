import React from 'react';
import { Link } from 'react-router-dom';
import { 
  WhatsappIcon, 
  GoogleIcon, 
  Calendar03Icon,
  CreditCardIcon, 
  Invoice01Icon,
  CloudIcon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const IntegrationsPage = () => {
  const integrations = [
    {
      name: 'WhatsApp Business API',
      description: 'Send automated notifications, event confirmations, and payment reminders directly to clients and staff through WhatsApp.',
      icon: WhatsappIcon,
      features: [
        'Event confirmation messages',
        'Payment reminder notifications',
        'Staff assignment alerts',
        'Custom message templates',
        'Bulk messaging capabilities'
      ],
      status: 'Available',
      category: 'Communication'
    },
    {
      name: 'Google Sheets Sync',
      description: 'Automatically sync all your data with Google Sheets for advanced reporting and external collaboration.',
      icon: GoogleIcon,
      features: [
        'Real-time data synchronization',
        'Custom sheet formatting',
        'Automated backup creation',
        'Team collaboration support',
        'Advanced filtering options'
      ],
      status: 'Available',
      category: 'Data Management'
    },
    {
      name: 'Google Calendar',
      description: 'Seamlessly integrate events with Google Calendar for better scheduling and team coordination.',
      icon: Calendar03Icon,
      features: [
        'Automatic event creation',
        'Team calendar sharing',
        'Conflict detection',
        'Mobile calendar sync',
        'Recurring event support'
      ],
      status: 'Available',
      category: 'Scheduling'
    },
    {
      name: 'Razorpay Payments',
      description: 'Accept secure online payments with India\'s leading payment gateway solution.',
      icon: CreditCardIcon,
      features: [
        'Multiple payment methods',
        'Instant payment confirmation',
        'Automated invoice generation',
        'Refund management',
        'Payment analytics'
      ],
      status: 'Available',
      category: 'Payments'
    },
    {
      name: 'PDF Generation',
      description: 'Generate professional invoices, quotations, and reports with custom branding.',
      icon: Invoice01Icon,
      features: [
        'Custom branded templates',
        'Multi-format support',
        'Automated generation',
        'Digital signatures',
        'Cloud storage integration'
      ],
      status: 'Available',
      category: 'Documentation'
    },
    {
      name: 'Cloud Storage',
      description: 'Secure cloud storage for all your photos, videos, and business documents.',
      icon: CloudIcon,
      features: [
        'Unlimited storage space',
        'Automatic backup',
        'File sharing capabilities',
        'Version control',
        'Mobile access'
      ],
      status: 'Available',
      category: 'Storage'
    }
  ];

  const categories = [...new Set(integrations.map(integration => integration.category))];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Powerful Integrations
            <span className="block text-primary">That Work Seamlessly</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect Stoodiora with your favorite tools and platforms to create a unified workflow 
            that saves time and reduces manual work.
          </p>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {categories.map((category) => (
            <div key={category} className="mb-16">
              <h2 className="text-2xl font-bold text-foreground mb-8">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {integrations
                  .filter(integration => integration.category === category)
                  .map((integration, index) => (
                    <div
                      key={index}
                      className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <integration.icon className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">
                              {integration.name}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              <CheckmarkCircle01Icon className="w-3 h-3 mr-1" />
                              {integration.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-4">
                        {integration.description}
                      </p>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground">Key Features:</h4>
                        <ul className="space-y-1">
                          {integration.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                              <CheckmarkCircle01Icon className="w-4 h-4 text-success mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API & Custom Integrations */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Need Custom Integrations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Our API allows you to build custom integrations with any platform. 
            Get in touch with our team to discuss your specific requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Contact Our Team
            </Link>
            <a
              href="#api-docs"
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              API Documentation
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default IntegrationsPage;