import { ShieldAlert, CheckCircle2, Lock, Activity } from 'lucide-react';

export default function DocsComplianceEngine() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Compliance Engine</h1>
      <p className="text-lg text-[#64748B] mb-8">
        The core ruleset evaluator ensuring AI agents stay within authorized bounds.
      </p>

      <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Rule Evaluation</h2>
        <p>
          The Compliance Engine evaluates incoming requests against a configured set of JSON-based rules. It focuses on restricting HTTP methods, blocking unauthorized domains, and enforcing payload schemas.
        </p>

        <h3 className="text-xl font-semibold text-[#0F172A] mt-8 mb-4">Example Ruleset</h3>
        <p>
          Policies are defined using strict JSON or YAML syntax. Below is a sample rule configuration that prevents an agent from performing destructive actions in production.
        </p>

        <div className="my-6 bg-[#0F172A] rounded-xl p-4 overflow-x-auto text-sm text-blue-300 font-mono">
<pre className="m-0 bg-transparent p-0"><code>{`{
  "rules": [
    {
      "id": "block-prod-delete",
      "type": "block",
      "condition": {
        "method": "DELETE",
        "urlPattern": "^https://api\\\\.production\\\\.internal/.*$"
      },
      "message": "Destructive actions are prohibited in production."
    },
    {
      "id": "require-auth",
      "type": "enforce",
      "condition": {
        "headers": {
          "Authorization": "^Bearer .+$"
        }
      },
      "message": "Missing or invalid authorization header."
    }
  ]
}`}</code></pre>
        </div>

        <h2 className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Live Execution Timeline</h2>
        <p>
          When an agent issues a request, the engine intercepts and logs the result.
        </p>

        <div className="my-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 md:p-8">
           <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                    <Activity className="w-4 h-4 text-blue-600" />
                 </div>
                 <div>
                    <h4 className="font-semibold text-[#0F172A] m-0 mb-1">1. Interception</h4>
                    <p className="text-sm text-[#64748B] m-0">The request is caught at the proxy layer before network egress.</p>
                 </div>
              </div>
              
              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-1">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                 </div>
                 <div>
                    <h4 className="font-semibold text-[#0F172A] m-0 mb-1">2. Evaluation</h4>
                    <p className="text-sm text-[#64748B] m-0">Engine maps request metadata against loaded policies sequentially.</p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-1">
                    <Lock className="w-4 h-4 text-red-600" />
                 </div>
                 <div>
                    <h4 className="font-semibold text-[#0F172A] m-0 mb-1">3. Enforcement</h4>
                    <p className="text-sm text-[#64748B] m-0">If a block rule triggers, the request is dropped and a 403 Forbidden is returned to the agent.</p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                 </div>
                 <div>
                    <h4 className="font-semibold text-[#0F172A] m-0 mb-1">4. Approval</h4>
                    <p className="text-sm text-[#64748B] m-0">If all rules pass, the request is dispatched to the upstream environment.</p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
