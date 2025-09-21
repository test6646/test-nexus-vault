import React from 'react';
import { UserStoryIcon, PhoneOff01Icon, Mail01Icon, TextIcon, Dollar01Icon, WorkHistoryIcon, } from 'hugeicons-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import clientManagement from '../../assets/client-management.jpg';

const ClientFeaturesPage = () => {
  const clientFeatures = [
    {
      title: 'Client Database Management',
      description: 'Maintain a comprehensive database of all your clients with contact information, project history, and preferences.',
      icon: UserStoryIcon,
      image: clientManagement,
      benefits: [
        'Centralized client records',
        'Contact information storage',
        'Client search & filtering',
        'Data export capabilities'
      ]
    },
    {
      title: 'Contact Information System',
      description: 'Store multiple contact methods including phone numbers, emails, and addresses for each client.',
      icon: PhoneOff01Icon,
      image: clientManagement,
      benefits: [
        'Multiple contact methods',
        'Phone & email storage',
        'Address management',
        'Contact preferences'
      ]
    },
    {
      title: 'WhatsApp Integration',
      description: 'Send notifications and updates directly to clients via WhatsApp for better communication.',
      icon: Mail01Icon,
      image: clientManagement,
      benefits: [
        'WhatsApp notifications',
        'Event confirmations',
        'Payment reminders',
        'Direct messaging'
      ]
    },
    {
      title: 'Event History Tracking',
      description: 'View complete history of all events and projects associated with each client.',
      icon: WorkHistoryIcon,
      image: clientManagement,
      benefits: [
        'Event history records',
        'Project timeline view',
        'Service tracking',
        'Relationship history'
      ]
    },
    {
      title: 'Payment History',
      description: 'Track all payments received from clients and monitor outstanding balances across events.',
      icon: Dollar01Icon,
      image: clientManagement,
      benefits: [
        'Payment history tracking',
        'Outstanding balance view',
        'Payment status monitoring',
        'Financial summaries'
      ]
    },
    {
      title: 'Client Reports',
      description: 'Generate detailed client reports and export client data in various formats for analysis.',
      icon: TextIcon,
      image: clientManagement,
      benefits: [
        'Client report generation',
        'Data export options',
        'PDF report creation',
        'Analytics insights'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Client Management
            <span className="block text-primary">Excellence</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Build stronger client relationships with comprehensive management tools designed for photography professionals.
          </p>
        </div>
      </section>

      {/* Features Zigzag Layout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {clientFeatures.map((feature, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}
            >
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {feature.title}
                  </h2>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                <div className="relative">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="rounded-xl shadow-2xl w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Transform Your Client Relationships
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Experience the power of organized client management with Stoodiora's comprehensive tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="/pricing"
              className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClientFeaturesPage;