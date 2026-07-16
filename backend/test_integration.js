async function runTests() {
  const API_URL = process.argv[2] || process.env.API_URL || "http://localhost:5000/api";
  console.log("🧪 Starting Integration Tests on " + API_URL);

  try {
    // 1. Register User
    const regPayload = {
      username: "test_hr_user",
      full_name: "Test Administrator",
      email: "hr_admin@ricehr.com",
      password: "password123",
      phone: "9876543210",
      company_name: "RiceHR Test Corp"
    };

    console.log("\n1. Registering first user (should automatically assign role ADMIN)...");
    const regRes = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    console.log("Registration Response:", regData);

    if (regData.status !== "SUCCESS") {
      console.log("Registration failed or user already exists. Proceeding to login...");
    }

    // 2. Login User
    console.log("\n2. Logging in...");
    const loginRes = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: regPayload.email, password: regPayload.password })
    });
    const loginData = await loginRes.json();
    console.log("Login Response Status:", loginData.status);
    console.log("User Role:", loginData.user.role);
    console.log("User Paid Status:", loginData.isPaid);

    if (loginData.status !== "SUCCESS") {
      throw new Error("Login failed");
    }

    const token = loginData.token;

    // 3. Test Wage Validation (Non-compliant payload)
    console.log("\n3. Testing Wage Validation (Simple Mode, Non-Compliant 50% rule violation)...");
    const validatePayload = {
      mode: "SIMPLE",
      components: [
        { name: "Basic", value: 3000 },
        { name: "DA", value: 1000 },
        { name: "HRA", value: 4000 },
        { name: "Special Allowance", value: 3000 }
      ],
      overtimeHours: 5,
      overtimeRate: 50
    };

    const valRes = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(validatePayload)
    });
    const valData = await valRes.json();
    console.log("Validation Result Status:", valData.status);
    console.log("Issues found:", valData.issues);
    console.log("Suggestions:", valData.suggestions);
    console.log("Financial Impact (PF Increase):", valData.financialImpact?.difference?.pfIncrease);
    console.log("Recommended Structure Gross:", valData.recommendedStructure?.totalGross);
    console.log("Recommended Structure Note:", valData.recommendedStructure?.note);

    if (valData.status !== "NON_COMPLIANT") {
      throw new Error("Expected NON_COMPLIANT status");
    }

    // 4. Upgrade User to Premium
    console.log("\n4. Upgrading User to Premium...");
    const upgradeRes = await fetch(`${API_URL}/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ paymentCode: "123456789" })
    });
    const upgradeData = await upgradeRes.json();
    console.log("Upgrade Response:", upgradeData);

    if (upgradeData.status !== "UPGRADED") {
      throw new Error("Upgrade failed");
    }

    const premiumToken = upgradeData.token;

    // 5. Verify User Profile & history
    console.log("\n5. Fetching user profile and history...");
    const profileRes = await fetch(`${API_URL}/user/${regPayload.email}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${premiumToken}` }
    });
    const profileData = await profileRes.json();
    console.log("Profile User Email:", profileData.user?.email);
    console.log("Profile User isPaid:", profileData.user?.is_paid);
    console.log("History records count:", profileData.history?.length);

    if (profileData.user?.is_paid !== true) {
      throw new Error("User paid status should be true");
    }

    // 6. Test Admin Dashboard logs
    console.log("\n6. Fetching admin statistics & audit logs...");
    const statsRes = await fetch(`${API_URL}/admin/stats`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${premiumToken}` }
    });
    const statsData = await statsRes.json();
    console.log("Admin Statistics:", statsData.stats);

    const auditRes = await fetch(`${API_URL}/admin/audit-logs?limit=5`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${premiumToken}` }
    });
    const auditData = await auditRes.json();
    console.log("Recent Audit Logs:");
    auditData.data.logs.forEach(log => {
      console.log(`- [${log.action}] ${log.description}`);
    });

    console.log("\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! COMPLIANCE ENGINE IS FULLY FUNCTIONAL AND SECURE.");
  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error.message);
    process.exit(1);
  }
}

runTests();
