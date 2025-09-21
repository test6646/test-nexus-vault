import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Target02Icon, 
  BulbIcon, 
  UserGroupIcon,
  Camera01Icon,
  Video01Icon,
  HeartAddIcon,
  CursorProgress02Icon,
} from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const AboutUsPage = () => {
  const values = [
    {
      icon: Target02Icon,
      title: 'Mission Driven',
      description: 'Empowering photographers and cinematographers to focus on their craft by eliminating administrative burdens.'
    },
    {
      icon: BulbIcon,
      title: 'Innovation First',
      description: 'Constantly evolving our platform with cutting-edge features that address real industry challenges.'
    },
    {
      icon: HeartAddIcon,
      title: 'Customer Focused',
      description: 'Every feature is designed with our users in mind, ensuring maximum value and usability.'
    },
    {
      icon: CursorProgress02Icon,
      title: 'Continuous Growth',
      description: 'Helping studios scale their operations efficiently while maintaining quality and professionalism.'
    }
  ];

  const team = [
    {
      name: 'Preet Suthar',
      role: 'Founder & CEO',
      description: 'Passionate photographer turned tech entrepreneur with 10+ years in the photography industry.',
      image: '/api/placeholder/150/150'
    },
    {
      name: 'Technical Team',
      role: 'Development Team',
      description: 'Expert developers specializing in business automation and creative industry solutions.',
      image: '/api/placeholder/150/150'
    },
    {
      name: 'Creative Team',
      role: 'Design & UX',
      description: 'Professional designers who understand the creative workflow and business needs.',
      image: '/api/placeholder/150/150'
    }
  ];

  const stats = [
    { number: '100+', label: 'Photography Studios' },
    { number: '10,000+', label: 'Events Managed' },
    { number: '₹50L+', label: 'Revenue Processed' },
    { number: '99.9%', label: 'Uptime Guarantee' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Built by Creators,
            <span className="block text-primary">For Creators</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stoodiora was born from the real challenges faced by photography and videography 
            studios. We understand your workflow because we've lived it.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-6">
                Founded in 2023, Stoodiora emerged from a simple realization: photographers and 
                cinematographers were spending more time on paperwork than on their passion. Our founder,
                having run a successful photography studio, experienced firsthand the challenges of 
                managing clients, events, finances, and staff across multiple platforms.
              </p>
              <p className="text-muted-foreground mb-6">
               What started as an internal tool to streamline studio operations has evolved into 
                 a comprehensive platform trusted by photography professionals across India. 
                 We've automated the administrative tasks so you can focus on creating stunning visuals.
              </p>
              <div className="flex items-center space-x-4">
                <Camera01Icon className="w-8 h-8 text-primary" />
                <Video01Icon className="w-8 h-8 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Photography & Videography Focused
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <UserGroupIcon className="w-24 h-24 text-primary mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Empowering Creative Studios
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Our Impact in Numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These core values guide everything we do at Stoodiora, from product development 
              to customer support.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A passionate group of creators, developers, and business experts working together 
              to revolutionize studio management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-card rounded-xl border border-border p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <UserGroupIcon className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-primary font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.description}
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
            Ready to Join Our Community?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Be part of a growing community of photographers and cinematographers who have 
            transformed their business operations with Stoodiora.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start Free Trial
            </Link>
            <Link
              to="/contact"
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;