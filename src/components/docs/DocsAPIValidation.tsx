import CodeBlock from './CodeBlock';

export default function DocsAPIValidation() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">API Validation</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Enforce strict schema contracts on agent-generated tool calls and HTTP requests.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="overview" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Overview</h2>
        <p>
          LLMs are prone to hallucinating parameters, inventing non-existent API endpoints, or sending malformed JSON payloads. SafeLine uses JSON Schema to strictly validate the structure of every outbound request before it reaches the target server.
        </p>

        <h2 id="json-schema" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">JSON Schema Enforcement</h2>
        <p>
          SafeLine allows you to bind specific JSON Schemas to specific HTTP routes. If the agent generates a payload that does not match the schema, SafeLine instantly blocks the request and returns a `400 Bad Request` with exact validation errors back to the agent.
        </p>

        <p>This creates a tight feedback loop where the agent can observe the error and retry with the correct schema, without ever touching the actual production API.</p>

        <h2 id="configuration" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Configuration Example</h2>
        <p>
          First, define your JSON Schema. Place this in your `./policies` directory.
        </p>

        <CodeBlock
          language="json"
          code={`// ./policies/schemas/create_user.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "username": { "type": "string", "minLength": 3 },
    "role": { "enum": ["viewer", "editor"] }
  },
  "required": ["username", "role"],
  "additionalProperties": false
}`}
        />

        <p>
          Next, bind the schema to a specific endpoint using a Rego policy.
        </p>

        <CodeBlock
          language="rego"
          code={`# ./policies/api_validation.rego
package safeline.api

import data.schemas.create_user

default allow_schema = false

allow_schema {
    input.method == "POST"
    input.path == "/api/users"
    
    # Validate the payload against the loaded JSON schema
    json.is_valid(input.body, create_user)
}`}
        />

        <h2 id="agent-feedback" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Agent Feedback Loop</h2>
        <p>
          If the agent attempts to send an invalid payload (e.g., adding an unauthorized field like `"role": "admin"`), SafeLine intercepts the request and responds with:
        </p>

        <CodeBlock
          language="json"
          code={`HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "policy_violation",
  "message": "Request blocked by SafeLine API Validation",
  "details": [
    {
      "path": "/role",
      "error": "must be equal to one of the allowed values: viewer, editor"
    }
  ]
}`}
        />
      </div>
    </div>
  );
}
