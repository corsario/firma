export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function getWednesdaysOfMonth(year: number, monthZeroBased: number): string[] {
  const wednesdays: string[] = [];
  const daysInMonth = new Date(year, monthZeroBased + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthZeroBased, day, 12, 0, 0);
    if (d.getDay() === 3) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(monthZeroBased + 1).padStart(2, '0');
      wednesdays.push(`${year}-${monthStr}-${dayStr}`);
    }
  }
  return wednesdays;
}
