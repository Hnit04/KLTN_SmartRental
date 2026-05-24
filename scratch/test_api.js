async function run() {
  try {
    // 1. Login as admin
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin.tinh', password: 'password' }) // Or whatever the password is, maybe '123456'
    });
    
    if (!loginRes.ok) {
      console.log("Login failed with status:", loginRes.status);
      // Let's try 123456
      const loginRes2 = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin.tinh', password: 'password123' })
      });
      if (!loginRes2.ok) {
        console.log("Login 2 failed:", loginRes2.status);
        // Try another password common for seed
        const loginRes3 = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin.tinh', password: '123' })
        });
        if (!loginRes3.ok) {
          console.log("Login 3 failed. Cannot get token.");
          return;
        }
      }
    }
    
    let token = '';
    const text = await loginRes.text();
    try {
      const data = JSON.parse(text);
      token = data.data?.token || data.token;
    } catch(e) {
      // maybe loginRes2?
      console.log("Parsing token failed");
    }
    
    if (!token) {
       console.log("No token found");
       return;
    }

    console.log("Got token!");
    
    // 2. Hit the report endpoint
    const resolveRes = await fetch('http://localhost:8080/api/admin/reports/8/resolve', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ status: 'RESOLVED_CLEAN', adminNotes: 'test' })
    });
    
    const resolveBody = await resolveRes.text();
    console.log("Resolve response status:", resolveRes.status);
    console.log("Resolve response body:", resolveBody);
    
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
