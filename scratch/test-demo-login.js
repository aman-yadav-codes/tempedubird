async function testDemoLogin(role) {
  try {
    const res = await fetch("http://localhost:3000/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    console.log(`[Demo Login Test - ${role}] Status:`, res.status);
    if (res.ok) {
      console.log(`  User: ${json.user?.full_name} (${json.user?.email})`);
      console.log(`  RedirectTo: ${json.redirectTo}`);
      console.log(`  Role Codes: ${json.user?.role_codes?.join(", ")}`);
    } else {
      console.error(`  Error:`, json);
    }
  } catch (err) {
    console.error(`  Exception:`, err.message);
  }
}

async function run() {
  console.log("Testing All Demo Account Logins...");
  await testDemoLogin("student");
  await testDemoLogin("guardian");
  await testDemoLogin("professional");
  await testDemoLogin("platform_admin");
}

run();
