/* eslint-disable no-console */
const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';

const users = {
  admin: {
    email: process.env.RBAC_ADMIN_EMAIL || 'admin@edossier.com',
    password: process.env.RBAC_ADMIN_PASSWORD || 'password123'
  },
  manager: {
    email: process.env.RBAC_MANAGER_EMAIL || 'chidi@edossier.com',
    password: process.env.RBAC_MANAGER_PASSWORD || 'password123'
  }
};

const invalidObjectId = '64b64b64b64b64b64b64b64b';
const probeCurrency = `X${Date.now().toString().slice(-2)}B`;

const report = {
  passed: [],
  failed: []
};

function pass(message) {
  report.passed.push(message);
  console.log(`✓ ${message}`);
}

function fail(message) {
  report.failed.push(message);
  console.log(`✗ ${message}`);
}

async function jfetch(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function login(credentials, label) {
  const result = await jfetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });

  if (result.status !== 200 || !result.data?.token) {
    fail(`${label} login failed (${result.status})`);
    return null;
  }

  pass(`${label} login succeeded`);
  return result.data.token;
}

async function assertStatus(title, requestPromise, expectedStatuses) {
  const result = await requestPromise;
  const expected = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  if (expected.includes(result.status)) {
    pass(`${title} returned ${result.status}`);
  } else {
    fail(`${title} expected ${expected.join(' or ')}, got ${result.status}`);
  }
  return result;
}

async function createTempUser(adminToken, role, namePrefix) {
  const email = `${namePrefix}.rbac.${Date.now()}@edossier.com`;
  const payload = {
    firstName: 'RBAC',
    lastName: namePrefix,
    email,
    password: 'password123',
    role,
    territory: 'Lagos',
    country: 'Nigeria'
  };

  const result = await jfetch('/auth/register', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(payload)
  });

  if (result.status !== 201 || !result.data?._id) {
    fail(`temporary ${role} creation failed (${result.status})`);
    return null;
  }

  pass(`temporary ${role} created`);
  return { id: result.data._id, email, password: payload.password };
}

async function cleanup(adminToken, userIds = []) {
  for (const userId of userIds) {
    if (!userId) continue;
    await jfetch(`/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }

  await jfetch(`/exchange-rates/${probeCurrency}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
}

async function run() {
  const health = await jfetch('/health');
  if (health.status === 200) {
    pass('API health check succeeded');
  } else {
    fail(`API health check failed (${health.status})`);
  }

  const adminToken = await login(users.admin, 'admin');
  const managerToken = await login(users.manager, 'manager');

  if (!adminToken || !managerToken) {
    console.log('\nRBAC regression aborted due to missing credentials.');
    process.exit(1);
  }

  const tempBursar = await createTempUser(adminToken, 'bursar', 'Bursar');
  const tempSalesRep = await createTempUser(adminToken, 'sales_rep', 'SalesRep');
  if (!tempBursar || !tempSalesRep) {
    await cleanup(adminToken, [tempBursar?.id, tempSalesRep?.id]);
    process.exit(1);
  }

  const bursarToken = await login({ email: tempBursar.email, password: tempBursar.password }, 'bursar');
  const salesRepToken = await login({ email: tempSalesRep.email, password: tempSalesRep.password }, 'sales_rep');
  if (!bursarToken || !salesRepToken) {
    await cleanup(adminToken, [tempBursar.id, tempSalesRep.id]);
    process.exit(1);
  }

  await assertStatus(
    'manager can access users list',
    jfetch('/users', { headers: { Authorization: `Bearer ${managerToken}` } }),
    200
  );

  await assertStatus(
    'sales_rep cannot access users list',
    jfetch('/users', { headers: { Authorization: `Bearer ${salesRepToken}` } }),
    403
  );

  await assertStatus(
    'bursar can access users list',
    jfetch('/users', { headers: { Authorization: `Bearer ${bursarToken}` } }),
    200
  );

  await assertStatus(
    'manager can approve commission route',
    jfetch(`/commissions/${invalidObjectId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${managerToken}` }
    }),
    404
  );

  await assertStatus(
    'bursar cannot approve commission',
    jfetch(`/commissions/${invalidObjectId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bursarToken}` }
    }),
    403
  );

  await assertStatus(
    'bursar can access disburse route',
    jfetch(`/commissions/${invalidObjectId}/disburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bursarToken}` },
      body: JSON.stringify({ paymentReference: 'RBAC-REGRESSION' })
    }),
    404
  );

  await assertStatus(
    'manager cannot access disburse route',
    jfetch(`/commissions/${invalidObjectId}/disburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ paymentReference: 'RBAC-REGRESSION' })
    }),
    403
  );

  await assertStatus(
    'bursar can upsert exchange rates',
    jfetch(`/exchange-rates/${probeCurrency}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bursarToken}` },
      body: JSON.stringify({ rateToNGN: 1700, description: 'RBAC regression probe' })
    }),
    200
  );

  await assertStatus(
    'bursar cannot delete exchange rates',
    jfetch(`/exchange-rates/${probeCurrency}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bursarToken}` }
    }),
    403
  );

  await assertStatus(
    'admin can delete exchange rates',
    jfetch(`/exchange-rates/${probeCurrency}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    }),
    200
  );

  await cleanup(adminToken, [tempBursar.id, tempSalesRep.id]);

  console.log('\nRBAC regression summary');
  console.log(`Passed: ${report.passed.length}`);
  console.log(`Failed: ${report.failed.length}`);

  if (report.failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('RBAC regression runner failed:', error.message);
  process.exit(1);
});