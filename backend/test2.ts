import { generateEveningStops } from './src/utils/routeTiming'; console.log(generateEveningStops([
      { id: '1', name: 'Badaun', sequence: 1, eta: '7 : 00 am' },
      { id: '2', name: 'Bhamora', sequence: 2, eta: '7 : 40 AM' },
      { id: '3', name: 'Devchara', sequence: 3, eta: '7:50 AM' },
      { id: '4', name: 'Setellite', sequence: 4, eta: '8: 35 AM' },
      { id: '5', name: 'Invertis university', sequence: 5, eta: '8:55 AM' }
    ], 'COLLECT ALL  STUDENTS TO COLLEGE'));
