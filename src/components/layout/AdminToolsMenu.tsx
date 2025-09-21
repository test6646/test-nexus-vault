import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode01Icon,
  Calculator01Icon,
  CreditCardIcon,
  UserMultiple02Icon,
  Settings02Icon,
  GoogleSheetIcon,
  Calendar01Icon
} from 'hugeicons-react';

interface AdminToolsMenuProps {
  className?: string;
  onAvailabilityClick?: () => void;
}

const AdminToolsMenu = ({ className, onAvailabilityClick }: AdminToolsMenuProps) => {
  const navigate = useNavigate();
  const { currentFirm } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: 'Staff Availability',
      icon: UserMultiple02Icon,
      action: 'availability'
    },
    {
      label: 'WhatsApp',
      icon: QrCode01Icon,
      href: '/whatsapp'
    },
    {
      label: 'Accounts',
      icon: Calculator01Icon,
      href: '/accounts'
    },
    {
      label: 'Subscription',
      icon: CreditCardIcon,
      href: '/subscription'
    },
    {
      label: 'Google Spreadsheet',
      icon: GoogleSheetIcon,
      action: 'spreadsheet'
    },
    {
      label: 'Calendar',
      icon: Calendar01Icon,
      action: 'calendar'
    }
  ];

  const handleItemClick = (item: typeof menuItems[0]) => {
    if (item.action === 'availability' && onAvailabilityClick) {
      onAvailabilityClick();
    } else if (item.action === 'spreadsheet') {
      if (currentFirm?.spreadsheet_id) {
        window.open(`https://docs.google.com/spreadsheets/d/${currentFirm.spreadsheet_id}`, '_blank');
      } else {
        toast({
          title: "No Spreadsheet Found",
          description: "Please set up Google Sheets integration first.",
          variant: "destructive",
        });
      }
    } else if (item.action === 'calendar') {
      if (currentFirm?.calendar_id) {
        window.open(`https://calendar.google.com/calendar/embed?src=${currentFirm.calendar_id}`, '_blank');
      } else {
        toast({
          title: "No Calendar Found", 
          description: "Please set up Google Calendar integration first.",
          variant: "destructive",
        });
      }
    } else if (item.href) {
      navigate(item.href);
    }
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 hover:bg-primary/10"
            title="Admin Tools"
          >
            <Settings02Icon className="h-3.5 w-3.5 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Admin Tools
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="cursor-pointer p-3 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AdminToolsMenu;