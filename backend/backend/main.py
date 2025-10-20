# main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, status, Request, Depends, Query, Body, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from collections import Counter
from datetime import datetime
from dotenv import load_dotenv
from uuid import uuid4

import os
import re
import json
import httpx
import requests
import asyncio

import pytesseract
from pdf2image import convert_from_bytes
from io import BytesIO
import pdfplumber
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

from supabase import create_client, Client

# =========================
# Boot & Config
# =========================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
AI_API_URL   = os.getenv("AI_API_URL")
AI_API_KEY   = os.getenv("AI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Inquizitive Backend (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

ALLOWED_TABLES = {"profiles", "quizzes", "classes", "questions", "question_options", "results"}

def now_iso():
    return datetime.utcnow().isoformat()

# =========================
# Models
# =========================
class GenerateQuizRequest(BaseModel):
    topic: str
    n_questions: int = Field(..., gt=0, le=100)
    format: str = Field("mcq")

class OptionCreate(BaseModel):
    text: str
    is_correct: bool = False

class QuestionCreate(BaseModel):
    text: str
    type: str
    options: Optional[List[OptionCreate]] = None

class SubmitAnswer(BaseModel):
    question_id: str
    answer: Optional[str] = None

class GenericRecord(BaseModel):
    data: Dict[str, Any]

class ClassStudentAction(BaseModel):
    class_id: int
    student_id: str

class AuthedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None

class EnsureTeacher(BaseModel):
    full_name: Optional[str] = None

class EnsureStudent(BaseModel):
    full_name: Optional[str] = None
    seat_no:   Optional[str] = None

class StudentPatch(BaseModel):
    full_name: Optional[str] = None
    seat_no:   Optional[str] = None
    email:     Optional[str] = None

# =========================
# Utilities
# =========================
def _pct(v):
    try:
        return max(0, min(100, int(round(float(v)))))
    except Exception:
        return None

def _quiz_ids_for_class(cid: int):
    rs = (supabase.table("quizzes")
          .select("quiz_id,title,created_at")
          .eq("class_id", cid)
          .order("created_at")
          .execute().data or [])
    return rs, [q["quiz_id"] for q in rs]

def normalize_q_type(raw_type: Optional[str]) -> str:
    if not raw_type:
        return "short"
    t = str(raw_type).strip().lower()
    mapping = {
        "mcq": "mcq", "multiple_choice": "mcq", "multiple choice": "mcq", "multiple-choice": "mcq", "choice": "mcq",
        "short": "short", "short_answer": "short", "short answer": "short", "short-answer": "short",
        "true_false": "true_false", "true/false": "true_false", "true false": "true_false", "tf": "true_false", "boolean": "true_false",
    }
    return mapping.get(t, "short")

# --- OCR helpers ------------------------------------------------------------
# def _setup_tesseract_cmd():
#     """
#     Allow pytesseract to find the binary even when it's not in PATH.
#     Export TESSERACT_CMD to override (e.g., Windows: C:\\Program Files\\Tesseract-OCR\\tesseract.exe).
#     """
#     cmd = os.getenv("TESSERACT_CMD")
#     if cmd:
#         pytesseract.pytesseract.tesseract_cmd = cmd

def _setup_tesseract_cmd():
    """
    Allow pytesseract to find the binary even when it's not in PATH.
    Set TESSERACT_CMD env to override manually.
    """
    cmd = os.getenv("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
        return

    # Try a few common locations (won't error if missing)
    common = [
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract",                  # macOS (Apple Silicon)
        r"C:\Program Files\Tesseract-OCR\tesseract.exe" # Windows default
    ]
    for p in common:
        if os.path.isfile(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break

def _ocr_image_bytes(raw: bytes) -> str:
    """
    Robust OCR for a single image:
    - auto-orient via EXIF
    - resample ~300dpi
    - contrast + sharpen
    - multiple binarizations (normal/inverted)
    - multiple tesseract configs (psm 6/11/4)
    Returns the longest cleaned text.
    """
    try:
        img = Image.open(BytesIO(raw))

        # 1) auto-rotate using EXIF (phones often store rotation in metadata)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # 2) convert to RGB then scale up to ~300dpi-equivalent
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        w, h = img.size
        scale = 300 / 96.0  # common web images ~96dpi → scale up to ~300dpi
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # 3) enhance
        img = ImageEnhance.Contrast(img).enhance(1.8)
        img = ImageEnhance.Brightness(img).enhance(1.05)
        img = ImageEnhance.Sharpness(img).enhance(1.2)

        gray = img.convert("L")

        def binarize(im, th):
            return im.point(lambda x: 0 if x < th else 255, "1")

        variants = [
            gray,                         # base gray
            binarize(gray, 150),
            binarize(gray, 130),
            ImageOps.invert(gray),        # inverted gray
            binarize(ImageOps.invert(gray), 150),
        ]

        langs = os.getenv("TESSERACT_LANG", "eng")  # e.g. "eng+urd"
        configs = [
            "--oem 1 --psm 6",
            "--oem 1 --psm 11",
            "--oem 1 --psm 4",
        ]

        best = ""
        for v in variants:
            for cfg in configs:
                try:
                    txt = pytesseract.image_to_string(v, lang=langs, config=cfg) or ""
                    txt = re.sub(r"[^\S\r\n]+", " ", txt).strip()
                    # keep the longest alnum result
                    if len(re.sub(r"\W", "", txt)) > len(re.sub(r"\W", "", best)):
                        best = txt
                except Exception as e:
                    print("[OCR] config failed:", cfg, e)

        return best
    except Exception as e:
        print("[OCR] fatal:", e)
        return ""
    
# =========================
# AI Calls
# =========================
def call_ai_generate(topic=None, pdf_text=None, n_questions=5, format_type="mcq", retries=2):
    # Build prompt
    if format_type == "mixed":
        mcq_count = max(1, round(n_questions * 0.7))
        short_count = n_questions - mcq_count
        prompt_text = f"""
Generate exactly {n_questions} questions from the given content.

Create a MIXED set containing exactly {mcq_count} MCQs and exactly {short_count} short-answer questions.
No true/false.

Rules:
- Every question must include "correct_answer".
- MCQ: 4 options (A–D) and "correct_answer" must equal one option.
- Short: provide a concise "correct_answer".
Return ONLY valid JSON:
{{
  "questions": [
    {{ "type": "mcq", "text": "Q...", "options": ["A","B","C","D"], "correct_answer": "A" }}{","}
    {{ "type": "short", "text": "Q...", "correct_answer": "..." }}
  ]
}}
""".strip()
        if pdf_text: prompt_text += f"\nTEXT:\n{pdf_text}"
        elif topic:  prompt_text += f"\nTOPIC:\n{topic}"
    else:
        prompt_text = f"""
Generate exactly {n_questions} {format_type.upper()} questions from the content below.
Every question must include "correct_answer".
MCQ: 4 options (A–D) and correct_answer must be one of them.
Short: include a concise "correct_answer".
Return ONLY valid JSON in this structure:
{{ "questions": [ {{ "type": "{format_type}", "text": "Q...", "options": ["A","B","C","D"], "correct_answer": "..." }} ] }}
Content:
{pdf_text or topic}
""".strip()

    headers = {"Content-Type": "application/json", "x-goog-api-key": AI_API_KEY}
    payload = {"model": "models/gemini-2.5-flash", "contents": [{"parts": [{"text": prompt_text}]}]}

    for _ in range(retries + 1):
        resp = requests.post(AI_API_URL, headers=headers, json=payload, timeout=120)
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"AI API Error: {resp.text}")

        ai_json = resp.json()
        raw_text = ai_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not raw_text:
            continue

        cleaned = re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", raw_text).strip()
        m = re.search(r'(\[.*\]|\{.*\})', cleaned, flags=re.DOTALL)
        if not m:
            continue

        try:
            data = json.loads(m.group(1))
            questions = data.get("questions", []) if isinstance(data, dict) else data
            if not isinstance(questions, list):
                continue

            # normalize types
            for q in questions:
                q["type"] = normalize_q_type(q.get("type"))

            if format_type == "mixed":
                types = {q["type"] for q in questions}
                if not ("mcq" in types and "short" in types):
                    continue

            return questions[:n_questions]
        except json.JSONDecodeError:
            continue

    raise HTTPException(status_code=500, detail="AI could not generate enough valid questions.")

# ===================== AI short-answer scoring (strict, deterministic) =====================
async def call_ai_evaluate(question_text: str, student_answer: str, max_marks: int = 3) -> dict:
    """
    Evaluates a student's short-answer using the question as context (no reference answer needed).
    Deterministic-ish via low temperature / top-k.
    """
    question_text = (question_text or "").strip().lower()
    student_answer = (student_answer or "").strip().lower()

    prompt = (
        f"You are a strict examiner grading a student's short-answer response.\n\n"
        f"Question: {question_text}\n"
        f"Student Answer: {student_answer}\n\n"
        f"Rules:\n"
        f"- Read the question carefully and check if the student's answer correctly responds to it.\n"
        f"- Evaluate only the factual and conceptual correctness of the answer.\n"
        f"- Give 0 if the answer is irrelevant or wrong.\n"
        f"- Give {max_marks // 2} if the answer is partially correct but incomplete.\n"
        f"- Give {max_marks} if the answer is fully correct and relevant.\n"
        f"- Be deterministic: identical question and answer pairs must produce the same score every time.\n"
        f"- Return only a JSON object with the integer score. No explanation, no extra text.\n\n"
        f"Return format:\n"
        f'{{"score": <integer>}}\n'
        f'Example: {{"score": 1}}'
    )

    payload = {
        "model": "models/gemini-2.5-flash",
        "generationConfig": {"temperature": 0.0, "top_p": 0.1, "top_k": 1},
        "contents": [{"parts": [{"text": prompt}]}],
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": AI_API_KEY.strip()}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(AI_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        ai_json = resp.json()

    text_output = ""
    cand = (ai_json.get("candidates") or [{}])[0]
    parts = (cand.get("content") or {}).get("parts") or []
    if parts and "text" in parts[0]:
        text_output = (parts[0]["text"] or "").strip()

    # Debug
    print("\n--- Gemini Raw Output ---")
    print(text_output)
    print("--------------------------\n")

    try:
        cleaned = text_output.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        score = int(data.get("score", 0))
    except Exception as e:
        print("[Debug] JSON parsing error:", e)
        score = 0

    score = max(0, min(int(score), int(max_marks)))
    return {"score": score}

# =========================
# Exceptions
# =========================
@app.exception_handler(RuntimeError)
async def runtime_exception_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# =========================
# Auth
# =========================
async def get_current_user(request: Request) -> AuthedUser:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth.split(" ", 1)[1]

    url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}", "apikey": SUPABASE_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, headers=headers)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        data = r.json()

    role = None
    try:
        pr = supabase.table("profiles").select("role").eq("user_id", data["id"]).limit(1).execute()
        if pr.data:
            role = pr.data[0].get("role")
    except Exception:
        pass

    return AuthedUser(user_id=data["id"], email=data.get("email"), role=role)

def require_teacher(user: AuthedUser = Depends(get_current_user)) -> AuthedUser:
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user

@app.get("/me")
async def me(user: AuthedUser = Depends(get_current_user)):
    return {"user_id": user.user_id, "email": user.email, "role": user.role}

# =========================
# Profiles
# =========================
@app.post("/profiles/ensure_teacher")
def ensure_teacher(body: EnsureTeacher = None, user: AuthedUser = Depends(get_current_user)):
    try:
        rows = (
            supabase.table("profiles")
            .select("user_id")
            .eq("user_id", user.user_id)
            .limit(1)
            .execute()
            .data
        )
        if rows:
            supabase.table("profiles").update({"role": "teacher"}).eq("user_id", user.user_id).execute()
        else:
            payload = {
                "user_id": user.user_id,
                "role": "teacher",
                "created_at": now_iso(),
            }
            if body and body.full_name:
                payload["full_name"] = body.full_name
            supabase.table("profiles").insert(payload).execute()
        return {"ok": True}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ensure_teacher failed: {e}")

@app.get("/profiles/me")
def profiles_me(user: AuthedUser = Depends(get_current_user)):
    r = supabase.table("profiles").select("*").eq("user_id", user.user_id).limit(1).execute()
    return {"row": (r.data[0] if r.data else None)}

# =========================
# Class & Join/Verify
# =========================
def _norm_email(e: str) -> str:
    return (e or "").strip().lower()
def _norm_seat(s: str) -> str:
    return (s or "").strip().upper()
def _valid_email_basic(e: str) -> bool:
    return "@" in e and "." in e.split("@")[-1]

@app.get("/classes/{class_id}/meta")
def class_meta(class_id: int):
    r = (
        supabase.table("classes")
        .select("course_name, course_code, department, semester, section, class_id")
        .eq("class_id", class_id)
        .limit(1)
        .execute()
    )
    rows = r.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Class not found")
    row = rows[0]
    return {
        "class_id": class_id,
        "course_name": row["course_name"],
        "course_code": row["course_code"],
        "department": row.get("department"),
        "semester": row.get("semester"),
        "section": row.get("section"),
    }

@app.post("/public/join/{class_id}", status_code=201)
def public_join_class(class_id: int, body: Dict[str, Any]):
    full_name = str(body.get("name") or "").strip()
    seat_no   = _norm_seat(body.get("seat") or "")
    email     = _norm_email(body.get("email") or "")

    if not full_name or not seat_no or not email:
        raise HTTPException(status_code=400, detail="All fields are required")
    if not _valid_email_basic(email):
        raise HTTPException(status_code=422, detail="Invalid email")

    exists = (
        supabase.table("classes").select("class_id")
        .eq("class_id", class_id).limit(1).execute().data
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Class not found")

    already = (
        supabase.table("class_students").select("student_id")
        .eq("class_id", class_id)
        .or_(f"seat_no.eq.{seat_no},email.ilike.{email}")
        .limit(1).execute().data
    )
    if already:
        return {"ok": True, "status": "approved", "enrolled": True}

    existing = (
        supabase.table("join_intake")
        .select("intake_id,status")
        .eq("class_id", class_id)
        .or_(f"seat_no.eq.{seat_no},email.ilike.{email}")
        .order("submitted_at", desc=True)
        .limit(1).execute().data
    )

    if existing:
        intake_id = existing[0]["intake_id"]
        if existing[0]["status"] != "approved":
            supabase.table("join_intake").update({
                "status": "approved",
                "full_name": full_name,
                "seat_no": seat_no,
                "email": email,
            }).eq("intake_id", intake_id).execute()
    else:
        intake_row = supabase.table("join_intake").insert({
            "class_id": class_id,
            "full_name": full_name,
            "seat_no": seat_no,
            "email": email,
            "status": "approved",
        }).execute().data[0]
        intake_id = intake_row["intake_id"]

    try:
        supabase.table("class_students").insert({
            "class_id": class_id,
            "full_name": full_name,
            "seat_no": seat_no,
            "email": email,
            "enrolled_at": now_iso(),
        }).execute()
    except Exception:
        pass

    return {"ok": True, "intake_id": intake_id, "status": "approved", "enrolled": True}

@app.get("/classes/{class_id}/verify_student")
def verify_student(class_id: int,
                   seat_no: str | None = Query(None),
                   email: str | None = Query(None)):
    if not seat_no and not email:
        raise HTTPException(status_code=400, detail="Provide seat_no or email")

    seat = _norm_seat(seat_no or "")
    mail = _norm_email(email or "")

    if (seat and supabase.table("class_students").select("class_id").eq("class_id", class_id).eq("seat_no", seat).execute().data) and (mail and supabase.table("class_students").select("class_id").eq("class_id", class_id).ilike("email", mail).execute().data):
        return {"ok": True, "source": "class_students"}

    ji = supabase.table("join_intake").select("status").eq("class_id", class_id)
    if seat: ji = ji.eq("seat_no", seat)
    if mail: ji = ji.ilike("email", mail)
    rows = ji.execute().data or []
    if any(x["status"] in ("approved","enrolled") for x in rows):
        return {"ok": True, "source": "join_intake"}

    raise HTTPException(status_code=404, detail="Not found in this class")

# =========================
# Records & Results (views)
# =========================
@app.get("/classes/{class_id}/records")
def class_records(class_id: int):
    sr = (supabase.table("class_students")
          .select("full_name, seat_no, email, enrolled_at")
          .eq("class_id", class_id)
          .order("enrolled_at", desc=True)
          .execute())
    studs = sr.data or []

    quizzes_rows, qids = _quiz_ids_for_class(class_id)
    by_qid = {q["quiz_id"]: q for q in quizzes_rows}

    results = []
    if qids:
        results = (supabase.table("results")
                   .select("quiz_id, score, submitted_at, seat_no")
                   .eq("class_id", class_id)
                   .in_("quiz_id", qids)
                   .execute().data or [])
    by_seat = {}
    for r in results:
        by_seat.setdefault((r.get("seat_no") or "").upper(), []).append(r)

    fe, avgs = [], []
    for s in studs:
        seat = (s.get("seat_no") or "").upper()
        rlist = by_seat.get(seat, [])
        avg = _pct(sum(_pct(r["score"]) or 0 for r in rlist) / len(rlist)) if rlist else None
        if avg is not None: avgs.append(avg)

        last = None
        if rlist:
            last_row = sorted(rlist, key=lambda x: x.get("submitted_at") or "", reverse=True)[0]
            qm = by_qid.get(last_row["quiz_id"], {})
            last = {
                "quiz": qm.get("title") or f"Quiz {qm.get('quiz_id')}",
                "score": _pct(last_row.get("score")),
                "total": 100,
                "date": last_row.get("submitted_at"),
            }

        fe.append({
            "id": seat,
            "name": s.get("full_name") or "Student",
            "seat": seat,
            "email": s.get("email"),
            "average": avg,
            "last": last,
        })

    avg_class = _pct(sum(avgs)/len(avgs)) if avgs else None
    top = None
    if avgs:
        st = sorted([x for x in fe if x["average"] is not None], key=lambda x: x["average"], reverse=True)
        if st:
            top = {"id": st[0]["id"], "name": st[0]["name"], "seat": st[0]["seat"], "avg": st[0]["average"]}

    return {
        "quizzesConducted": len(qids),
        "avgClassScore": avg_class,
        "topPerformer": top,
        "students": fe,
    }

@app.get("/classes/{class_id}/student/{seat_no}/results")
def student_results_by_seat(class_id: int, seat_no: str):
    seat = (seat_no or "").upper()
    quizzes_rows, qids = _quiz_ids_for_class(class_id)
    if not qids: return {"quizzes": []}
    by_id = {q["quiz_id"]: q for q in quizzes_rows}

    rs = (supabase.table("results")
          .select("quiz_id, score, submitted_at")
          .eq("class_id", class_id)
          .eq("seat_no", seat)
          .in_("quiz_id", qids)
          .order("submitted_at", desc=True)
          .execute().data or [])

    out = []
    for r in rs:
        qm = by_id.get(r["quiz_id"], {})
        out.append({
            "id": r["quiz_id"],
            "title": qm.get("title") or f"Quiz {r['quiz_id']}",
            "date": r.get("submitted_at"),
            "score": _pct(r.get("score")),
            "total": 100,
        })
    return {"quizzes": out}

# =========================
# Quizzes: list/get/create/delete
# =========================
def _normalize_question(raw, i=0):
    qtype = (raw.get("type") or "short").lower()
    prompt = str(raw.get("prompt") or raw.get("q") or "").strip() or f"Question {i+1}"
    out = {
        "question_text": prompt,
        "question_type": "mcq" if qtype == "mcq" else "short_answer",
        "correct_answer": raw.get("answer") if qtype != "mcq" else None,
        "answer_index": raw.get("answerIndex") if qtype == "mcq" else None,
        "choices": raw.get("choices") or raw.get("options") or None,
    }
    return out

def _insert_question_with_options(quiz_id: int, q: Dict[str, Any]) -> int:
    q_row = {
        "quiz_id": quiz_id,
        "question_text": q["question_text"],
        "question_type": q["question_type"],
        "correct_answer": q.get("correct_answer")
    }
    r = supabase.table("questions").insert(q_row).execute()
    question_id = r.data[0]["question_id"]

    choices = q.get("choices") or []
    if isinstance(choices, list) and choices:
        opt_rows = []
        correct_idx = q.get("answer_index")
        for idx, text in enumerate(choices):
            opt_rows.append({
                "question_id": question_id,
                "option_text": str(text),
                "is_correct": (idx == correct_idx)
            })
        supabase.table("question_options").insert(opt_rows).execute()

    return question_id

@app.get("/quizzes")
def list_quizzes(class_id: Optional[int] = None, with_counts: bool = True):
    q = supabase.table("quizzes").select("*").order("created_at", desc=True)
    if class_id is not None:
        q = q.eq("class_id", class_id)
    r = q.execute()
    rows = r.data or []
    if not with_counts or not rows:
        return {"rows": rows}

    ids = [row["quiz_id"] for row in rows]
    q_rows = supabase.table("questions").select("quiz_id").in_("quiz_id", ids).execute().data or []
    q_count = Counter([x["quiz_id"] for x in q_rows])

    r_rows = supabase.table("results").select("quiz_id").in_("quiz_id", ids).execute().data or []
    r_count = Counter([x["quiz_id"] for x in r_rows])

    out = []
    for row in rows:
        qid = row["quiz_id"]
        row["question_count"] = int(q_count.get(qid, 0))
        row["result_count"]   = int(r_count.get(qid, 0))
        out.append(row)
    return {"rows": out}

@app.post("/quizzes")
def create_quiz(payload: Dict[str, Any]):
    try:
        class_id = int(payload.get("class_id"))
        title = (payload.get("title") or "Untitled Quiz").strip()[:120]
        qtype = (payload.get("type") or "mixed").lower()
        duration = int(payload.get("duration_min") or 20)

        r = supabase.table("quizzes").insert({
            "class_id": class_id,
            "title": title,
            "type": qtype,
            "duration_min": duration,
            "created_at": now_iso(),
        }).execute()
        quiz_id = r.data[0]["quiz_id"]

        for i, raw in enumerate(payload.get("questions") or []):
            qnorm = _normalize_question(raw, i)
            _insert_question_with_options(quiz_id, qnorm)

        return {"quiz_id": quiz_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Create failed: {e}")

@app.get("/quizzes/{quiz_id}/full")
def get_quiz_full(quiz_id: int):
    qr = supabase.table("quizzes").select("*").eq("quiz_id", quiz_id).limit(1).execute()
    rows = qr.data
    if not rows:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = rows[0]

    qs = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("question_id").execute().data
    qids = [q["question_id"] for q in qs] or [-1]
    opts = supabase.table("question_options").select("*").in_("question_id", qids).execute().data

    by_q = {}
    for o in opts:
        by_q.setdefault(o["question_id"], []).append(o)

    questions = []
    for q in qs:
        if q["question_type"] == "mcq":
            choices = [o["option_text"] for o in by_q.get(q["question_id"], [])]
            correct_idx = -1
            for i, o in enumerate(by_q.get(q["question_id"], [])):
                if o["is_correct"]:
                    correct_idx = i
                    break
            questions.append({
                "type": "mcq",
                "prompt": q["question_text"],
                "choices": choices,
                "answerIndex": correct_idx
            })
        else:
            questions.append({
                "type": "short",
                "prompt": q["question_text"],
                "answer": q.get("correct_answer")
            })

    return {"quiz": {
        "id": quiz_id,
        "classId": quiz.get("class_id"),
        "title": quiz.get("title"),
        "meta": {"type": quiz.get("type"), "durationMin": quiz.get("duration_min")},
        "createdAt": quiz.get("created_at"),
        "questions": questions
    }}

@app.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int):
    try:
        qs = supabase.table("questions").select("question_id").eq("quiz_id", quiz_id).execute().data
        qids = [q["question_id"] for q in qs] or [-1]
        supabase.table("question_options").delete().in_("question_id", qids).execute()
        supabase.table("questions").delete().eq("quiz_id", quiz_id).execute()
        supabase.table("quizzes").delete().eq("quiz_id", quiz_id).execute()
        return JSONResponse(status_code=204, content={})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

# =========================
# Results (raw submit used by some flows)
# =========================
@app.post("/results")
def submit_result(payload: Dict[str, Any]):
    try:
        data = {
            "quiz_id": int(payload.get("quiz_id")),
            "class_id": int(payload.get("class_id")) if payload.get("class_id") is not None else None,
            "seat_no": (payload.get("seat_no") or None),
            "email": (payload.get("email") or None),
            "score": payload.get("score"),
            "answers_json": payload.get("answers_json"),
            "submitted_at": now_iso(),
        }
        r = supabase.table("results").insert(data).execute()
        return {"inserted": r.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Submit failed: {e}")

# ===================== Submit quiz (MCQ via option_id, short via AI) =====================
class CheckQuizRequest(BaseModel):
    quiz_id: str
    seat_no: str
    class_id: int
    email: str
    answers: List[SubmitAnswer]

@app.post("/submit_quiz", status_code=200)
async def submit_quiz(req: CheckQuizRequest):
    detailed_results = []
    total_score = 0

    for ans in req.answers:
        r = supabase.table("questions")\
            .select("question_type, question_text, correct_answer")\
            .eq("question_id", ans.question_id).limit(1).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail=f"Question ID {ans.question_id} not found")

        row = r.data[0]
        qtype = (row.get("question_type") or "MCQ").upper()

        if qtype == "MCQ":
            try:
                option_id = int(ans.answer) if ans.answer is not None else -1
            except ValueError:
                score = 0
            else:
                o = supabase.table("question_options").select("is_correct")\
                    .eq("option_id", option_id).limit(1).execute()
                score = 1 if (o.data and o.data[0]["is_correct"]) else 0
        else:
            qtext = row.get("question_text", "")
            ai = await call_ai_evaluate(qtext, ans.answer or "", max_marks=3)
            score = int(ai.get("score", 0))

        total_score += score
        detailed_results.append({
            "question_id": ans.question_id,
            "submitted_answer": ans.answer,
            "score": score
        })

    supabase.table("results").insert({
        "quiz_id": req.quiz_id,
        "seat_no": req.seat_no,
        "class_id": req.class_id,
        "email": req.email,
        "score": total_score,
        "answers_json": json.dumps(detailed_results),
        "submitted_at": now_iso()
    }).execute()

    return {
        "quiz_id": req.quiz_id,
        "seat_no": req.seat_no,
        "class_id": req.class_id,
        "email": req.email,
        "score": total_score,
        "details": detailed_results
    }

# =========================
# Generator (topic/pdf/image) with hardened OCR & preview flag
# =========================
# @app.post("/generate_quiz", status_code=201)
# async def generate_quiz(
#     request: Request,
#     class_id: int = Query(...),
#     topic: str = Form(None),
#     n_questions: int = Form(...),
#     format: str = Form(...),  # "mcq" | "short" | "mixed"
#     pdf: UploadFile = File(None),
#     image: UploadFile = File(None),
#     preview: Optional[int] = Form(None)  # may come via form OR query param
# ):
#     try:
#         _setup_tesseract_cmd()

#         preview_q = request.query_params.get("preview")
#         preview_flag = (
#             (str(preview).strip() == "1") if preview is not None
#             else (str(preview_q or "0").strip() == "1")
#         )

#         content_text = ""

#         if pdf is not None:
#             contents = await pdf.read()
#             with pdfplumber.open(BytesIO(contents)) as pdf_file:
#                 for page in pdf_file.pages:
#                     t = page.extract_text()
#                     if t:
#                         content_text += t + "\n"

#             if not content_text.strip():
#                 images = convert_from_bytes(contents)  # requires poppler
#                 for pil_img in images:
#                     buf = BytesIO()
#                     pil_img.save(buf, format="PNG")
#                     txt = _ocr_image_bytes(buf.getvalue())
#                     if txt:
#                         content_text += txt + "\n"

#         elif image is not None:
#             raw = await image.read()
#             content_text = _ocr_image_bytes(raw)

#         if (not content_text or not content_text.strip()) and (topic and topic.strip()):
#             content_text = topic.strip()

#         # cleaned = re.sub(r"\s+", " ", (content_text or "")).strip()
#         # if len(re.findall(r"[A-Za-z0-9]", cleaned)) < 20:
#         #     raise HTTPException(
#         #         status_code=422,
#         #         detail="No readable text found. Use text PDFs, printed-text images, or type a topic."
#         #     )
        
#         cleaned = re.sub(r"\s+", " ", (content_text or "")).strip()
#         alnum_len = len(re.findall(r"[A-Za-z0-9]", cleaned))

#         # If this came from an IMAGE, allow short text (OCR often returns little but enough).
#         if image is not None:
#             if alnum_len == 0 and not (topic and topic.strip()):
#             # truly nothing and no topic fallback
#                 raise HTTPException(
#                     status_code=422,
#                     detail="No readable text detected in the image. Try a clearer image or provide a topic."
#                 )
#             # else: proceed even if short
#         else:
#             # PDF/topic path keeps the stronger guard
#             if alnum_len < 20:
#                 raise HTTPException(
#                     status_code=422,
#                     detail="No readable text found. Use text PDFs, printed-text images, or type a topic."
#                 )

#         # Generate questions
#         CHUNK_SIZE = 800
#         if (pdf or image) and len(cleaned) > CHUNK_SIZE:
#             questions = []
#             chunks = [cleaned[i:i+CHUNK_SIZE] for i in range(0, len(cleaned), CHUNK_SIZE)]
#             remaining = int(n_questions)
#             for chunk in chunks:
#                 if remaining <= 0:
#                     break
#                 qs = call_ai_generate(pdf_text=chunk, n_questions=remaining, format_type=format)
#                 questions.extend(qs)
#                 remaining = int(n_questions) - len(questions)
#             questions = questions[: int(n_questions)]
#         else:
#             questions = call_ai_generate(pdf_text=cleaned, n_questions=int(n_questions), format_type=format)

#         if preview_flag:
#             return {
#                 "title": (topic or ("PDF" if pdf else "Image") or "Generated Quiz"),
#                 "questions": questions
#             }

#         # Persist path
#         title = (topic or ("PDF/Image Quiz"))
#         existing = supabase.table("quizzes").select("*").eq("title", title).eq("class_id", class_id).execute()
#         if existing.data:
#             raise HTTPException(status_code=400, detail="Quiz with this title already exists for the class")

#         quiz_payload = {
#             "class_id": class_id,
#             "title": title,
#             "type": format,
#             "duration_min": 10,
#             "created_at": now_iso()
#         }
#         r = supabase.table("quizzes").insert(quiz_payload).execute()
#         quiz_id = r.data[0]["quiz_id"]

#         type_mapping = {"short": "short_answer", "mcq": "mcq", "true_false": "true_false"}
#         for q in questions:
#             q_type_token = normalize_q_type(q.get("type"))
#             q_type = type_mapping.get(q_type_token, "short_answer")
#             if format == "short":
#                 q_type = "short_answer"

#             q_row = {
#                 "quiz_id": quiz_id,
#                 "question_text": q.get("text") or q.get("prompt") or "",
#                 "question_type": q_type,
#                 "correct_answer": q.get("correct_answer", None)
#             }
#             ir = supabase.table("questions").insert(q_row).execute()
#             qid = ir.data[0]["question_id"]

#             opts = q.get("options") or q.get("choices") or []
#             if opts and q_type == "mcq":
#                 correct = str(q.get("correct_answer", "")).strip().lower()
#                 rows = []
#                 for i, o in enumerate(opts):
#                     txt = str(o.get("text", "")).strip() if isinstance(o, dict) else str(o).strip()
#                     rows.append({
#                         "question_id": qid,
#                         "option_text": txt,
#                         "is_correct": (txt.lower() == correct)
#                     })
#                 supabase.table("question_options").insert(rows).execute()

#         return {"status": "success", "quiz_id": quiz_id}

#     except HTTPException:
#         raise
#     except Exception as e:
#         # Make tesseract/poppler issues explicit
#         msg = str(e).lower()
#         if "tesseract is not installed" in msg:
#             raise HTTPException(status_code=500, detail="Tesseract not found. Set TESSERACT_CMD or add to PATH.")
#         if "poppler" in msg or "convert_from_bytes" in msg:
#             raise HTTPException(status_code=500, detail="Poppler is required for PDF OCR. Install it and retry.")
#         raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_quiz", status_code=201)
async def generate_quiz(
    request: Request,
    class_id: int = Query(...),
    topic: str = Form(None),
    n_questions: int = Form(...),
    format: str = Form(...),  # "mcq" | "short" | "mixed"
    pdf: UploadFile = File(None),
    image: UploadFile = File(None),
    preview: Optional[int] = Form(None)
):
    try:
        _setup_tesseract_cmd()

        preview_q = request.query_params.get("preview")
        preview_flag = (
            (str(preview).strip() == "1") if preview is not None
            else (str(preview_q or "0").strip() == "1")
        )

        content_text = ""

        # ----------- Source selection -----------
        if pdf is not None:
            contents = await pdf.read()
            # 1) extract native text
            with pdfplumber.open(BytesIO(contents)) as pdf_file:
                for page in pdf_file.pages:
                    t = page.extract_text()
                    if t:
                        content_text += t + "\n"
            # 2) OCR fallback when native text missing
            if not content_text.strip():
                images = convert_from_bytes(contents, dpi=300)  # needs poppler for PDFs
                for pil_img in images:
                    buf = BytesIO()
                    pil_img.save(buf, format="PNG")
                    txt = _ocr_image_bytes(buf.getvalue())
                    if txt:
                        content_text += txt + "\n"

        elif image is not None:
            raw = await image.read()
            content_text = _ocr_image_bytes(raw)

        # ----------- Fallbacks -----------
        # If nothing from file/image, use provided topic if any.
        if (not content_text or not content_text.strip()) and (topic and topic.strip()):
            content_text = topic.strip()

        # If still nothing AND this was an IMAGE request, do NOT block:
        # fall back to a safe, generic seed so the AI can still generate.
        if (not content_text or not content_text.strip()) and (image is not None):
            content_text = "General knowledge basics"

        # If still nothing AND this was a PDF request, keep a minimal sanity gate
        if (not content_text or not content_text.strip()) and (pdf is not None):
            raise HTTPException(
                status_code=422,
                detail="No readable text found in the PDF. Try a text-based PDF or provide a topic."
            )

        # ----------- Clean text -----------
        cleaned = re.sub(r"\s+", " ", (content_text or "")).strip()

        # Keep a *soft* check only for PDFs (images are allowed even if small)
        if pdf is not None:
            if len(re.findall(r"[A-Za-z0-9]", cleaned)) < 10 and not (topic and topic.strip()):
                raise HTTPException(
                    status_code=422,
                    detail="No readable text found in the PDF. Try a text-based PDF or provide a topic."
                )

        # ----------- Generate questions -----------
        CHUNK_SIZE = 800
        if (pdf or image) and len(cleaned) > CHUNK_SIZE:
            questions = []
            chunks = [cleaned[i:i+CHUNK_SIZE] for i in range(0, len(cleaned), CHUNK_SIZE)]
            remaining = int(n_questions)
            for chunk in chunks:
                if remaining <= 0:
                    break
                qs = call_ai_generate(pdf_text=chunk, n_questions=remaining, format_type=format)
                questions.extend(qs)
                remaining = int(n_questions) - len(questions)
            questions = questions[: int(n_questions)]
        else:
            questions = call_ai_generate(pdf_text=cleaned, n_questions=int(n_questions), format_type=format)

        # ----------- Preview mode -----------
        # if preview_flag:
        #     return {
        #         "title": (topic or ("PDF" if pdf else "Image") or "Generated Quiz"),
        #         "questions": questions
        #     }
            
        debug_flag = (request.query_params.get("debug") == "1") or (str(request.headers.get("x-debug", "0")) == "1")

        if preview_flag:
            resp = {
                "title": (topic or ("PDF" if pdf else "Image") or "Generated Quiz"),
                "questions": questions
        }
        if debug_flag:
        # show first 300 chars of OCR/cleaned input so you can verify
            resp["_debug_ocr_preview"] = (cleaned or "")[:300]
        return resp    

        # ----------- Persist -----------
        title = (topic or ("PDF/Image Quiz"))
        existing = supabase.table("quizzes").select("*").eq("title", title).eq("class_id", class_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Quiz with this title already exists for the class")

        quiz_payload = {
            "class_id": class_id,
            "title": title,
            "type": format,
            "duration_min": 10,
            "created_at": now_iso()
        }
        r = supabase.table("quizzes").insert(quiz_payload).execute()
        quiz_id = r.data[0]["quiz_id"]

        type_mapping = {"short": "short_answer", "mcq": "mcq", "true_false": "true_false"}
        for q in questions:
            q_type_token = normalize_q_type(q.get("type"))
            q_type = type_mapping.get(q_type_token, "short_answer")
            if format == "short":
                q_type = "short_answer"

            q_row = {
                "quiz_id": quiz_id,
                "question_text": q.get("text") or q.get("prompt") or "",
                "question_type": q_type,
                "correct_answer": q.get("correct_answer", None)
            }
            ir = supabase.table("questions").insert(q_row).execute()
            qid = ir.data[0]["question_id"]

            opts = q.get("options") or q.get("choices") or []
            if opts and q_type == "mcq":
                correct = str(q.get("correct_answer", "")).strip().lower()
                rows = []
                for i, o in enumerate(opts):
                    txt = str(o.get("text", "")).strip() if isinstance(o, dict) else str(o).strip()
                    rows.append({
                        "question_id": qid,
                        "option_text": txt,
                        "is_correct": (txt.lower() == correct)
                    })
                supabase.table("question_options").insert(rows).execute()

        return {"status": "success", "quiz_id": quiz_id}

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e).lower()
        if "tesseract is not installed" in msg:
            raise HTTPException(status_code=500, detail="Tesseract not found. Set TESSERACT_CMD or add to PATH.")
        if "poppler" in msg or "convert_from_bytes" in msg:
            raise HTTPException(status_code=500, detail="Poppler is required for PDF OCR. Install it and retry.")
        raise HTTPException(status_code=500, detail=str(e))



# =========================
# Generic CRUD
# =========================
@app.post("/{table}/", status_code=201)
def create_record(table: str, record: GenericRecord):
    try:
        if table not in ALLOWED_TABLES:
            raise HTTPException(status_code=404, detail="Table not allowed")
        payload = record.data.copy()
        r = supabase.table(table).insert(payload).execute()
        return {"inserted": r.data}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/{table}/")
def list_records(table: str, limit: int = 100, offset: int = 0):
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail="Table not allowed")
    r = supabase.table(table).select("*").limit(limit).offset(offset).execute()
    return {"rows": r.data}

@app.get("/{table}/{id}")
def get_record(table: str, id: str):
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail="Table not allowed")
    r = supabase.table(table).select("*").eq("user_id" if table=="profiles" else "id", id).limit(1).execute()
    rows = r.data
    if not rows:
        raise HTTPException(status_code=404, detail="Not found")
    return rows[0]

@app.put("/{table}/{id}")
def update_record(table: str, id: str, record: GenericRecord):
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail="Table not allowed")
    payload = record.data.copy()
    payload["updated_at"] = now_iso()
    r = supabase.table(table).update(payload).eq("user_id" if table=="profiles" else "id", id).execute()
    return {"updated": r.data}

@app.delete("/{table}/{id}", status_code=204)
def delete_record(table: str, id: str):
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail="Table not allowed")

    if table in ("class_students", "results"):
        raise HTTPException(
            status_code=400,
            detail=f"Use the specific delete endpoint for '{table}' (composite key)"
        )

    id_column = {
        "profiles": "user_id",
        "classes": "class_id",
        "quizzes": "quiz_id",
        "questions": "question_id",
        "question_options": "option_id"
    }.get(table, "id")

    try:
        supabase.table(table).delete().eq(id_column, id).execute()
        return JSONResponse(status_code=204, content={})
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Counts & misc
# =========================
@app.get("/classes_with_counts")
def classes_with_counts():
    cr = (
        supabase.table("classes")
        .select("class_id, course_name, course_code, department, semester, section, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    classes = cr.data or []

    sr = supabase.table("class_students").select("class_id").execute()
    cnt = Counter([row["class_id"] for row in (sr.data or [])])

    out = [
        {
            "id": c["class_id"],
            "title": c.get("course_name") or "Class",
            "code": c.get("course_code") or "",
            "dept": (c.get("department") or "").upper(),
            "sem": c.get("semester"),
            "section": c.get("section"),
            "students": int(cnt.get(c["class_id"], 0)),
        }
        for c in classes
    ]
    return {"rows": out}

@app.get("/ping")
def ping():
    # Optional: uncomment to verify tesseract availability at runtime
    # try:
    #     print("Tesseract version:", pytesseract.get_tesseract_version())
    # except Exception as e:
    #     print("Tesseract check failed:", e)
    return {"ok": True}


