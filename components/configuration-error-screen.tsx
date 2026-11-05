"use client";

import { AlertTriangle, Terminal, HelpCircle, RefreshCw } from "lucide-react";
import { type FrontendConfigValidation } from "@/lib/config/frontend-config";

export function ConfigurationErrorScreen({
  config,
}: {
  config: FrontendConfigValidation;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-6">
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Configuration Error
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {config.error || "Invalid Environment Configuration"}
            </h1>
          </div>
        </div>

        {/* Details message */}
        {config.details && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {config.details}
          </p>
        )}

        {/* Current Environment Snapshot */}
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Terminal className="size-3.5" /> Current Detected Values (.env)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400">APP_MODE:</span>{" "}
              <span className={config.rawMode ? "text-slate-900 dark:text-slate-100 font-bold" : "text-amber-500 font-italic"}>
                {config.rawMode ? `"${config.rawMode}"` : "(empty / not set)"}
              </span>
            </div>
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400">INSTITUTION_ID:</span>{" "}
              <span className={config.rawInstitutionId ? "text-slate-900 dark:text-slate-100 font-bold" : "text-amber-500 font-italic"}>
                {config.rawInstitutionId ? `"${config.rawInstitutionId}"` : "(empty / not set)"}
              </span>
            </div>
          </div>
        </div>

        {/* How to Fix Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <HelpCircle className="size-3.5 text-blue-500" /> How to configure .env
          </div>

          <div className="space-y-3 text-xs">
            {/* Scenario A */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Option A: Institution Frontend Mode
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Loads the institution homepage, branding, and programs for the specified institution ID:
              </p>
              <pre className="p-2.5 rounded bg-slate-900 text-slate-100 dark:bg-black font-mono text-[11px] overflow-x-auto">
{`APP_MODE=institution
INSTITUTION_ID=125`}
              </pre>
            </div>

            {/* Scenario B */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Option B: Platform Admin Frontend Mode
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Loads the independent, clean Platform Admin frontend (no institution ID required):
              </p>
              <pre className="p-2.5 rounded bg-slate-900 text-slate-100 dark:bg-black font-mono text-[11px] overflow-x-auto">
{`APP_MODE=platform_admin
INSTITUTION_ID=`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>After updating your <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">.env</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">.env.local</code> file, restart or refresh the app.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 font-medium transition-opacity"
          >
            <RefreshCw className="size-3.5" />
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
