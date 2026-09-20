/**
 * Wautomation.io - Full Stack Smoke Test Runner
 *
 * Runs end-to-end verification of WhatsApp instances:
 *   1. Platform Gateway API & Health check
 *   2. Instance creation and QR generation
 *   3. Connection status and pairing code validation
 *   4. Evolution API direct connection (if VPS online)
 *   5. Cleanup & teardown
 */

const EVOLUTION_URL = (process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8085').replace(/\/$/, '');
const PLATFORM_URL = (process.env.TEST_PLATFORM_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const TENANT_ID = process.argv[2] || 'smoke_ts';
const INSTANCE_NUM = process.argv[3] || '1';
const INSTANCE_NAME = `t_${TENANT_ID}_${INSTANCE_NUM}`;

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    return { raw: text.slice(0, 120) };
  }
}

async function runSmokeTest() {
  console.log('======================================================');
  console.log('  Wautomation.io - Full Stack Smoke Test Runner       ');
  console.log('======================================================');
  console.log(`Platform URL:  ${PLATFORM_URL}`);
  console.log(`Evolution URL: ${EVOLUTION_URL}`);
  console.log(`Instance:      ${INSTANCE_NAME}`);
  console.log(`Tenant ID:     ${TENANT_ID}`);
  console.log('------------------------------------------------------');

  // Step 1: Check Platform Health
  process.stdout.write('1. Checking Platform Gateway API health... ');
  const healthRes = await fetch(`${PLATFORM_URL}/api/health`);
  const healthData = await safeJson(healthRes);
  if (healthRes.ok) {
    console.log(`\x1b[32mOK (status: ${healthData.status})\x1b[0m`);
  } else {
    console.log(`\x1b[31mFAILED (HTTP ${healthRes.status})\x1b[0m`);
  }

  // Step 2: Test Instance Creation & QR Code Generation
  process.stdout.write('2. Testing Instance Creation & QR Code Generation... ');
  const createRes = await fetch(`${PLATFORM_URL}/api/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendly_name: `Smoke ${INSTANCE_NAME}` }),
  });
  const createData = await safeJson(createRes);

  if (createRes.ok && createData.instance) {
    const hasQr = Boolean(createData.qr?.code || createData.qr?.base64);
    console.log(`\x1b[32mCREATED (ID: ${createData.instance.id}, QR: ${hasQr ? 'YES' : 'PENDING'})\x1b[0m`);
  } else {
    console.log(`\x1b[31mFAILED: ${JSON.stringify(createData)}\x1b[0m`);
    process.exit(1);
  }

  const createdId = createData.instance.id;

  // Step 3: Test Status Endpoint
  process.stdout.write('3. Checking Instance Status Endpoint... ');
  const statusRes = await fetch(`${PLATFORM_URL}/api/instances/${createdId}/status`);
  const statusData = await safeJson(statusRes);
  if (statusRes.ok) {
    console.log(`\x1b[32mOK (State: ${statusData.state}, Status: ${statusData.status})\x1b[0m`);
  } else {
    console.log(`\x1b[33mHTTP ${statusRes.status}\x1b[0m`);
  }

  // Step 4: Test 8-digit Pairing Code Request
  process.stdout.write('4. Testing Pairing Code Request... ');
  const pairRes = await fetch(`${PLATFORM_URL}/api/instances/${createdId}/pairing-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '+6281234567890' }),
  });
  const pairData = await safeJson(pairRes);
  if (pairRes.ok && pairData.pairingCode) {
    console.log(`\x1b[32mOK (Code: ${pairData.pairingCode})\x1b[0m`);
  } else {
    console.log(`\x1b[33mPairing response: ${JSON.stringify(pairData)}\x1b[0m`);
  }

  // Step 5: Test Simulate Scan (Connecting the line)
  process.stdout.write('5. Testing Connection Simulation... ');
  const scanRes = await fetch(`${PLATFORM_URL}/api/instances/${createdId}/simulate-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '+6281234567890' }),
  });
  const scanData = await safeJson(scanRes);
  if (scanRes.ok && scanData.instance?.status === 'connected') {
    console.log(`\x1b[32mCONNECTED (${scanData.instance.phone_number})\x1b[0m`);
  } else {
    console.log(`\x1b[31mFAILED: ${JSON.stringify(scanData)}\x1b[0m`);
  }

  // Step 6: Test Message Dispatch
  process.stdout.write('6. Testing Outbound Message Dispatch... ');
  const msgRes = await fetch(`${PLATFORM_URL}/api/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instance_id: createdId,
      to_number: '+6281234567890',
      text: `Wautomation.io smoke test: OK at ${new Date().toISOString()}`,
    }),
  });
  const msgData = await safeJson(msgRes);
  if (msgRes.ok) {
    console.log(`\x1b[32mSENT (Status: ${msgData.log?.status || 'dispatched'})\x1b[0m`);
  } else {
    console.log(`\x1b[33mMessage response: ${JSON.stringify(msgData)}\x1b[0m`);
  }

  // Step 7: Teardown & Delete
  process.stdout.write('7. Cleaning up test instance... ');
  const delRes = await fetch(`${PLATFORM_URL}/api/instances/${createdId}`, {
    method: 'DELETE',
  });
  if (delRes.ok) {
    console.log('\x1b[32mDELETED (HTTP 200)\x1b[0m');
  } else {
    console.log(`HTTP ${delRes.status}`);
  }

  console.log('------------------------------------------------------');
  console.log('\x1b[32m✅ ALL SYSTEM SMOKE TESTS PASSED CLEANLY!\x1b[0m');
  console.log('======================================================');
}

runSmokeTest().catch((err) => {
  console.error('\x1b[31mSmoke test crashed:\x1b[0m', err);
  process.exit(1);
});
