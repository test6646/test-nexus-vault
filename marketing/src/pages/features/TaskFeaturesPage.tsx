import React from 'react';
import { CheckmarkSquare01Icon, Target01Icon, UserStoryIcon, Clock01Icon, ChartBarLineIcon, Notification01Icon } from 'hugeicons-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import taskManagement from '../../assets/task-management.jpg';

const TaskFeaturesPage = () => {
  const taskFeatures = [
    {
      title: 'Task Creation & Management',
      description: 'Create, assign, and track tasks with detailed descriptions, priorities, and deadlines for your team.',
      icon: CheckmarkSquare01Icon,
      image: taskManagement,
      benefits: [
        'Task creation & assignment',
        'Priority level setting',
        'Deadline management',
        'Status tracking'
      ]
    },
    {
      title: 'Staff Task Assignment',
      description: 'Assign tasks to specific staff members and track their progress and completion status.',
      icon: UserStoryIcon,
      image: taskManagement,
      benefits: [
        'Staff member assignment',
        'Individual task tracking',
        'Progress monitoring',
        'Workload distribution'
      ]
    },
    {
      title: 'Task Status Management',
      description: 'Track task progress through different status levels from pending to completed.',
      icon: Target01Icon,
      image: taskManagement,
      benefits: [
        'Status progression tracking',
        'Completion monitoring',
        'Progress visualization',
        'Workflow management'
      ]
    },
    {
      title: 'Task Reporting',
      description: 'Generate comprehensive task reports and export data for analysis and record keeping.',
      icon: ChartBarLineIcon,
      image: taskManagement,
      benefits: [
        'Task completion reports',
        'Performance analytics',
        'Data export options',
        'Team productivity insights'
      ]
    },
    {
      title: 'Task Notifications',
      description: 'Automated WhatsApp notifications for task assignments, updates, and completion status.',
      icon: Notification01Icon,
      image: taskManagement,
      benefits: [
        'WhatsApp notifications',
        'Task assignment alerts',
        'Deadline reminders',
        'Status update notifications'
      ]
    },
    {
      title: 'Task Timeline Tracking',
      description: 'Monitor task timelines with creation dates, due dates, and completion tracking.',
      icon: Clock01Icon,
      image: taskManagement,
      benefits: [
        'Timeline visualization',
        'Due date tracking',
        'Completion time analysis',
        'Schedule management'
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
            Task Management
            <span className="block text-primary">Perfected</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Boost productivity and ensure nothing falls through the cracks with Stoodiora's comprehensive task management tools.
          </p>
        </div>
      </section>

      {/* Features Zigzag Layout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {taskFeatures.map((feature, index) => (
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
            Maximize Your Team's Productivity
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Transform how your photography team works with Stoodiora's powerful task management features.
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

export default TaskFeaturesPage;