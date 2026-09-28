import CodeBlock from './CodeBlock';

export default function DocsExamples() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Examples</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Real-world Rego policies to secure common agentic workflows.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="infrastructure-deployment" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">AWS Infrastructure Constraint</h2>
        <p>
          Prevent an agent from deploying excessively large or expensive resources on AWS EC2.
        </p>

        <CodeBlock
          language="rego"
          code={`package safeline.aws.ec2

default allow = false

# Allowed instance types for autonomous agents
allowed_instance_types := {"t3.micro", "t3.small", "t3.medium"}

allow {
    input.method == "POST"
    input.host == "ec2.amazonaws.com"
    
    # Parse the request body (assuming JSON tool call)
    body := input.body
    body.Action == "RunInstances"
    
    # Ensure the requested instance type is in the allowed set
    allowed_instance_types[body.InstanceType]
}

deny[msg] {
    input.method == "POST"
    input.host == "ec2.amazonaws.com"
    body := input.body
    body.Action == "RunInstances"
    
    not allowed_instance_types[body.InstanceType]
    msg := sprintf("Instance type '%v' is not allowed for autonomous deployment.", [body.InstanceType])
}`}
        />

        <h2 id="prevent-data-exfiltration" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Preventing Data Exfiltration</h2>
        <p>
          Ensure the agent only communicates with approved internal domains, preventing it from sending sensitive context to external servers.
        </p>

        <CodeBlock
          language="rego"
          code={`package safeline.network.egress

default allow = false

# Whitelist of allowed domains
allowed_domains := {
    "api.internal.corp",
    "metrics.internal.corp",
    "github.com"
}

allow {
    # Check if the requested host is in the whitelist
    allowed_domains[input.host]
}

deny[msg] {
    not allowed_domains[input.host]
    msg := sprintf("Egress traffic to %v is strictly prohibited.", [input.host])
}`}
        />

        <h2 id="time-based-access" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Time-Based Execution Window</h2>
        <p>
          Only allow the agent to execute mutating (POST/PUT/DELETE) actions during business hours (Monday to Friday, 9 AM to 5 PM UTC).
        </p>

        <CodeBlock
          language="rego"
          code={`package safeline.time

default allow = false

# Allow all safe GET requests regardless of time
allow {
    input.method == "GET"
}

allow {
    input.method != "GET"
    
    # Extract current time components
    now_ns := time.now_ns()
    weekday := time.weekday(now_ns)
    hour := time.clock(now_ns)[0]
    
    # Monday = 1, Friday = 5
    weekday >= 1
    weekday <= 5
    
    # 9 AM to 5 PM
    hour >= 9
    hour < 17
}

deny[msg] {
    input.method != "GET"
    not allow
    msg := "Destructive agent actions are only permitted during business hours (M-F, 9-5 UTC)."
}`}
        />
      </div>
    </div>
  );
}
