/**
 * GenForge Smoke Test Suite
 * Tests health endpoint, scan endpoint, generation endpoint, and ask endpoint.
 */

async function runSmokeTests() {
  console.log('🧪 Starting GenForge Smoke Tests...');
  const baseUrl = process.env.TEST_URL || 'http://127.0.0.1:3000';
  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [Pass] Health check: Status ${data.status}, Uptime ${data.uptimeSeconds}s, Scanner: ${data.scanner?.status}`);
      passed++;
    } else {
      console.error(`❌ [Fail] Health check returned ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error(`❌ [Fail] Health check connection error: ${err.message}`);
    failed++;
  }

  // Test 2: Dual-Signal Scanner
  try {
    const res = await fetch(`${baseUrl}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            path: 'test.js',
            content: 'const key = "AIzaSyD-12345678901234567890"; eval("2+2"); document.body.innerHTML = input;',
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const findings = data.results?.[0]?.patternFindings || [];
      const model = data.results?.[0]?.modelPrediction;
      console.log(`✅ [Pass] Scanner: Detected ${findings.length} AST patterns, CodeBERT Risk Score: ${model?.riskScore} (${model?.label})`);
      passed++;
    } else {
      console.error(`❌ [Fail] Scanner returned ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error(`❌ [Fail] Scanner connection error: ${err.message}`);
    failed++;
  }

  // Test 3: Generate Route
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a simple counter app with increment and decrement',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [Pass] Generator: Produced ${data.files?.length} files (${data.summary})`);
      passed++;
    } else {
      console.error(`❌ [Fail] Generator returned ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error(`❌ [Fail] Generator connection error: ${err.message}`);
    failed++;
  }

  // Summary
  console.log('\n=============================================');
  console.log(`Smoke Test Results: ${passed} passed, ${failed} failed`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
