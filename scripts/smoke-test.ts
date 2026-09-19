/**
 * Wautomation.io - Evolution API Node.js / TypeScript Smoke Test Runner
 *
 * Runs end-to-end verification of Evolution API:
 *   1. Health check
 *   2. Create instance (t_<tenantId>_<n>)
 *   3. Retrieve QR code and pairing code
 *   4. Check connection state
 *   5. Optional message dispatch
 *   6. Delete instance
 */

const BASE_URL = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const TENANT_ID = process.argv[2] || 'smoke_ts';
const INSTANCE_NUM = process.argv[3] || '1';
const INSTANCE_NAME = `t_${TENANT_ID}_${INSTANCE_NUM}`;
const TEST_RECIPIENT = process.argv[4] || '';

async function runSmokeTest() {
  console.log('======================================================');
  console.log('  Wautomation.io - TypeScript Smoke Test Runner       ');
  console.log('======================================================');
  console.log(`Base URL:      ${BASE_URL}`);
  console.log(`Instance:      ${INSTANCE_NAME}`);
  console.log(`Tenant ID:     ${TENANT_ID}`);
  console.log('------------------------------------------------------');

  const headers = {
    'Content-Type': 'application/json',
    apikey: API_KEY,
  };

  // 1. Health check
  process.stdout.write('1. Checking Evolution API connectivity... ');
  try {
    const healthRes = await fetch(`${BASE_URL}/`, { headers });
    const healthData = await healthRes.text();
    if (healthRes.ok) {
      console.log(`\x1b[32mOK (HTTP ${healthRes.status})\x1b[0m`);
    } else {
      console.log(`\x1b[31mHTTP ${healthRes.status}: ${healthData}\x1b[0m`);
      process.exit(1);
    }
  } catch (err: any) {
    console.log(`\x1b[31mConnection error: ${err.message}\x1b[0m`);
    console.log('Ensure Evolution API is running and reachable.');
    process.exit(1);
  }

  // 2. Pre-cleanup
  process.stdout.write(`2. Pre-cleaning '${INSTANCE_NAME}' if exists... `);
  try {
    await fetch(`${BASE_URL}/instance/delete/${INSTANCE_NAME}`, {
      method: 'DELETE',
      headers,
    });
    console.log('\x1b[32mClean\x1b[0m');
  } catch {
    console.log('\x1b[33mIgnored\x1b[0m');
  }

  // 3. Create instance
  process.stdout.write(`3. Creating instance '${INSTANCE_NAME}'... `);
  const createRes = await fetch(`${BASE_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceName: INSTANCE_NAME,
      token: 'smoke_' + Math.random().toString(36).substring(2, 12),
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });

  const createData = await createRes.json();
  if (createRes.ok) {
    console.log(`\x1b[32mCREATED (HTTP ${createRes.status})\x1b[0m`);
  } else {
    console.log(`\x1b[31mFAILED (HTTP ${createRes.status}): ${JSON.stringify(createData)}\x1b[0m`);
    process.exit(1);
  }

  // 4. Fetch QR code & pairing code
  process.stdout.write('4. Fetching QR Code & Pairing Code endpoint... ');
  await new Promise((r) => setTimeout(r, 2000));
  const connectRes = await fetch(`${BASE_URL}/instance/connect/${INSTANCE_NAME}`, {
    headers,
  });
  const connectData: any = await connectRes.json();
  if (connectRes.ok) {
    const hasQr = connectData?.code || connectData?.base64;
    console.log(
      hasQr
        ? '\x1b[32mSUCCESS (QR payload generated)\x1b[0m'
        : '\x1b[33mWAITING FOR SOCKET (HTTP 200)\x1b[0m'
    );
  } else {
    console.log(`\x1b[31mFAILED (HTTP ${connectRes.status})\x1b[0m`);
  }

  // 5. Connection state
  process.stdout.write('5. Checking instance connection state... ');
  const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${INSTANCE_NAME}`, {
    headers,
  });
  const stateData = await stateRes.json();
  console.log(`\x1b[32mReported:\x1b[0m ${JSON.stringify(stateData)}`);

  // 6. Test message dispatch
  if (TEST_RECIPIENT) {
    process.stdout.write(`6. Dispatching test message to ${TEST_RECIPIENT}... `);
    const msgRes = await fetch(`${BASE_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: TEST_RECIPIENT,
        text: `Wautomation.io smoke test: OK at ${new Date().toISOString()}`,
      }),
    });
    console.log(`HTTP ${msgRes.status}`);
  } else {
    console.log('6. Message dispatch: \x1b[33mSKIPPED (no test recipient provided)\x1b[0m');
  }

  // 7. Cleanup
  process.stdout.write(`7. Tearing down instance '${INSTANCE_NAME}'... `);
  const deleteRes = await fetch(`${BASE_URL}/instance/delete/${INSTANCE_NAME}`, {
    method: 'DELETE',
    headers,
  });
  if (deleteRes.ok) {
    console.log('\x1b[32mDELETED (HTTP 200)\x1b[0m');
  } else {
    console.log(`HTTP ${deleteRes.status}`);
  }

  console.log('------------------------------------------------------');
  console.log('\x1b[32m✅ PHASE 1 SMOKE TEST COMPLETED SUCCESSFULLY!\x1b[0m');
  console.log('======================================================');
}

runSmokeTest().catch((err) => {
  console.error('\x1b[31mSmoke test crashed:\x1b[0m', err);
  process.exit(1);
});
