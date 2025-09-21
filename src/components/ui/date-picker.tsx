
import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  defaultMonth?: Date
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() + i) // Current year + 3 years

export function DatePicker({
  value,
  onSelect,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDay, setSelectedDay] = React.useState<string>(value ? value.getDate().toString() : "")
  const [selectedMonth, setSelectedMonth] = React.useState<string>(value ? value.getMonth().toString() : "")
  const [selectedYear, setSelectedYear] = React.useState<string>(value ? value.getFullYear().toString() : "")

  React.useEffect(() => {
    if (value) {
      setSelectedDay(value.getDate().toString())
      setSelectedMonth(value.getMonth().toString())
      setSelectedYear(value.getFullYear().toString())
    }
  }, [value])

  const handleDateChange = (day?: string, month?: string, year?: string) => {
    const finalDay = day || selectedDay
    const finalMonth = month || selectedMonth
    const finalYear = year || selectedYear
    
    if (finalDay && finalMonth && finalYear) {
      // Create date in local timezone to avoid offset issues
      const newDate = new Date(parseInt(finalYear), parseInt(finalMonth), parseInt(finalDay))
      onSelect?.(newDate)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-background border shadow-lg" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium text-foreground">Select Date</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Day</label>
              <Select value={selectedDay} onValueChange={(value) => {
                setSelectedDay(value)
                handleDateChange(value, selectedMonth, selectedYear)
              }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg max-h-60">
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day.toString()} className="hover:bg-accent">
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Month</label>
              <Select value={selectedMonth} onValueChange={(value) => {
                setSelectedMonth(value)
                handleDateChange(selectedDay, value, selectedYear)
              }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg max-h-60">
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={index.toString()} className="hover:bg-accent">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Year</label>
              <Select value={selectedYear} onValueChange={(value) => {
                setSelectedYear(value)
                handleDateChange(selectedDay, selectedMonth, value)
              }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg max-h-60">
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="hover:bg-accent">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
