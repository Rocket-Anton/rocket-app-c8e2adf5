// Deutsche Feiertage nach Bundesland
// Quelle: Offizielle Feiertage in Deutschland

interface Holiday {
  name: string;
  date: Date;
}

// Berechnet Ostersonntag für ein gegebenes Jahr (Gauss'sche Osterformel)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

export function getHolidaysForState(year: number, state: string): Holiday[] {
  const holidays: Holiday[] = [];
  
  // Feste Feiertage (bundesweit)
  holidays.push({ name: "Neujahr", date: new Date(year, 0, 1) });
  holidays.push({ name: "Tag der Arbeit", date: new Date(year, 4, 1) });
  holidays.push({ name: "Tag der Deutschen Einheit", date: new Date(year, 9, 3) });
  holidays.push({ name: "1. Weihnachtstag", date: new Date(year, 11, 25) });
  holidays.push({ name: "2. Weihnachtstag", date: new Date(year, 11, 26) });
  
  // Variable Feiertage (von Ostern abhängig)
  const easter = getEasterSunday(year);
  
  const karfreitag = new Date(easter);
  karfreitag.setDate(easter.getDate() - 2);
  holidays.push({ name: "Karfreitag", date: karfreitag });
  
  const ostermontag = new Date(easter);
  ostermontag.setDate(easter.getDate() + 1);
  holidays.push({ name: "Ostermontag", date: ostermontag });
  
  const christi_himmelfahrt = new Date(easter);
  christi_himmelfahrt.setDate(easter.getDate() + 39);
  holidays.push({ name: "Christi Himmelfahrt", date: christi_himmelfahrt });
  
  const pfingstmontag = new Date(easter);
  pfingstmontag.setDate(easter.getDate() + 50);
  holidays.push({ name: "Pfingstmontag", date: pfingstmontag });
  
  // Bundeslandspezifische Feiertage
  switch (state) {
    case "Baden-Württemberg":
    case "Bayern":
    case "Hessen":
    case "Nordrhein-Westfalen":
    case "Rheinland-Pfalz":
    case "Saarland":
      const fronleichnam = new Date(easter);
      fronleichnam.setDate(easter.getDate() + 60);
      holidays.push({ name: "Fronleichnam", date: fronleichnam });
      break;
  }
  
  if (state === "Baden-Württemberg" || state === "Bayern" || state === "Sachsen-Anhalt") {
    holidays.push({ name: "Heilige Drei Könige", date: new Date(year, 0, 6) });
  }
  
  if (state === "Brandenburg" || state === "Bremen" || state === "Hamburg" || 
      state === "Mecklenburg-Vorpommern" || state === "Niedersachsen" || 
      state === "Sachsen" || state === "Sachsen-Anhalt" || 
      state === "Schleswig-Holstein" || state === "Thüringen") {
    holidays.push({ name: "Reformationstag", date: new Date(year, 9, 31) });
  }
  
  if (state === "Baden-Württemberg" || state === "Bayern" || state === "Saarland") {
    holidays.push({ name: "Allerheiligen", date: new Date(year, 10, 1) });
  }
  
  if (state === "Sachsen") {
    holidays.push({ name: "Buß- und Bettag", date: getBussUndBettag(year) });
  }
  
  if (state === "Thüringen") {
    holidays.push({ name: "Weltkindertag", date: new Date(year, 8, 20) });
  }
  
  if (state === "Berlin") {
    holidays.push({ name: "Internationaler Frauentag", date: new Date(year, 2, 8) });
  }
  
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getBussUndBettag(year: number): Date {
  // Buß- und Bettag ist 11 Tage vor dem 1. Advent
  // 1. Advent ist der 4. Sonntag vor Weihnachten
  const christmas = new Date(year, 11, 25);
  const dayOfWeek = christmas.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const firstAdvent = new Date(christmas);
  firstAdvent.setDate(christmas.getDate() - daysUntilSunday - 21);
  
  const bussUndBettag = new Date(firstAdvent);
  bussUndBettag.setDate(firstAdvent.getDate() - 11);
  
  return bussUndBettag;
}

export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  federalState?: string
): {
  totalDays: number;
  weekdays: number;
  saturdays: number;
  holidays: Holiday[];
  workingDays: number;
  effectiveDays: number;
} {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (start > end) {
    return { totalDays: 0, weekdays: 0, saturdays: 0, holidays: [], workingDays: 0, effectiveDays: 0 };
  }
  
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Sammle alle Jahre im Zeitraum
  const years = new Set<number>();
  const current = new Date(start);
  while (current <= end) {
    years.add(current.getFullYear());
    current.setDate(current.getDate() + 1);
  }
  
  // Hole alle Feiertage für die Jahre
  const allHolidays: Holiday[] = [];
  if (federalState) {
    years.forEach(year => {
      allHolidays.push(...getHolidaysForState(year, federalState));
    });
  }
  
  // Filtere Feiertage im Zeitraum, die auf Werktage fallen
  const holidaysInRange = allHolidays.filter(h => {
    const holidayDate = new Date(h.date);
    holidayDate.setHours(0, 0, 0, 0);
    const dayOfWeek = holidayDate.getDay();
    return holidayDate >= start && 
           holidayDate <= end && 
           dayOfWeek !== 0 && 
           dayOfWeek !== 6;
  });
  
  // Zähle Tage
  let weekdays = 0;
  let saturdays = 0;
  
  const day = new Date(start);
  while (day <= end) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 6) {
      saturdays++;
    } else if (dayOfWeek !== 0) {
      weekdays++;
    }
    day.setDate(day.getDate() + 1);
  }
  
  const workingDays = weekdays - holidaysInRange.length;
  const effectiveDays = workingDays + (saturdays * 0.5);
  
  return {
    totalDays,
    weekdays,
    saturdays,
    holidays: holidaysInRange,
    workingDays,
    effectiveDays,
  };
}
