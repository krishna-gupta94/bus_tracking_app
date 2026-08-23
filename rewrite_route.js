const fs = require('fs');
let code = fs.readFileSync('mobile/app/(student)/route.tsx', 'utf8');

// 1. Import useState, useEffect
code = code.replace(/import React, { useState } from 'react';/, 'import React, { useState, useEffect } from \'react\';\nimport { mobileApi } from \'../../src/services/api\';');

// 2. Add state and fetch logic
const fetchLogic = \
  const [liveRoute, setLiveRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route?.id) {
      setLoading(true);
      mobileApi.get('/routes/' + route.id)
        .then(res => setLiveRoute(res.data.data))
        .catch(err => console.log('Error fetching route', err))
        .finally(() => setLoading(false));
    }
  }, [route?.id]);

  const activeStops = selectedShift === 'MORNING' 
    ? (liveRoute?.stops || stops)
    : (liveRoute?.eveningStops || [...stops].reverse());
\;

code = code.replace(/const stops = route\?\.stops \? \[\.\.\.route\.stops\]\.sort[^\n]+;/g, \const stops = route?.stops ? [...route.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];\\);

// 3. Remove getExpectedTime usage and definition
code = code.replace(/\/\/ Approximate schedule times[\\s\\S]*?};\\n/, '');
code = code.replace(/const timeString = getExpectedTime[^;]+;/, 'const timeString = item.eta || \\'--\\';');
code = code.replace(/const isAssigned = student\?\.assignedStopId === item\.id;/, 'const isAssigned = student?.assignedStopId === item.id || student?.assignedStopId + \\'_evening\\' === item.id;');
code = code.replace(/stops\\.map/g, 'activeStops.map');
code = code.replace(/stops\\.length/g, 'activeStops.length');

// 4. Update the time badge
code = code.replace(/\{selectedShift === 'MORNING' \? '07:15 AM - 08:30 AM' : '04:15 PM - 05:30 PM'\}/, '{selectedShift === \\'EVENING\\' && liveRoute?.eveningDepartureTime ? \\'Departs at \\' + liveRoute.eveningDepartureTime : \\'Live Schedule\\'}');

fs.writeFileSync('mobile/app/(student)/route.tsx', code);
console.log('Done');

