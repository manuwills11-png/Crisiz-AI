import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def generate_strategy(state_for_ai):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    zones = state_for_ai.get("all_zones", [])
    zones_sorted = sorted(zones, key=lambda z: z.get("severity_level", 0), reverse=True)

    zone_lines = ""
    for z in zones_sorted:
        zone_lines += (
            f"  • {z['name']} | {z['hazard_type']} | SEV {z['severity_level']:.1f} | "
            f"{z['threat_label']} | {z.get('population_at_risk', 0):,} at risk | "
            f"Conf {z.get('confidence', 0)}%\n"
        )

    top = zones_sorted[0] if zones_sorted else {}

    prompt = f"""You are an AI Emergency Operations Commander for Tamil Nadu, India.

ACTIVE CRISIS ZONES:
{zone_lines}
Top priority: {top.get('name','Unknown')} — SEV {top.get('severity_level',0):.1f} ({top.get('threat_label','')})

Generate a structured operational action plan. Address EVERY zone above by name.

Output EXACTLY this format — no extra text, no markdown, no explanations:

[PRIORITY COMMANDS]
1. <zone-specific command>
2. <zone-specific command>
3. <zone-specific command>

[RESOURCE DIRECTIVES]
- <specific resource allocation with zone name>
- <specific resource allocation with zone name>
- <specific resource allocation with zone name>

[EVACUATION & CIVIL CONTROL]
- <evacuation order with zone name and population figure>
- <evacuation order with zone name>

[RISK MONITORING]
- <monitoring directive with zone name>
- <monitoring directive with zone name>

Rules:
- Mention each zone by its exact name at least once across all sections.
- Use imperative military language.
- Include hazard type, severity level, and population figures from the data above.
- No invented statistics — only use the data provided.
- Maximum 16 lines total across all sections.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a crisis operations AI commander. Output only the structured plan in the exact format requested. No preamble, no explanation, no markdown."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        max_tokens=400,
    )

    return response.choices[0].message.content
