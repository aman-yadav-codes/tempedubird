const fs = require('fs');
const filePath = 'd:/edubird/components/auth/auth-modal-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update REGISTER_ROLES
content = content.replace(
  `const REGISTER_ROLES = [
  { value: "student", label: "Student (Access courses, notes & exams)" },
  { value: "guardian", label: "Guardian / Parent (Monitor student academic progress)" },
  { value: "institution_admin", label: "Professional / Organization (Manage institution, courses & administration)" },
];`,
  `const REGISTER_ROLES = [
  { value: "student", label: "Student (Access courses, notes & exams)" },
  { value: "guardian", label: "Guardian / Parent (Monitor student academic progress)" },
  { value: "institution_admin", label: "Institution / Organization (Manage institution & courses)" },
  { value: "affiliate", label: "Affiliate Partner (Earn commissions by referring students & partners)" },
];`
);

// 2. Add signUpReferralCode state
const stateTarget = `  const [signUpRole, setSignUpRole] = useState("student");`;
const stateReplacement = `  const [signUpRole, setSignUpRole] = useState("student");
  const [signUpReferralCode, setSignUpReferralCode] = useState("");

  useEffect(() => {
    const refCode =
      searchParams?.get("ref") ||
      searchParams?.get("referral") ||
      searchParams?.get("affiliate") ||
      searchParams?.get("code") ||
      "";
    if (refCode && !signUpReferralCode) {
      setSignUpReferralCode(refCode);
    }
  }, [searchParams, signUpReferralCode]);`;

if (content.includes(stateTarget) && !content.includes("signUpReferralCode")) {
  content = content.replace(stateTarget, stateReplacement);
}

// 3. Add referral_code to handleSignUp payload
const payloadTarget = `          address: signUpCity.trim(),
          role_code: signUpRole,
          password: signUpPassword,`;
const payloadReplacement = `          address: signUpCity.trim(),
          role_code: signUpRole,
          referral_code: signUpReferralCode.trim() || null,
          password: signUpPassword,`;

if (content.includes(payloadTarget)) {
  content = content.replace(payloadTarget, payloadReplacement);
}

// 4. Add referral input field in signup form right after Phone & Register As row
const formTarget = `                {/* Register As */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Register As <span className="text-[#D91B1B]">*</span>
                    </span>
                    <select
                      value={signUpRole}
                      onChange={(e) => setSignUpRole(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent outline-none border-none p-0 focus:ring-0 cursor-pointer truncate"
                    >
                      {availableRegisterRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>`;

const formReplacement = `                {/* Register As */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Register As <span className="text-[#D91B1B]">*</span>
                    </span>
                    <select
                      value={signUpRole}
                      onChange={(e) => setSignUpRole(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent outline-none border-none p-0 focus:ring-0 cursor-pointer truncate"
                    >
                      {availableRegisterRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Referral / Affiliate Code (Optional) */}
              <div
                onBlur={() => handleBlur()}
                className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Referral / Affiliate Code <span className="text-slate-400 font-normal">(Optional)</span>
                    </span>
                    {signUpReferralCode && (
                      <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Referrer's 10-digit mobile number"
                    value={signUpReferralCode}
                    onChange={(e) => setSignUpReferralCode(e.target.value)}
                    disabled={submitting}
                    className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                  />
                </div>
              </div>`;

if (content.includes(formTarget)) {
  content = content.replace(formTarget, formReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('auth-modal-dialog.tsx updated successfully');
