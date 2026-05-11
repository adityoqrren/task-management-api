const API_URL = 'http://localhost:3000/api';

async function run() {
    try {
        // 1. Register
        const random = Math.floor(Math.random() * 10000);
        const user = {
            email: `test${random}@test.com`,
            password: 'password123',
            name: 'Test User',
            username: `testuser${random}`
        };

        console.log('--- Registering ---');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const regData = await regRes.json();
        console.log('Register Response:', JSON.stringify(regData, null, 2));

        // 2. Login
        console.log('\n--- Logging in ---');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, password: user.password })
        });
        const loginData = await loginRes.json();
        const token = loginData.data.accessToken;
        console.log('Login Response:', JSON.stringify(loginData, null, 2));

        // 3. Create Project
        console.log('\n--- Creating Project ---');
        const projResponse = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Real Project' })
        });
        const projData = await projResponse.json();
        console.log('Create Project Response:', JSON.stringify(projData, null, 2));
        const projectId = projData.data.projectId;

        // 4. Update Project (PATCH)
        console.log('\n--- Updating Project (PATCH) ---');
        const patchRes = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Updated Project Name' })
        });
        const patchData = await patchRes.json();
        console.log('Update Project Response:', JSON.stringify(patchData, null, 2));

        // 5. Get Project Tasks
        console.log('\n--- Get Project Tasks ---');
        const tasksres = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasksdata = await tasksres.json();
        console.log('Get Project Tasks Response:', JSON.stringify(tasksdata, null, 2));

        // 6. Delete Project (needs soft-delete first and special role, but let's see what the normal DELETE returns)
        // Actually, according to projectController, it throws if not soft-deleted.
        // Let's soft delete first.
        console.log('\n--- Soft Deleting Project ---');
        const softDelRes = await fetch(`${API_URL}/projects/${projectId}/soft-delete`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const softDelData = await softDelRes.json();
        console.log('Soft Delete Response:', JSON.stringify(softDelData, null, 2));

        console.log('\n--- Deleting Project Permanently ---');
        const delRes = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const delData = await delRes.json();
        console.log('Delete Response:', JSON.stringify(delData, null, 2));

    } catch (error) {
        console.log('Error:', error);
    }
}

run();
