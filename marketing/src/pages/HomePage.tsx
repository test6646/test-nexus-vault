import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar01Icon, UserStoryIcon, Dollar01Icon, FileEditIcon, CheckmarkSquare01Icon, UserMultipleIcon, Invoice01Icon, WhatsappIcon, PlayIcon } from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import VideoPopup from '../components/VideoPopup';
import dashboardHero from '../assets/dashboard-hero.jpg';

const HomePage = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const features = [
    {
      title: 'Event Management',
      description: 'Complete event lifecycle management from booking to delivery. Handle weddings, pre-weddings, corporate events, and all photography sessions with automated scheduling, venue tracking, and payment milestones.',
      icon: Calendar01Icon
    },
    {
      title: 'Client Management',
      description: 'Centralized client database with comprehensive profiles, communication history, project timelines, and preferences. Build stronger relationships with automated follow-ups and personalized service.',
      icon: UserStoryIcon
    },
    {
      title: 'Financial Tracking',
      description: 'Real-time financial dashboard with profit/loss analysis, expense categorization, tax preparation reports, and revenue forecasting. Track equipment depreciation, travel costs, and salary payments with detailed analytics.',
      icon: Dollar01Icon
    },
    {
      title: 'Invoice Generation',
      description: 'Professional, branded invoices with customizable templates, automated payment reminders, and multi-currency support. Integrate with payment gateways for seamless online payments.',
      icon: Invoice01Icon
    },
    {
      title: 'Task Management',
      description: 'Advanced project workflows with team collaboration, deadline tracking, priority management, and automated notifications. Ensure nothing falls through the cracks with smart task dependencies.',
      icon: CheckmarkSquare01Icon
    },
    {
      title: 'Staff Management',
      description: 'Complete crew management with skill-based assignments, availability tracking, performance analytics, and automated salary calculations. Manage photographers, cinematographers, editors, and assistants efficiently.',
      icon: UserMultipleIcon
    },
    {
      title: 'Quotation System',
      description: 'Dynamic pricing engine with package customization, discount management, contract templates, and e-signature integration. Convert quotes to bookings with automated workflows.',
      icon: FileEditIcon
    },
    {
      title: 'WhatsApp Integration',
      description: 'Seamless communication with automated client notifications, staff updates, and instant document sharing. Maintain professional communication while staying connected.',
      icon: WhatsappIcon
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                Professional Studio
                <span className="block text-primary">Management System</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                Transform your photography business with Stoodiora's all-in-one platform. 
                Manage events, track finances, handle client relationships, and coordinate your team 
                - all from one intuitive dashboard designed specifically for photography professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/contact"
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Get Started Today
                </Link>
                <button
                  onClick={() => setIsVideoOpen(true)}
                  className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-accent transition-colors flex items-center justify-center space-x-2"
                >
                  <PlayIcon className="w-5 h-5" />
                  <span>Get Intro</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src={dashboardHero} 
                alt="Stoodiora Dashboard" 
                className="rounded-xl shadow-2xl w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Run Your Studio
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From event booking to financial reporting, our system covers every aspect of your photography business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4 text-primary">
                  <feature.icon className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Transform Your Studio Operations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join photography professionals who trust our system to manage their business efficiently.
          </p>
          <Link
            to="/pricing"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity inline-block"
          >
            View Pricing Plans
          </Link>
        </div>
      </section>

      <VideoPopup 
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        title="Stoodiora Introduction Video"
      />

      <Footer />
    </div>
  );
};

export default HomePage;