import re
import os
import json
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form, status
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from ..models.models import User
from .auth import verify_token
from ..config import settings
from ..services.rag_service import RAGService

import google.generativeai as genai

router = APIRouter()

# Configure Gemini
import logging
logger = logging.getLogger(__name__)

try:
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to configure Gemini: {e}", exc_info=True)


def is_math_equation(text: str) -> bool:
    """
    Detect math-like patterns (LaTeX, equations, symbols)
    """
    latex_patterns = [
        r"\$.*?\$",          # Inline math
        r"\\begin\{.*?\}",    # LaTeX environments
        r"\\frac", r"\\int", r"\\sum", r"\\sqrt", r"\\alpha", r"\\beta", r"\\theta",
        r"\b[xXyYzZ]\b",      # variables
        r"[\+\-\*\/=\^]",     # operators
        r"\d+[\+\-\*\/=]"     # arithmetic expressions
    ]
    for pattern in latex_patterns:
        if re.search(pattern, text):
            return True
    return False


def solve_math_step_by_step(equation: str) -> dict:
    """
    Pass the equation to Gemini and request a step-by-step solution
    """
    prompt = (
        f"Please solve this math/physics problem step-by-step:\n{equation}\n\n"
        "Return the response ONLY as a JSON object with two fields:\n"
        "- 'solution': a short string of the final answer\n"
        "- 'steps': a list of strings, each showing a sequential step to get the answer.\n"
        "Do not include markdown wrappers (like ```json) in your response, just return the raw JSON object."
    )

    use_real = False
    try:
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
            use_real = True
    except Exception:
        pass

    if use_real:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            clean_text = response.text.strip()
            # Remove potential markdown block
            if clean_text.startswith("```"):
                clean_text = re.sub(r"^```(?:json)?\n", "", clean_text)
                clean_text = re.sub(r"\n```$", "", clean_text)
            return json.loads(clean_text)
        except Exception as e:
            logger.error(f"Error solving with Gemini: {e}. Falling back to mock solver.", exc_info=True)

    # Fallback/Mock Math Solver
    if "integral" in equation.lower() or "\\int" in equation:
        return {
            "solution": "x^3 / 3 + C",
            "steps": [
                "Identify the integrand as x^2.",
                "Apply the power rule for integration: integral of x^n is x^(n+1)/(n+1).",
                "Here n = 2, so the antiderivative is x^(2+1)/(2+1) = x^3 / 3.",
                "Add the constant of integration C."
            ]
        }
    elif "Newton" in equation or "force" in equation.lower() or "f =" in equation.lower():
        return {
            "solution": "F = 50 N",
            "steps": [
                "State the given values: mass m = 10 kg, acceleration a = 5 m/s^2.",
                "Recall Newton's Second Law: F = m * a.",
                "Substitute the values: F = 10 kg * 5 m/s^2.",
                "Calculate the product: F = 50 N."
            ]
        }
    else:
        return {
            "solution": "x = 5",
            "steps": [
                "Write down the equation: 2x + 3 = 13.",
                "Subtract 3 from both sides: 2x = 10.",
                "Divide both sides by 2: x = 5."
            ]
        }


@router.post("")
@router.post("/ocr")
async def ocr_solve(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # 1. OCR text extraction
    extracted_text = ""
    filename = file.filename.lower()

    # Simulate extraction based on files or default fallback
    if "physics" in filename:
        extracted_text = "A box of mass 10 kg is accelerated at 5 m/s^2. What is the net force?"
    elif "math" in filename or "eq" in filename:
        extracted_text = "Solve the integral: \\int x^2 dx"
    else:
        extracted_text = "Newton's first law of motion"

    # 2. Check if it's a math equation or physics problem needing mathematical steps
    if is_math_equation(extracted_text) or "solve" in extracted_text.lower() or "calculate" in extracted_text.lower():
        solved = solve_math_step_by_step(extracted_text)
        return {
            "extracted_text": extracted_text,
            "solution": solved.get("solution", ""),
            "steps": solved.get("steps", [])
        }
    else:
        # 3. Chain to RAG tutor if it's a general conceptual question
        context_results = RAGService.retrieve_context(extracted_text, k=2)
        context_text = "\n".join([r["text"] for r in context_results])

        prompt = (
            f"Context: {context_text}\n\nQuestion: {extracted_text}\n\n"
            "Provide a step-by-step explanation for the question above using only the context."
        )

        use_real = False
        try:
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
                use_real = True
        except Exception:
            pass

        solution = ""
        if use_real:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                res = model.generate_content(prompt)
                solution = res.text
            except Exception as e:
                logger.error(f"Error calling Gemini in OCR fallback RAG: {e}", exc_info=True)

        if not solution:
            solution = f"According to the NCERT textbook, {extracted_text} is defined by the laws of motion or kinetics."

        steps = [s.strip() for s in solution.split("\n") if s.strip()]

        return {
            "extracted_text": extracted_text,
            "solution": solution,
            "steps": steps
        }
