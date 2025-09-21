import React, { useState } from 'react';
import { PlayIcon, Video01Icon, Calendar01Icon, UserStoryIcon, Dollar01Icon, CheckmarkSquare01Icon } from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import VideoPopup from '../components/VideoPopup';

const TutorialsPage = () => {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const tutorials = [
    {
      id: 'getting-started',
      title: 'Getting Started with Stoodiora',
      description: 'Complete walkthrough of setting up your studio management system',
      duration: '12:30',
      icon: Video01Icon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'Account setup and firm creation',
        'Basic navigation overview',
        'Setting up your team members',
        'Setting up firm info',
        'Initial configuration'
      ]
    },
    {
      id: 'event-management',
      title: 'Event Management Master Class',
      description: 'Learn to manage weddings, pre-weddings, and all event types efficiently',
      duration: '18:45',
      icon: Calendar01Icon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'Creating and scheduling events',
        'Client assignment to events',
        'Staff allocation and roles',
        'Payment tracking',
        'Event status management'
      ]
    },
    {
      id: 'client-management',
      title: 'Client Management System',
      description: 'Organize and manage your client database like a pro',
      duration: '15:20',
      icon: UserStoryIcon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'Adding and organizing clients',
        'Contact information management',
        'Event history tracking',
        'Communication logs',
        'Client reports generation'
      ]
    },
    {
      id: 'financial-management',
      title: 'Financial Tracking & Reports',
      description: 'Master your studio finances with detailed tracking and reporting',
      duration: '22:15',
      icon: Dollar01Icon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'Income and expense tracking',
        'Creating financial reports',
        'Profit & loss analysis',
        'Tax preparation reports',
        'Payment management'
      ]
    },
    {
      id: 'task-management',
      title: 'Task & Assignment Management',
      description: 'Streamline your workflow with effective task management',
      duration: '14:30',
      icon: CheckmarkSquare01Icon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'Creating and assigning tasks',
        'Setting priorities and deadlines',
        'Progress tracking',
        'Team collaboration',
        'Task reports and analytics'
      ]
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features & Integrations',
      description: 'Explore advanced features and third-party integrations',
      duration: '25:45',
      icon: Video01Icon,
      videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      topics: [
        'WhatsApp integration setup',
        'Google Sheets synchronization',
        'Advanced reporting features',
        'Custom quotations and invoices',
        'Backup and data export'
      ]
    }
  ];

  const handleVideoPlay = (videoUrl: string) => {
    setCurrentVideo(videoUrl);
    setIsVideoOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Video Tutorials &
            <span className="block text-primary">Learning Center</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Master every feature of Stoodiora with our comprehensive video tutorials and step-by-step guides.
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <p className="text-primary font-medium">
              All tutorials are updated regularly and feature real studio workflows
            </p>
          </div>
        </div>
      </section>

      {/* Tutorials Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <tutorial.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {tutorial.title}
                      </h3>
                      <p className="text-muted-foreground mb-3">
                        {tutorial.description}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Video01Icon className="w-4 h-4" />
                        <span>{tutorial.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">What you'll learn:</h4>
                    <ul className="space-y-2">
                      {tutorial.topics.map((topic, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-muted-foreground">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleVideoPlay(tutorial.videoUrl)}
                    className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>Watch Tutorial</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Need More Help?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Can't find what you're looking for? Our support team is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:team.stoodiora@gmail.com"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
            >
              Contact Support
            </a>
            <a
              href="https://wa.me/919106403233"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
            >
              WhatsApp Help
            </a>
          </div>
        </div>
      </section>

      <VideoPopup 
        isOpen={isVideoOpen}
        onClose={() => {
          setIsVideoOpen(false);
          setCurrentVideo(null);
        }}
        videoUrl={currentVideo || ''}
        title="Stoodiora Tutorial"
      />

      <Footer />
    </div>
  );
};

export default TutorialsPage;