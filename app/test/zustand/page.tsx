"use client";

import { useAuthStore } from "@/store";

export default function ZustandTestPage() {
    const { user, setAuth, clearAuth } = useAuthStore();

    return (
        <div className="p-10">
            <button
                onClick={() =>
                    setAuth(
                        {
                            id: 1,
                            full_name: "Aman",
                            is_active: true,
                            roles: ["admin"],
                            role_codes: ["admin"],
                            primary_role: "admin",
                            is_super_admin: false,
                            can_access_admin: false,
                            permissions: [],
                            memberships: [],
                        },
                        "token123"
                    )
                }
            >
                Login
            </button>

            <button onClick={clearAuth}>Logout</button>

            <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
    );
}
