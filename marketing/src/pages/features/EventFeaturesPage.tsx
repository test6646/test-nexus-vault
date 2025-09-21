import React from 'react';
import { Calendar01Icon, Clock01Icon, UserStoryIcon, Dollar01Icon, Camera01Icon, FileEditIcon } from 'hugeicons-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import eventManagement from '../../assets/event-management.jpg';

const EventFeaturesPage = () => {
  const eventFeatures = [
    {
      title: 'Event Management',
      description: 'Create and manage events with comprehensive details including dates, times, venues, and client information.',
      icon: Calendar01Icon,
      image: eventManagement,
      benefits: [
        'Event creation & scheduling',
        'Client assignment',
        'Venue management',
        'Event status tracking'
      ]
    },
    {
      title: 'Staff Assignment',
      description: 'Assign photographers, assistants, and crew members to events with role-based management.',
      icon: UserStoryIcon,
      image: eventManagement,
      benefits: [
        'Staff role assignment',
        'Crew management',
        'Availability checking',
        'Event crew coordination'
      ]
    },
    {
      title: 'Payment Tracking',
      description: 'Track event payments, advance amounts, and outstanding balances with detailed payment history.',
      icon: Dollar01Icon,
      image: eventManagement,
      benefits: [
        'Payment status tracking',
        'Advance payment management',
        'Outstanding balance alerts',
        'Payment history records'
      ]
    },
    {
      title: 'Event Types & Pricing',
      description: 'Manage different event types like weddings, pre-weddings, and commercial shoots with custom pricing.',
      icon: Camera01Icon,
      image: eventManagement,
      benefits: [
        'Multiple event types',
        'Custom pricing per type',
        'Package management',
        'Service categorization'
      ]
    },
    {
      title: 'Event Reports',
      description: 'Generate detailed event reports and export data in PDF format for client sharing and record keeping.',
      icon: FileEditIcon,
      image: eventManagement,
      benefits: [
        'Detailed event reports',
        'PDF export functionality',
        'Client sharing',
        'Record keeping'
      ]
    },
    {
      title: 'Event Status Management',
      description: 'Track event progress from planning to completion with status updates and workflow management.',
      icon: Clock01Icon,
      image: eventManagement,
      benefits: [
        'Status tracking',
        'Workflow management',
        'Progress monitoring',
        'Completion tracking'
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
            Event Management
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Streamline your event planning and execution with comprehensive tools designed specifically for photography businesses.
          </p>
        </div>
      </section>

      {/* Features Zigzag Layout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {eventFeatures.map((feature, index) => (
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
            Ready to Streamline Your Events?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join photography professionals who trust Stoodiora to manage their event operations efficiently.
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

export default EventFeaturesPage;