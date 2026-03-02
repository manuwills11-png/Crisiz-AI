import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def generate_strategy(state_for_ai):

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""
You are an AI Emergency Operations Commander.

Generate a structured operational action plan.
Output must follow EXACTLY this format:

[PRIORITY COMMANDS]
1. ...
2. ...
3. ...

[RESOURCE DIRECTIVES]
- ...
- ...

[EVACUATION & CIVIL CONTROL]
- ...
- ...

[RISK MONITORING]
- ...
- ...

Rules:
- Use imperative command language.
- Be specific to the zone.
- Reference severity, priority, and threat level.
- No explanations.
- No extra commentary.
- Maximum 12 total lines.
- Do NOT invent fake statistics.
- Use only provided data.

Zone: {state_for_ai["zone_name"]}
Priority Score: {state_for_ai["priority"]}
Confidence: {state_for_ai["confidence"]}%
Threat Level: {state_for_ai["threat"]}
"""

    response = client.models.generate_content(
        model="gemma-3-1b-it",
        contents=prompt,
        config={
            "temperature": 0.2,
            "max_output_tokens": 120
        }
    )

    return response.text