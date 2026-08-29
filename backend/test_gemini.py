import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

company = "Google"
role = "Software Engineer"

prompt = f"""
You are a senior technical interviewer at {company}.
Generate exactly 5 interview questions for a {role} candidate.
Cover a mix of: data structures/algorithms, system design basics, and behavioral questions.
Return ONLY a numbered list of questions, no introduction, no extra commentary.
"""

response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=prompt
)

print(response.text)