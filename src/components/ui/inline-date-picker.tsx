import * as React from "react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InlineDatePickerProps {
  value?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i) // Current year + 9 years

export function InlineDatePicker({
  value,
  onSelect,
  placeholder = "Select date",
  className,
  disabled = false,
}: InlineDatePickerProps) {
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
      // Create date in local timezone to avoid offset issues - month is 0-indexed in Date constructor
      const newDate = new Date(parseInt(finalYear), parseInt(finalMonth), parseInt(finalDay))
      onSelect?.(newDate)
    }
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <div>
        <Select value={selectedDay} onValueChange={(value) => {
          setSelectedDay(value)
          handleDateChange(value, selectedMonth, selectedYear)
        }} disabled={disabled}>
          <SelectTrigger className="bg-background rounded-full h-10">
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
      
      <div>
        <Select value={selectedMonth} onValueChange={(value) => {
          setSelectedMonth(value)
          handleDateChange(selectedDay, value, selectedYear)
        }} disabled={disabled}>
          <SelectTrigger className="bg-background rounded-full h-10">
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
      
      <div>
        <Select value={selectedYear} onValueChange={(value) => {
          setSelectedYear(value)
          handleDateChange(selectedDay, selectedMonth, value)
        }} disabled={disabled}>
          <SelectTrigger className="bg-background rounded-full h-10">
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
  )
}