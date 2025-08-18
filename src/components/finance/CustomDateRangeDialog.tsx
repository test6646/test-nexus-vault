import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomDateRangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  startDate?: Date;
  endDate?: Date;
}

const CustomDateRangeDialog = ({ 
  isOpen, 
  onOpenChange, 
  onDateRangeChange,
  startDate,
  endDate
}: CustomDateRangeDialogProps) => {
  const [tempStartDay, setTempStartDay] = useState<string>(startDate ? startDate.getDate().toString() : '');
  const [tempStartMonth, setTempStartMonth] = useState<string>(startDate ? (startDate.getMonth() + 1).toString() : '');
  const [tempStartYear, setTempStartYear] = useState<string>(startDate ? startDate.getFullYear().toString() : '');
  const [tempEndDay, setTempEndDay] = useState<string>(endDate ? endDate.getDate().toString() : '');
  const [tempEndMonth, setTempEndMonth] = useState<string>(endDate ? (endDate.getMonth() + 1).toString() : '');
  const [tempEndYear, setTempEndYear] = useState<string>(endDate ? endDate.getFullYear().toString() : '');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) {
      return Array.from({ length: 31 }, (_, i) => (i + 1).toString());
    }
    const daysCount = new Date(parseInt(year), parseInt(month), 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => (i + 1).toString());
  };

  const handleApply = () => {
    if (tempStartDay && tempStartMonth && tempStartYear && tempEndDay && tempEndMonth && tempEndYear) {
      const newStartDate = new Date(parseInt(tempStartYear), parseInt(tempStartMonth) - 1, parseInt(tempStartDay));
      const newEndDate = new Date(parseInt(tempEndYear), parseInt(tempEndMonth) - 1, parseInt(tempEndDay));
      onDateRangeChange(newStartDate, newEndDate);
    }
    onOpenChange(false);
  };

  const handleClear = () => {
    setTempStartDay('');
    setTempStartMonth('');
    setTempStartYear('');
    setTempEndDay('');
    setTempEndMonth('');
    setTempEndYear('');
    onDateRangeChange(undefined, undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)]">
        <DialogHeader>
          <DialogTitle>Select Custom Date Range</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Start Date */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Start Date</label>
            <div className="grid grid-cols-3 gap-3">
              <Select value={tempStartDay} onValueChange={setTempStartDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getDaysInMonth(tempStartMonth, tempStartYear).map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tempStartMonth} onValueChange={setTempStartMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tempStartYear} onValueChange={setTempStartYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">End Date</label>
            <div className="grid grid-cols-3 gap-3">
              <Select value={tempEndDay} onValueChange={setTempEndDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getDaysInMonth(tempEndMonth, tempEndYear).map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tempEndMonth} onValueChange={setTempEndMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tempEndYear} onValueChange={setTempEndYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleApply} 
              className="flex-1"
              disabled={!tempStartDay || !tempStartMonth || !tempStartYear || !tempEndDay || !tempEndMonth || !tempEndYear}
            >
              Apply
            </Button>
            <Button 
              onClick={handleClear} 
              variant="outline"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDateRangeDialog;