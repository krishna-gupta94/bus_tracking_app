
export function parseTimeToMinutes(timeStr: string | null): number {
  if (!timeStr) return 0;
  timeStr = timeStr.trim().toLowerCase();
  let hours = 0;
  let mins = 0;
  const isPM = timeStr.includes('pm');
  const isAM = timeStr.includes('am');
  const timePart = timeStr.replace(/[a-z]/g, '').trim();
  const parts = timePart.split(':');
  
  if (parts.length >= 2) {
    hours = parseInt(parts[0], 10);
    mins = parseInt(parts[1], 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
  }
  return hours * 60 + mins;
}

export function formatMinutesToTime(totalMins: number): string {
  let h = Math.floor(totalMins / 60) % 24;
  let m = totalMins % 60;
  const isPM = h >= 12;
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const hStr = h.toString();
  const mStr = m.toString().padStart(2, '0');
  return hStr + ':' + mStr + ' ' + (isPM ? 'PM' : 'AM');
}

export function extractEveningDeparture(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/\[EVENING_DEPARTURE:\s*(.*?)\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function cleanDescription(description: string | null): string {
  if (!description) return '';
  return description.replace(/\[EVENING_DEPARTURE:\s*.*?\]/i, '').trim();
}

export function generateEveningStops(morningStops: any[], description: string | null): any[] {
  if (!morningStops || morningStops.length === 0) return [];
  
  const departureStr = extractEveningDeparture(description) || '04:15 PM';
  const departureMins = parseTimeToMinutes(departureStr); 

  const sortedStops = [...morningStops].sort((a, b) => a.sequence - b.sequence);
  
  const durations: number[] = [];
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const t1 = parseTimeToMinutes(sortedStops[i].eta || '');
    const t2 = parseTimeToMinutes(sortedStops[i+1].eta || '');
    const diff = t2 - t1;
    durations.push(diff >= 0 ? diff : 0);
  }

  const eveningStops = [...sortedStops].reverse();
  
  let currentMins = departureMins;
  
  return eveningStops.map((stop, index) => {
    const newStop = { ...stop, isEvening: true };
    newStop.id = stop.id + '_evening';
    newStop.eta = formatMinutesToTime(currentMins);
    newStop.sequence = index + 1;
    
    if (index < durations.length) {
      const reverseDuration = durations[durations.length - 1 - index];
      currentMins += reverseDuration;
    }
    
    return newStop;
  });
}

