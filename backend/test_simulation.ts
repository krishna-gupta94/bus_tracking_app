import { boardingSimulationService } from './src/services/boardingSimulationService';

const result = boardingSimulationService.runSimulationSuite();

console.log('====================================================');
console.log(`🚌 AUTOMATIC BOARDING DETECTION SIMULATION SUITE`);
console.log(`   Passed: ${result.passedScenarios}/${result.totalScenarios} (${result.accuracyPercentage}%)`);
console.log('====================================================');

result.results.forEach((r) => {
  const mark = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark} | #${String(r.scenarioId).padStart(2, '0')}: ${r.name}`);
  console.log(`       Expected: ${r.expectedStatus}`);
  console.log(`       Detected: ${r.detectedStatus} (Confidence: ${r.confidence}%, Bus: ${r.detectedBus || 'None'})`);
  console.log(`       Notes:    ${r.notes}\n`);
});

if (result.failedScenarios > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 20 BOARDING DETECTION SCENARIOS PASSED PERFECTLY!\n');
}
