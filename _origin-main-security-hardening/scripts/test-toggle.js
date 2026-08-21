(async ()=>{
  try {
    const base = 'http://127.0.0.1:5001/api';
    console.log('Logging in...');
    const r = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: '1234' }),
    });
    console.log('Login status', r.status);
    const login = await r.json().catch(()=>null);
    console.log('Login body', login);
    const token = login?.token;
    if (!token) throw new Error('No token from login');

    console.log('Creating tournament...');
    const createRes = await fetch(base + '/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name: 'E2E Test', sport: 'football', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], type: 'round-robin', status: 'upcoming', teamsCount: 0 }),
    });
    console.log('Create status', createRes.status);
    const created = await createRes.json().catch(()=>null);
    console.log('Created body', created);
    const id = created?._id || created?.id;
    if (!id) throw new Error('No id from create');

    console.log('Patching registration...');
    const patchRes = await fetch(base + `/admin/tournaments/${encodeURIComponent(id)}/registration`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ registrationOpen: true }),
    });
    console.log('Patch status', patchRes.status);
    const patchBody = await patchRes.json().catch(()=>null);
    console.log('Patch body', patchBody);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
