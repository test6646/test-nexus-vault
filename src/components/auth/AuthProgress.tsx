
import { Tick02Icon, CircleIcon, Clock01Icon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface AuthProgressProps {
  currentStep: 'signup' | 'verification' | 'profile' | 'complete';
  className?: string;
}

const steps = [
  { id: 'signup', title: 'Account Creation', description: 'Create your account' },
  { id: 'verification', title: 'Email Verification', description: 'Verify your email address' },
  { id: 'profile', title: 'Profile Setup', description: 'Complete your profile' },
  { id: 'complete', title: 'Welcome', description: 'Ready to start' }
];

export const AuthProgress = ({ currentStep, className }: AuthProgressProps) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={cn("w-full max-w-2xl mx-auto mb-8", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary bg-primary/10",
                  isUpcoming && "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Tick02Icon className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock01Icon className="w-5 h-5" />
                  ) : (
                    <CircleIcon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px mx-2 transition-colors",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary",
                  isUpcoming && "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
