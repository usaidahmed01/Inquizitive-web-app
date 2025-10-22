# from fastapi.middleware.cors import CORSMiddleware
# from fastapi import FastAPI, HTTPException, Request, Depends, Query, UploadFile, File, Form
# from fastapi.responses import JSONResponse
# from pydantic import BaseModel, Field, conint, constr
# from typing import List, Optional, Dict, Any
# from collections import Counter
# from datetime import datetime
# from dotenv import load_dotenv

# import os
# import re
# import json
# import httpx
# import requests

# import pytesseract
# from pdf2image import convert_from_bytes
# from io import BytesIO
# import pdfplumber
# from PIL import Image, ImageOps, ImageEnhance

# from supabase import create_client, Client

# # =========================
# # Boot & Config
# # =========================
# load_dotenv()

# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# AI_API_URL   = os.getenv("AI_API_URL")
# AI_API_KEY   = os.getenv("AI_API_KEY")

# if not SUPABASE_URL or not SUPABASE_KEY:
#     raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in env")

# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# app = FastAPI(title="Inquizitive Backend (FastAPI)")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "http://127.0.0.1:3000",
#         # add your deployed frontend origin(s) here if needed
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["*"]
# )

# ALLOWED_TABLES = {"profiles", "quizzes", "classes", "questions", "question_options", "results"}  # students + class_students have dedicated flows

# def now_iso():
#     return datetime.utcnow().isoformat()

# # =========================
# # Models
# # =========================
# class GenerateQuizRequest(BaseModel):
#     topic: str
#     n_questions: int = Field(..., gt=0, le=100)
#     format: str = Field("mcq")

# class OptionCreate(BaseModel):
#     text: str
#     is_correct: bool = False

# class QuestionCreate(BaseModel):
#     text: str
#     type: str
#     options: Optional[List[OptionCreate]] = None

# class SubmitAnswer(BaseModel):
#     # question_id: str
#     question_id: int
#     answer: Optional[str] = None

# class GenericRecord(BaseModel):
#     data: Dict[str, Any]

# class AuthedUser(BaseModel):
#     user_id: str
#     email: Optional[str] = None

# class EnsureProfile(BaseModel):
#     full_name: Optional[str] = None

# class StudentPatch(BaseModel):
#     full_name: Optional[str] = None
#     seat_no:   Optional[str] = None
#     email:     Optional[str] = None

# # =========================
# # Utilities
# # =========================
# def _pct(v):
#     try:
#         return max(0, min(100, int(round(float(v)))))
#     except Exception:
#         return None

# def _quiz_ids_for_class(cid: int):
#     rs = (supabase.table("quizzes")
#           .select("quiz_id,title,created_at")
#           .eq("class_id", cid)
#           .order("created_at")
#           .execute().data or [])
#     return rs, [q["quiz_id"] for q in rs]

# def normalize_q_type(raw_type: Optional[str]) -> str:
#     if not raw_type:
#         return "short"
#     t = str(raw_type).strip().lower()
#     mapping = {
#         "mcq": "mcq", "multiple_choice": "mcq", "multiple choice": "mcq", "multiple-choice": "mcq", "choice": "mcq",
#         "short": "short", "short_answer": "short", "short answer": "short", "short-answer": "short",
#         "true_false": "true_false", "true/false": "true_false", "true false": "true_false", "tf": "true_false", "boolean": "true_false",
#     }
#     return mapping.get(t, "short")

# # Treat empty string like None (defensive updates)
# def _none_if_blank(v):
#     if v is None:
#         return None
#     if isinstance(v, str) and v.strip() == "":
#         return None
#     return v

# # --- OCR helpers ------------------------------------------------------------
# def _setup_tesseract_cmd():
#     cmd = os.getenv("TESSERACT_CMD")
#     if cmd:
#         pytesseract.pytesseract.tesseract_cmd = cmd
#         return

#     common = [
#         "/usr/bin/tesseract",
#         "/usr/local/bin/tesseract",
#         "/opt/homebrew/bin/tesseract",
#         r"C:\Program Files\Tesseract-OCR\tesseract.exe"
#     ]
#     for p in common:
#         if os.path.isfile(p):
#             pytesseract.pytesseract.tesseract_cmd = p
#             break

# def _ocr_image_bytes(raw: bytes) -> str:
#     try:
#         img = Image.open(BytesIO(raw))
#         try:
#             img = ImageOps.exif_transpose(img)
#         except Exception:
#             pass

#         if img.mode not in ("RGB", "L"):
#             img = img.convert("RGB")
#         w, h = img.size
#         scale = 300 / 96.0
#         img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

#         img = ImageEnhance.Contrast(img).enhance(1.8)
#         img = ImageEnhance.Brightness(img).enhance(1.05)
#         img = ImageEnhance.Sharpness(img).enhance(1.2)

#         gray = img.convert("L")
#         def binarize(im, th): return im.point(lambda x: 0 if x < th else 255, "1")
#         variants = [gray, binarize(gray, 150), binarize(gray, 130), ImageOps.invert(gray), binarize(ImageOps.invert(gray), 150)]

#         langs = os.getenv("TESSERACT_LANG", "eng")
#         configs = ["--oem 1 --psm 6", "--oem 1 --psm 11", "--oem 1 --psm 4"]

#         best = ""
#         for v in variants:
#             for cfg in configs:
#                 try:
#                     txt = pytesseract.image_to_string(v, lang=langs, config=cfg) or ""
#                     txt = re.sub(r"[^\S\r\n]+", " ", txt).strip()
#                     if len(re.sub(r"\W", "", txt)) > len(re.sub(r"\W", "", best)):
#                         best = txt
#                 except Exception as e:
#                     print("[OCR] config failed:", cfg, e)
#         return best
#     except Exception as e:
#         print("[OCR] fatal:", e)
#         return ""

# # =========================
# # AI Calls
# # =========================
# def call_ai_generate(topic=None, pdf_text=None, n_questions=5, format_type="mcq", retries=2):
#     if format_type == "mixed":
#         mcq_count = max(1, round(n_questions * 0.7))
#         short_count = n_questions - mcq_count
#         prompt_text = f"""
# Generate exactly {n_questions} questions from the given content.

# Create a MIXED set containing exactly {mcq_count} MCQs and exactly {short_count} short-answer questions.
# No true/false.

# Rules:
# - Every question must include "correct_answer".
# - MCQ: 4 options (A–D) and "correct_answer" must equal one option.
# - Short: provide a concise "correct_answer".
# Return ONLY valid JSON:
# {{
#   "questions": [
#     {{ "type": "mcq", "text": "Q...", "options": ["A","B","C","D"], "correct_answer": "A" }} ,
#     {{ "type": "short", "text": "Q...", "correct_answer": "..." }}
#   ]
# }}
# """.strip()
#         if pdf_text: prompt_text += f"\nTEXT:\n{pdf_text}"
#         elif topic:  prompt_text += f"\nTOPIC:\n{topic}"
#     else:
#         prompt_text = f"""
# Generate exactly {n_questions} {format_type.upper()} questions from the content below.
# Every question must include "correct_answer".
# MCQ: 4 options (A–D) and correct_answer must be one of them.
# Short: include a concise "correct_answer".
# Return ONLY valid JSON in this structure:
# {{ "questions": [ {{ "type": "{format_type}", "text": "Q...", "options": ["A","B","C","D"], "correct_answer": "..." }} ] }}
# Content:
# {pdf_text or topic}
# """.strip()

#     headers = {"Content-Type": "application/json", "x-goog-api-key": AI_API_KEY}
#     payload = {"model": "models/gemini-2.5-flash", "contents": [{"parts": [{"text": prompt_text}]}]}

#     for _ in range(retries + 1):
#         resp = requests.post(AI_API_URL, headers=headers, json=payload, timeout=120)
#         if resp.status_code != 200:
#             raise HTTPException(status_code=500, detail=f"AI API Error: {resp.text}")

#         ai_json = resp.json()
#         raw_text = ai_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
#         if not raw_text:
#             continue

#         cleaned = re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", raw_text).strip()
#         m = re.search(r'(\[.*\]|\{.*\})', cleaned, flags=re.DOTALL)
#         if not m:
#             continue

#         try:
#             data = json.loads(m.group(1))
#             questions = data.get("questions", []) if isinstance(data, dict) else data
#             if not isinstance(questions, list):
#                 continue
#             for q in questions:
#                 q["type"] = normalize_q_type(q.get("type"))
#             if format_type == "mixed":
#                 types = {q["type"] for q in questions}
#                 if not ("mcq" in types and "short" in types):
#                     continue
#             return questions[:n_questions]
#         except json.JSONDecodeError:
#             continue

#     raise HTTPException(status_code=500, detail="AI could not generate enough valid questions.")

# # ===================== AI short-answer scoring =====================
# async def call_ai_evaluate(question_text: str, student_answer: str, max_marks: int = 3) -> dict:
#     question_text = (question_text or "").strip().lower()
#     student_answer = (student_answer or "").strip().lower()

#     prompt = (
#         f"You are a strict examiner grading a student's short-answer response.\n\n"
#         f"Question: {question_text}\n"
#         f"Student Answer: {student_answer}\n\n"
#         f"Rules:\n"
#         f"- Read the question carefully and check if the student's answer correctly responds to it.\n"
#         f"- Evaluate only factual/conceptual correctness.\n"
#         f"- 0 = wrong/irrelevant, {max_marks//2} = partial, {max_marks} = fully correct.\n"
#         f"- Return only JSON like {{\"score\": <int>}}.\n"
#     )

#     payload = {
#         "model": "models/gemini-2.5-flash",
#         "generationConfig": {"temperature": 0.0, "top_p": 0.1, "top_k": 1},
#         "contents": [{"parts": [{"text": prompt}]}],
#     }
#     headers = {"Content-Type": "application/json", "x-goog-api-key": AI_API_KEY.strip()}

#     async with httpx.AsyncClient(timeout=30.0) as client:
#         resp = await client.post(AI_API_URL, json=payload, headers=headers)
#         resp.raise_for_status()
#         ai_json = resp.json()

#     text_output = ""
#     cand = (ai_json.get("candidates") or [{}])[0]
#     parts = (cand.get("content") or {}).get("parts") or []
#     if parts and "text" in parts[0]:
#         text_output = (parts[0]["text"] or "").strip()

#     try:
#         cleaned = text_output.replace("```json", "").replace("```", "").strip()
#         data = json.loads(cleaned)
#         score = int(data.get("score", 0))
#     except Exception:
#         score = 0

#     score = max(0, min(int(score), int(max_marks)))
#     return {"score": score}

# # =========================
# # Exceptions
# # =========================
# @app.exception_handler(RuntimeError)
# async def runtime_exception_handler(request: Request, exc: RuntimeError):
#     return JSONResponse(status_code=500, content={"detail": str(exc)})

# # =========================
# # Auth (teachers only; students are public)
# # =========================
# async def get_current_user(request: Request) -> AuthedUser:
#     auth = request.headers.get("Authorization", "")
#     if not auth.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Missing bearer token")
#     token = auth.split(" ", 1)[1]

#     url = f"{SUPABASE_URL}/auth/v1/user"
#     headers = {"Authorization": f"Bearer {token}", "apikey": SUPABASE_KEY}
#     async with httpx.AsyncClient(timeout=10) as client:
#         r = await client.get(url, headers=headers)
#         if r.status_code != 200:
#             raise HTTPException(status_code=401, detail="Invalid or expired token")
#         data = r.json()

#     return AuthedUser(user_id=data["id"], email=data.get("email"))

# @app.get("/me")
# async def me(user: AuthedUser = Depends(get_current_user)):
#     return {"user_id": user.user_id, "email": user.email}

# # =========================
# # Profiles (no role/seat_no anymore) + alias + /profiles/me
# # =========================
# def _ensure_profile_impl(body: Optional[EnsureProfile], user: AuthedUser):
#     rows = (
#         supabase.table("profiles")
#         .select("user_id")
#         .eq("user_id", user.user_id)
#         .limit(1)
#         .execute()
#         .data
#     )
#     if rows:
#         patch = {"created_at": now_iso()}  # touch
#         if body and body.full_name:
#             patch["full_name"] = body.full_name
#         supabase.table("profiles").update(patch).eq("user_id", user.user_id).execute()
#     else:
#         payload = {
#             "user_id": user.user_id,
#             "full_name": (body.full_name if body and body.full_name else user.email or "Teacher"),
#             "created_at": now_iso()
#         }
#         supabase.table("profiles").insert(payload).execute()
#     return {"ok": True}

# @app.post("/profiles/ensure_profile")
# def ensure_profile(body: EnsureProfile = None, user: AuthedUser = Depends(get_current_user)):
#     try:
#         return _ensure_profile_impl(body, user)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"ensure_profile failed: {e}")

# # Legacy alias to preserve your frontend
# @app.post("/profiles/ensure_teacher")
# def ensure_teacher_alias(body: EnsureProfile = None, user: AuthedUser = Depends(get_current_user)):
#     try:
#         return _ensure_profile_impl(body, user)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"ensure_teacher failed: {e}")

# # ✅ FRONTEND EXPECTS THIS
# @app.get("/profiles/me")
# def profiles_me(user: AuthedUser = Depends(get_current_user)):
#     r = (
#         supabase.table("profiles")
#         .select("*")
#         .eq("user_id", user.user_id)
#         .limit(1)
#         .execute()
#     )
#     return {"row": (r.data[0] if r.data else None)}

# # =========================
# # Class & Join/Verify
# # =========================
# def _norm_email(e: str) -> str:
#     return (e or "").strip().lower()

# def _norm_seat(s: str) -> str:
#     return (s or "").strip().upper()

# def _normalize_name(n: str) -> str:
#     return re.sub(r"\s+", " ", (n or "").strip()).lower()

# def _valid_email_basic(e: str) -> bool:
#     return "@" in e and "." in e.split("@")[-1]

# def _find_student_by_seat(seat_no: str):
#     seat = _norm_seat(seat_no)
#     r = (supabase.table("students")
#          .select("student_id, seat_no, full_name, email")
#          .ilike("seat_no", seat)
#          .limit(1).execute())
#     return r.data[0] if r.data else None

# def get_or_create_student(seat_no: str, full_name: Optional[str], email: Optional[str]) -> str:
#     seat = _norm_seat(seat_no)
#     if not seat:
#         raise HTTPException(status_code=400, detail="Missing seat_no")

#     r = (supabase.table("students")
#          .select("student_id")
#          .ilike("seat_no", seat)
#          .limit(1)
#          .execute())
#     if r.data:
#         return r.data[0]["student_id"]

#     try:
#         row = (supabase.table("students")
#                .insert({"seat_no": seat, "full_name": full_name, "email": email})
#                .execute().data[0])
#         return row["student_id"]
#     except Exception:
#         r2 = (supabase.table("students")
#               .select("student_id")
#               .ilike("seat_no", seat)
#               .limit(1).execute())
#         if r2.data:
#             return r2.data[0]["student_id"]
#         raise

# @app.get("/classes/{class_id}/meta")
# def class_meta(class_id: int):
#     r = (supabase.table("classes")
#          .select("course_name, course_code, department, semester, section, class_id")
#          .eq("class_id", class_id)
#          .limit(1)
#          .execute())
#     rows = r.data or []
#     if not rows:
#         raise HTTPException(status_code=404, detail="Class not found")
#     row = rows[0]
#     return {
#         "class_id": class_id,
#         "course_name": row["course_name"],
#         "course_code": row["course_code"],
#         "department": row.get("department"),
#         "semester": row.get("semester"),
#         "section": row.get("section"),
#     }

# @app.post("/public/join/{class_id}", status_code=201)
# def public_join_class(class_id: int, body: Dict[str, Any]):
#     """
#     Public enrollment: no auth. Enforce global seat_no ownership via students table,
#     and allow many-to-many via class_students (unique per (class_id, student_id)).
#     """
#     full_name = str(body.get("name") or "").strip()
#     seat_no   = _norm_seat(body.get("seat") or "")
#     email     = _norm_email(body.get("email") or "")

#     if not full_name or not seat_no or not email:
#         raise HTTPException(status_code=400, detail="All fields are required")
#     if not _valid_email_basic(email):
#         raise HTTPException(status_code=422, detail="Invalid email")

#     exists = (supabase.table("classes").select("class_id").eq("class_id", class_id).limit(1).execute().data)
#     if not exists:
#         raise HTTPException(status_code=404, detail="Class not found")

#     # 1) Enforce seat ownership
#     existing = _find_student_by_seat(seat_no)
#     if existing:
#         same_name  = _normalize_name(full_name) == _normalize_name(existing.get("full_name") or "")
#         same_email = email == _norm_email(existing.get("email") or "")
#         if not (same_name and same_email):
#             raise HTTPException(
#                 status_code=409,
#                 detail="This seat number already belongs to a different student. Please contact your instructor."
#             )
#         student_id = existing["student_id"]
#     else:
#         student_id = (supabase.table("students")
#                       .insert({"seat_no": seat_no, "full_name": full_name, "email": email})
#                       .execute().data[0]["student_id"])

#     # 2) prevent duplicate enrollment for the same class
#     already = (supabase.table("class_students")
#                .select("class_id")
#                .eq("class_id", class_id)
#                .eq("student_id", student_id)
#                .limit(1).execute().data)
#     if already:
#         return {"ok": True, "status": "approved", "enrolled": True}

#     # intake note (optional)
#     existing_req = (supabase.table("join_intake")
#                     .select("intake_id,status")
#                     .eq("class_id", class_id)
#                     .or_(f"seat_no.eq.{seat_no},email.ilike.{email}")
#                     .order("submitted_at", desc=True)
#                     .limit(1).execute().data)
#     if existing_req:
#         intake_id = existing_req[0]["intake_id"]
#         if existing_req[0]["status"] != "approved":
#             supabase.table("join_intake").update({
#                 "status": "approved",
#                 "full_name": full_name,
#                 "seat_no": seat_no,
#                 "email": email,
#             }).eq("intake_id", intake_id).execute()
#     else:
#         intake_row = supabase.table("join_intake").insert({
#             "class_id": class_id,
#             "full_name": full_name,
#             "seat_no": seat_no,
#             "email": email,
#             "status": "approved",
#         }).execute().data[0]
#         intake_id = intake_row["intake_id"]

#     # 3) enroll (denormalized columns for easy reads)
#     supabase.table("class_students").insert({
#         "class_id": class_id,
#         "student_id": student_id,
#         "full_name": full_name,
#         "seat_no": seat_no,
#         "email": email,
#         "enrolled_at": now_iso(),
#     }).execute()

#     return {"ok": True, "intake_id": intake_id, "status": "approved", "enrolled": True}

# @app.get("/classes/{class_id}/verify_student")
# def verify_student(class_id: int, seat_no: str | None = Query(None), email: str | None = Query(None)):
#     if not seat_no and not email:
#         raise HTTPException(status_code=400, detail="Provide seat_no or email")

#     seat = _norm_seat(seat_no or "")
#     mail = _norm_email(email or "")

#     if (seat and supabase.table("class_students").select("class_id").eq("class_id", class_id).eq("seat_no", seat).execute().data) and \
#        (mail and supabase.table("class_students").select("class_id").eq("class_id", class_id).ilike("email", mail).execute().data):
#         return {"ok": True, "source": "class_students"}

#     ji = supabase.table("join_intake").select("status").eq("class_id", class_id)
#     if seat: ji = ji.eq("seat_no", seat)
#     if mail: ji = ji.ilike("email", mail)
#     rows = ji.execute().data or []
#     if any(x["status"] in ("approved","enrolled") for x in rows):
#         return {"ok": True, "source": "join_intake"}

#     raise HTTPException(status_code=404, detail="Not found in this class")

# # =========================
# # Records & Results (views)
# # =========================
# @app.get("/classes/{class_id}/records")
# def class_records(class_id: int):
#     sr = (supabase.table("class_students")
#         .select("student_id, full_name, seat_no, email, enrolled_at")
#         .eq("class_id", class_id)
#         .order("enrolled_at", desc=True)
#         .execute())

#     studs = sr.data or []

#     quizzes_rows, qids = _quiz_ids_for_class(class_id)
#     by_qid = {q["quiz_id"]: q for q in quizzes_rows}

#     results = []
#     if qids:
#         results = (supabase.table("results")
#                    .select("quiz_id, score, submitted_at, seat_no")
#                    .eq("class_id", class_id)
#                    .in_("quiz_id", qids)
#                    .execute().data or [])
#     by_seat = {}
#     for r in results:
#         by_seat.setdefault((r.get("seat_no") or "").upper(), []).append(r)

#     fe, avgs = [], []
#     for s in studs:
#         seat = (s.get("seat_no") or "").upper()
#         rlist = by_seat.get(seat, [])
#         avg = _pct(sum(_pct(r["score"]) or 0 for r in rlist) / len(rlist)) if rlist else None
#         if avg is not None: avgs.append(avg)

#         last = None
#         if rlist:
#             last_row = sorted(rlist, key=lambda x: x.get("submitted_at") or "", reverse=True)[0]
#             qm = by_qid.get(last_row["quiz_id"], {})
#             last = {
#                 "quiz": qm.get("title") or f"Quiz {qm.get('quiz_id')}",
#                 "score": _pct(last_row.get("score")),
#                 "total": 100,
#                 "date": last_row.get("submitted_at"),
#             }

#         fe.append({
#             "student_id": s.get("student_id"),
#             "id": seat,  # keep your existing id = seat so the UI doesn’t break
#             "name": s.get("full_name") or "Student",
#             "seat": seat,
#             "email": s.get("email"),
#             "average": avg,
#             "last": last,
#         })

#     avg_class = _pct(sum(avgs)/len(avgs)) if avgs else None
#     top = None
#     if avgs:
#         st = sorted([x for x in fe if x["average"] is not None], key=lambda x: x["average"], reverse=True)
#         if st:
#             top = {"id": st[0]["id"], "name": st[0]["name"], "seat": st[0]["seat"], "avg": st[0]["average"]}

#     return {
#         "quizzesConducted": len(qids),
#         "avgClassScore": avg_class,
#         "topPerformer": top,
#         "students": fe,
#     }

# @app.get("/classes/{class_id}/student/{seat_no}/results")
# def student_results_by_seat(class_id: int, seat_no: str):
#     seat = (seat_no or "").upper()
#     quizzes_rows, qids = _quiz_ids_for_class(class_id)
#     if not qids: return {"quizzes": []}
#     by_id = {q["quiz_id"]: q for q in quizzes_rows}

#     rs = (supabase.table("results")
#           .select("quiz_id, score, submitted_at")
#           .eq("class_id", class_id)
#           .eq("seat_no", seat)
#           .in_("quiz_id", qids)
#           .order("submitted_at", desc=True)
#           .execute().data or [])

#     out = []
#     for r in rs:
#         qm = by_id.get(r["quiz_id"], {})
#         out.append({
#             "id": r["quiz_id"],
#             "title": qm.get("title") or f"Quiz {r['quiz_id']}",
#             "date": r.get("submitted_at"),
#             "score": _pct(r.get("score")),
#             "total": 100,
#         })
#     return {"quizzes": out}

# # =========================
# # Quizzes: list/get/create/delete
# # =========================
# def _normalize_question(raw, i=0):
#     qtype = (raw.get("type") or "short").lower()
#     prompt = str(raw.get("prompt") or raw.get("q") or "").strip() or f"Question {i+1}"
#     out = {
#         "question_text": prompt,
#         "question_type": "mcq" if qtype == "mcq" else "short_answer",
#         "correct_answer": raw.get("answer") if qtype != "mcq" else None,
#         "answer_index": raw.get("answerIndex") if qtype == "mcq" else None,
#         "choices": raw.get("choices") or raw.get("options") or None,
#     }
#     return out

# def _insert_question_with_options(quiz_id: int, q: Dict[str, Any]) -> int:
#     q_row = {
#         "quiz_id": quiz_id,
#         "question_text": q["question_text"],
#         "question_type": q["question_type"],
#         "correct_answer": q.get("correct_answer")
#     }
#     r = supabase.table("questions").insert(q_row).execute()
#     question_id = r.data[0]["question_id"]

#     choices = q.get("choices") or []
#     if isinstance(choices, list) and choices:
#         opt_rows = []
#         correct_idx = q.get("answer_index")
#         for idx, text in enumerate(choices):
#             opt_rows.append({
#                 "question_id": question_id,
#                 "option_text": str(text),
#                 "is_correct": (idx == correct_idx)
#             })
#         supabase.table("question_options").insert(opt_rows).execute()

#     return question_id

# @app.get("/quizzes")
# def list_quizzes(class_id: Optional[int] = None, with_counts: bool = True):
#     q = supabase.table("quizzes").select("*").order("created_at", desc=True)
#     if class_id is not None:
#         q = q.eq("class_id", class_id)
#     r = q.execute()
#     rows = r.data or []
#     if not with_counts or not rows:
#         return {"rows": rows}

#     ids = [row["quiz_id"] for row in rows]
#     q_rows = supabase.table("questions").select("quiz_id").in_("quiz_id", ids).execute().data or []
#     q_count = Counter([x["quiz_id"] for x in q_rows])

#     r_rows = supabase.table("results").select("quiz_id").in_("quiz_id", ids).execute().data or []
#     r_count = Counter([x["quiz_id"] for x in r_rows])

#     out = []
#     for row in rows:
#         qid = row["quiz_id"]
#         row["question_count"] = int(q_count.get(qid, 0))
#         row["result_count"]   = int(r_count.get(qid, 0))
#         out.append(row)
#     return {"rows": out}

# @app.post("/quizzes")
# def create_quiz(payload: Dict[str, Any]):
#     try:
#         class_id = int(payload.get("class_id"))
#         title = (payload.get("title") or "Untitled Quiz").strip()[:120]
#         qtype = (payload.get("type") or "mixed").lower()
#         duration = int(payload.get("duration_min") or 20)

#         r = supabase.table("quizzes").insert({
#             "class_id": class_id,
#             "title": title,
#             "type": qtype,
#             "duration_min": duration,
#             "created_at": now_iso(),
#         }).execute()
#         quiz_id = r.data[0]["quiz_id"]

#         for i, raw in enumerate(payload.get("questions") or []):
#             qnorm = _normalize_question(raw, i)
#             _insert_question_with_options(quiz_id, qnorm)

#         return {"quiz_id": quiz_id}
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Create failed: {e}")


# @app.get("/quizzes/{quiz_id}/full")
# def get_quiz_full(quiz_id: int):
#     # Fetch quiz row
#     qr = (
#         supabase.table("quizzes")
#         .select("*")
#         .eq("quiz_id", quiz_id)
#         .limit(1)
#         .execute()
#     )
#     rows = qr.data
#     if not rows:
#         raise HTTPException(status_code=404, detail="Quiz not found")
#     quiz = rows[0]

#     # Fetch questions (stable order by question_id)
#     qs = (
#         supabase.table("questions")
#         .select("*")
#         .eq("quiz_id", quiz_id)
#         .order("question_id")
#         .execute()
#         .data
#     )

#     # Collect all question_ids (or a dummy -1 to avoid IN () errors)
#     qids = [q["question_id"] for q in qs] or [-1]

#     # Fetch options for all questions (ordered by option_id so arrays align)
#     opts = (
#         supabase.table("question_options")
#         .select("*")
#         .in_("question_id", qids)
#         .order("option_id")
#         .execute()
#         .data
#     )

#     # Group options by question_id
#     by_q: dict[int, list[dict]] = {}
#     for o in (opts or []):
#         by_q.setdefault(o["question_id"], []).append(o)

#     questions = []
#     for q in qs or []:
#         qid = q["question_id"]
#         qtype = (q.get("question_type") or "").strip().lower()  # "mcq" | "short_answer" | ...
#         prompt = q.get("question_text") or ""

#         if qtype == "mcq":
#             q_opts = by_q.get(qid, [])  # already ordered by option_id above
#             choices = [str(o.get("option_text", "")) for o in q_opts]
#             option_ids = [o.get("option_id") for o in q_opts]

#             # find first correct option index (or -1 if none flagged)
#             correct_idx = -1
#             for i, o in enumerate(q_opts):
#                 if o.get("is_correct"):
#                     correct_idx = i
#                     break

#             questions.append({
#                 "type": "mcq",
#                 "questionId": str(qid),
#                 "prompt": prompt,
#                 "choices": choices,
#                 "optionIds": option_ids,   # <-- aligns with choices by index
#                 "answerIndex": correct_idx
#             })
#         else:
#             # treat everything else as short
#             questions.append({
#                 "type": "short",
#                 "questionId": str(qid),
#                 "prompt": prompt,
#                 "answer": q.get("correct_answer")
#             })

#     return {
#         "quiz": {
#             "id": quiz_id,
#             "classId": quiz.get("class_id"),
#             "title": quiz.get("title"),
#             "meta": {
#                 "type": (quiz.get("type") or "mixed"),
#                 "durationMin": quiz.get("duration_min"),
#             },
#             "createdAt": quiz.get("created_at"),
#             "questions": questions,
#         }
#     }



# @app.delete("/quizzes/{quiz_id}")
# def delete_quiz(quiz_id: int):
#     try:
#         qs = supabase.table("questions").select("question_id").eq("quiz_id", quiz_id).execute().data
#         qids = [q["question_id"] for q in qs] or [-1]
#         supabase.table("question_options").delete().in_("question_id", qids).execute()
#         supabase.table("questions").delete().eq("quiz_id", quiz_id).execute()
#         supabase.table("quizzes").delete().eq("quiz_id", quiz_id).execute()
#         return JSONResponse(status_code=204, content={})
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

# # =========================
# # Results
# # =========================
# @app.post("/results")
# def submit_result(payload: Dict[str, Any]):
#     try:
#         data = {
#             "quiz_id": int(payload.get("quiz_id")),
#             "class_id": int(payload.get("class_id")) if payload.get("class_id") is not None else None,
#             "seat_no": (payload.get("seat_no") or None),
#             "email": (payload.get("email") or None),
#             "score": payload.get("score"),
#             "answers_json": payload.get("answers_json"),
#             "submitted_at": now_iso(),
#         }
#         r = supabase.table("results").insert(data).execute()
#         return {"inserted": r.data}
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Submit failed: {e}")

# # ===================== Submit quiz (MCQ via option_id, short via AI) =====================
# class CheckQuizRequest(BaseModel):
#     quiz_id: int              
#     seat_no: str
#     class_id: int
#     email: str
#     answers: List[SubmitAnswer] = []  # allow empty list


# @app.post("/submit_quiz", status_code=200)
# async def submit_quiz(req: CheckQuizRequest):
#     detailed_results: list[dict] = []
#     total_score = 0

#     if not req.answers or len(req.answers) == 0:
#         qs_all = (supabase.table("questions")
#                   .select("question_id")
#                   .eq("quiz_id", req.quiz_id)
#                   .order("question_id")
#                   .execute().data or [])
#         req.answers = [
#             SubmitAnswer(question_id=int(q["question_id"]), answer="")  # blank (0 marks)

#             for q in qs_all
#         ]

#     for ans in req.answers:
#         qid = int(ans.question_id)  # guaranteed valid by Pydantic

#         # fetch the question row
#         qr = (supabase.table("questions")
#               .select("question_type, question_text")
#               .eq("question_id", qid)
#               .limit(1).execute())
#         if not qr.data:
#             # skip or raise; skipping is gentler for late-added/removed questions
#             continue

#         qrow = qr.data[0]
#         qtype = (qrow.get("question_type") or "").strip().lower()

#         score = 0
#         if qtype == "mcq":
#             # MCQ carries option_id in ans.answer
#             try:
#                 opt_id = int((ans.answer or "-1").strip())
#             except Exception:
#                 opt_id = -1

#             if opt_id > 0:
#                 orow = (supabase.table("question_options")
#                         .select("is_correct")
#                         .eq("option_id", opt_id)
#                         .limit(1).execute()).data
#                 score = 1 if (orow and orow[0]["is_correct"]) else 0
#         else:
#             # short/free-response → AI score 0..3
#             ai = await call_ai_evaluate(qrow.get("question_text") or "", ans.answer or "", max_marks=3)
#             score = int(ai.get("score") or 0)

#         total_score += score
#         detailed_results.append({
#             "question_id": qid,
#             "submitted_answer": ans.answer,
#             "score": score
#         })

#     # insert result (see #2 for answers_json)
#     (supabase.table("results").insert({
#         "quiz_id": int(req.quiz_id),     # store as bigint
#         "class_id": int(req.class_id),
#         "seat_no": (req.seat_no or None),
#         "email": (req.email or None),
#         "score": total_score,
#         "answers_json": detailed_results,  # <-- JSONB properly (not string)
#         "submitted_at": now_iso()
#     }).execute())

#     return {
#         "quiz_id": int(req.quiz_id),
#         "seat_no": req.seat_no,
#         "class_id": int(req.class_id),
#         "email": req.email,
#         "score": total_score,
#         "details": detailed_results
#     }



# # =========================
# # Student update (edit seat/name/email with cascades) — ID-based (auth required)
# # =========================
# @app.patch("/students/{student_id}")
# def update_student(student_id: str, patch: StudentPatch, user: AuthedUser = Depends(get_current_user)):
#     # 1) fetch current master row
#     cur_r = (supabase.table("students")
#              .select("student_id, seat_no, full_name, email")
#              .eq("student_id", student_id).limit(1).execute())
#     if not cur_r.data:
#         raise HTTPException(status_code=404, detail="Student not found")
#     cur = cur_r.data[0]
#     old_seat = _norm_seat(cur.get("seat_no") or "")

#     # Defensive: treat blanks as not provided
#     full_name_in = _none_if_blank(patch.full_name)
#     email_in     = _none_if_blank(patch.email)
#     seat_in      = _none_if_blank(patch.seat_no)

#     new_name  = full_name_in if full_name_in is not None else cur.get("full_name")
#     new_email = _norm_email(email_in) if email_in is not None else (cur.get("email") or None)
#     new_seat  = _norm_seat(seat_in) if seat_in is not None else old_seat

#     # 2) if seat changes, enforce uniqueness
#     if new_seat != old_seat:
#         owner = _find_student_by_seat(new_seat)
#         if owner and owner["student_id"] != student_id:
#             raise HTTPException(status_code=409, detail="Seat number is already taken by another student.")
    
#     # 3) update master
#     supabase.table("students").update({
#         "seat_no": new_seat,
#         "full_name": new_name,
#         "email": new_email
#     }).eq("student_id", student_id).execute()

#     # 4) cascade to class_students (denormalized view)
#     supabase.table("class_students").update({
#         "seat_no": new_seat,
#         "full_name": new_name,
#         "email": new_email
#     }).eq("student_id", student_id).execute()

#     # 5) cascade to results so historical reports stay tied to the new seat
#     if old_seat and new_seat and new_seat != old_seat:
#         supabase.table("results").update({
#             "seat_no": new_seat,
#             "email": new_email
#         }).eq("seat_no", old_seat).execute()

#     return {"ok": True, "student_id": student_id, "updated": {
#         "seat_no": new_seat, "full_name": new_name, "email": new_email
#     }}

# # =========================
# # ✅ Compatibility: edit by SEAT within a class (no auth), cascades to both tables + results
# # =========================
# @app.patch("/classes/{class_id}/student/{seat_no}")
# def patch_student_by_seat(class_id: int, seat_no: str, body: StudentPatch):
#     seat = _norm_seat(seat_no)

#     # 0) Find the student_id for this (class_id, seat_no)
#     row = (supabase.table("class_students")
#            .select("student_id, full_name, email, seat_no")
#            .eq("class_id", class_id)
#            .eq("seat_no", seat)
#            .limit(1).execute().data)
#     if not row:
#         raise HTTPException(status_code=404, detail="Student not found in this class")
#     student_id = row[0]["student_id"]

#     # 1) Fetch current master row
#     cur_r = (supabase.table("students")
#              .select("student_id, seat_no, full_name, email")
#              .eq("student_id", student_id).limit(1).execute())
#     if not cur_r.data:
#         raise HTTPException(status_code=404, detail="Student not found")
#     cur = cur_r.data[0]
#     old_seat = _norm_seat(cur.get("seat_no") or "")

#     # Defensive: treat blanks as not provided
#     full_name_in = _none_if_blank(body.full_name)
#     email_in     = _none_if_blank(body.email)
#     seat_in      = _none_if_blank(body.seat_no)

#     new_name  = full_name_in if full_name_in is not None else cur.get("full_name")
#     new_email = _norm_email(email_in) if email_in is not None else (cur.get("email") or None)
#     new_seat  = _norm_seat(seat_in) if seat_in is not None else old_seat

#     # 2) if seat changes, enforce uniqueness globally
#     if new_seat != old_seat:
#         owner = _find_student_by_seat(new_seat)
#         if owner and owner["student_id"] != student_id:
#             raise HTTPException(status_code=409, detail="Seat number is already taken by another student.")

#     # 3) update master (students)
#     supabase.table("students").update({
#         "seat_no": new_seat,
#         "full_name": new_name,
#         "email": new_email
#     }).eq("student_id", student_id).execute()

#     # 4) cascade to class_students
#     #    IMPORTANT: include BOTH filters to play nice with strict RLS
#     supabase.table("class_students").update({
#         "seat_no": new_seat,
#         "full_name": new_name,
#         "email": new_email
#     }).eq("student_id", student_id).eq("class_id", class_id).execute()

#     # 5) cascade to results so historical reports stay tied to the new seat (global)
#     if old_seat and new_seat and new_seat != old_seat:
#         supabase.table("results").update({
#             "seat_no": new_seat,
#             "email": new_email
#         }).eq("seat_no", old_seat).execute()

#     return {"ok": True, "student_id": student_id, "updated": {
#         "seat_no": new_seat, "full_name": new_name, "email": new_email
#     }}


# # =========================
# # ✅ Compatibility: delete enrollment by SEAT within a class
# # If student is in other classes -> remove only this enrollment
# # Else -> remove results for this seat, remove all enrollments (if any) and delete master student row
# # =========================
# @app.delete("/classes/{class_id}/student/{seat_no}", status_code=204)
# def delete_student_from_class(class_id: int, seat_no: str):
#     seat = _norm_seat(seat_no)
#     try:
#         # Find enrollment to get student_id
#         enr = (supabase.table("class_students")
#                .select("student_id, seat_no, email")
#                .eq("class_id", class_id)
#                .eq("seat_no", seat)
#                .limit(1).execute().data)
#         if not enr:
#             return JSONResponse(status_code=204, content={})
#         student_id = enr[0]["student_id"]

#         # How many classes is this student in?
#         cnt = (supabase.table("class_students")
#                .select("class_id", count="exact")
#                .eq("student_id", student_id)
#                .execute())
#         total_classes = cnt.count or 0

#         # Always remove the enrollment for this class
#         supabase.table("class_students").delete() \
#             .eq("class_id", class_id) \
#             .eq("student_id", student_id) \
#             .execute()

#         if total_classes > 1:
#             # Student still belongs to other classes – keep master + results
#             return JSONResponse(status_code=204, content={})

#         # Otherwise: fully remove student (only belonged to this class)
#         # 1) delete results for this (globally-unique) seat
#         supabase.table("results").delete().eq("seat_no", seat).execute()

#         # 2) remove any leftover enrollments (safety)
#         supabase.table("class_students").delete().eq("student_id", student_id).execute()

#         # 3) delete master row
#         supabase.table("students").delete().eq("student_id", student_id).execute()

#         return JSONResponse(status_code=204, content={})
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

# # =========================
# # Generator (topic/pdf/image) with hardened OCR & preview flag
# # =========================
# @app.post("/generate_quiz", status_code=201)
# async def generate_quiz(
#     request: Request,
#     class_id: int = Query(...),
#     topic: str = Form(None),
#     n_questions: int = Form(...),
#     format: str = Form(...),  # "mcq" | "short" | "mixed"
#     pdf: UploadFile = File(None),
#     image: UploadFile = File(None),
#     preview: Optional[int] = Form(None)
# ):
#     try:
#         _setup_tesseract_cmd()

#         preview_q = request.query_params.get("preview")
#         preview_flag = ((str(preview).strip() == "1") if preview is not None else (str(preview_q or "0").strip() == "1"))

#         content_text = ""

#         if pdf is not None:
#             contents = await pdf.read()
#             with pdfplumber.open(BytesIO(contents)) as pdf_file:
#                 for page in pdf_file.pages:
#                     t = page.extract_text()
#                     if t:
#                         content_text += t + "\n"
#             if not content_text.strip():
#                 images = convert_from_bytes(contents, dpi=300)
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

#         if (not content_text or not content_text.strip()) and (image is not None):
#             content_text = "General knowledge basics"

#         if (not content_text or not content_text.strip()) and (pdf is not None):
#             raise HTTPException(status_code=422, detail="No readable text found in the PDF. Try a text-based PDF or provide a topic.")

#         cleaned = re.sub(r"\s+", " ", (content_text or "")).strip()

#         if pdf is not None:
#             if len(re.findall(r"[A-Za-z0-9]", cleaned)) < 10 and not (topic and topic.strip()):
#                 raise HTTPException(status_code=422, detail="No readable text found in the PDF. Try a text-based PDF or provide a topic.")

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

#         debug_flag = (request.query_params.get("debug") == "1") or (str(request.headers.get("x-debug", "0")) == "1")
#         if preview_flag:
#             resp = {
#                 "title": (topic or ("PDF" if pdf else "Image") or "Generated Quiz"),
#                 "questions": questions
#             }
#             if debug_flag:
#                 resp["_debug_ocr_preview"] = (cleaned or "")[:300]
#             return resp

#         title = (topic or ("PDF/Image Quiz"))
#         existing = supabase.table("quizzes").select("*").eq("title", title).eq("class_id", class_id).execute()
#         if existing.data:
#             raise HTTPException(status_code=400, detail="Quiz with this title already exists for the class")

#         quiz_payload = {"class_id": class_id, "title": title, "type": format, "duration_min": 10, "created_at": now_iso()}
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
#         msg = str(e).lower()
#         if "tesseract is not installed" in msg:
#             raise HTTPException(status_code=500, detail="Tesseract not found. Set TESSERACT_CMD or add to PATH.")
#         if "poppler" in msg or "convert_from_bytes" in msg:
#             raise HTTPException(status_code=500, detail="Poppler is required for PDF OCR. Install it and retry.")
#         raise HTTPException(status_code=500, detail=str(e))

# # =========================
# # Generic CRUD (unchanged)
# # =========================
# @app.post("/{table}/", status_code=201)
# def create_record(table: str, record: GenericRecord):
#     try:
#         if table not in ALLOWED_TABLES:
#             raise HTTPException(status_code=404, detail="Table not allowed")
#         payload = record.data.copy()
#         r = supabase.table(table).insert(payload).execute()
#         return {"inserted": r.data}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/{table}/")
# def list_records(table: str, limit: int = 100, offset: int = 0):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")
#     r = supabase.table(table).select("*").limit(limit).offset(offset).execute()
#     return {"rows": r.data}

# @app.get("/{table}/{id}")
# def get_record(table: str, id: str):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")
#     r = supabase.table(table).select("*").eq("user_id" if table=="profiles" else "id", id).limit(1).execute()
#     rows = r.data
#     if not rows:
#         raise HTTPException(status_code=404, detail="Not found")
#     return rows[0]

# @app.put("/{table}/{id}")
# def update_record(table: str, id: str, record: GenericRecord):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")
#     payload = record.data.copy()
#     payload["updated_at"] = now_iso()
#     r = supabase.table(table).update(payload).eq("user_id" if table=="profiles" else "id", id).execute()
#     return {"updated": r.data}

# @app.delete("/{table}/{id}", status_code=204)
# def delete_record(table: str, id: str):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")

#     if table in ("class_students", "results"):
#         raise HTTPException(status_code=400, detail=f"Use the specific delete endpoint for '{table}' (composite key)")

#     id_column = {
#         "profiles": "user_id",
#         "classes": "class_id",
#         "quizzes": "quiz_id",
#         "questions": "question_id",
#         "question_options": "option_id"
#     }.get(table, "id")

#     try:
#         supabase.table(table).delete().eq(id_column, id).execute()
#         return JSONResponse(status_code=204, content={})
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/classes_with_counts")
# def classes_with_counts():
#     cr = (supabase.table("classes")
#           .select("class_id, course_name, course_code, department, semester, section, created_at")
#           .order("created_at", desc=True).execute())
#     classes = cr.data or []

#     sr = supabase.table("class_students").select("class_id").execute()
#     cnt = Counter([row["class_id"] for row in (sr.data or [])])

#     out = [
#         {
#             "id": c["class_id"],
#             "title": c.get("course_name") or "Class",
#             "code": c.get("course_code") or "",
#             "dept": (c.get("department") or "").upper(),
#             "sem": c.get("semester"),
#             "section": c.get("section"),
#             "students": int(cnt.get(c["class_id"], 0)),
#         }
#         for c in classes
#     ]
#     return {"rows": out}

# @app.get("/ping")
# def ping():
#     return {"ok": True}

























from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Request, Depends, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, conint, constr
from typing import List, Optional, Dict, Any
from collections import Counter
from datetime import datetime
from dotenv import load_dotenv

import os
import re
import json
import httpx
import requests

import pytesseract
from pdf2image import convert_from_bytes
from io import BytesIO
import pdfplumber
from PIL import Image, ImageOps, ImageEnhance

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
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Inquizitive Backend (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # add your deployed frontend origin(s) here if needed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

ALLOWED_TABLES = {"profiles", "quizzes", "classes", "questions", "question_options", "results"}  # students + class_students have dedicated flows

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
    # question_id: str
    question_id: int
    answer: Optional[str] = None

class GenericRecord(BaseModel):
    data: Dict[str, Any]

class AuthedUser(BaseModel):
    user_id: str
    email: Optional[str] = None

class EnsureProfile(BaseModel):
    full_name: Optional[str] = None

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

# Treat empty string like None (defensive updates)
def _none_if_blank(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

# --- OCR helpers ------------------------------------------------------------
def _setup_tesseract_cmd():
    cmd = os.getenv("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
        return

    common = [
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    ]
    for p in common:
        if os.path.isfile(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break

def _ocr_image_bytes(raw: bytes) -> str:
    try:
        img = Image.open(BytesIO(raw))
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        w, h = img.size
        scale = 300 / 96.0
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        img = ImageEnhance.Contrast(img).enhance(1.8)
        img = ImageEnhance.Brightness(img).enhance(1.05)
        img = ImageEnhance.Sharpness(img).enhance(1.2)

        gray = img.convert("L")
        def binarize(im, th): return im.point(lambda x: 0 if x < th else 255, "1")
        variants = [gray, binarize(gray, 150), binarize(gray, 130), ImageOps.invert(gray), binarize(ImageOps.invert(gray), 150)]

        langs = os.getenv("TESSERACT_LANG", "eng")
        configs = ["--oem 1 --psm 6", "--oem 1 --psm 11", "--oem 1 --psm 4"]

        best = ""
        for v in variants:
            for cfg in configs:
                try:
                    txt = pytesseract.image_to_string(v, lang=langs, config=cfg) or ""
                    txt = re.sub(r"[^\S\r\n]+", " ", txt).strip()
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
    {{ "type": "mcq", "text": "Q...", "options": ["A","B","C","D"], "correct_answer": "A" }} ,
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

# ===================== AI short-answer scoring =====================
async def call_ai_evaluate(question_text: str, student_answer: str, max_marks: int = 3) -> dict:
    question_text = (question_text or "").strip().lower()
    student_answer = (student_answer or "").strip().lower()

    prompt = (
        f"You are a strict examiner grading a student's short-answer response.\n\n"
        f"Question: {question_text}\n"
        f"Student Answer: {student_answer}\n\n"
        f"Rules:\n"
        f"- Read the question carefully and check if the student's answer correctly responds to it.\n"
        f"- Evaluate only factual/conceptual correctness.\n"
        f"- 0 = wrong/irrelevant, {max_marks//2} = partial, {max_marks} = fully correct.\n"
        f"- Return only JSON like {{\"score\": <int>}}.\n"
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

    try:
        cleaned = text_output.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        score = int(data.get("score", 0))
    except Exception:
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
# Auth (teachers only; students are public)
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

    return AuthedUser(user_id=data["id"], email=data.get("email"))

@app.get("/me")
async def me(user: AuthedUser = Depends(get_current_user)):
    return {"user_id": user.user_id, "email": user.email}

# =========================
# Profiles (no role/seat_no anymore) + alias + /profiles/me
# =========================
def _ensure_profile_impl(body: Optional[EnsureProfile], user: AuthedUser):
    rows = (
        supabase.table("profiles")
        .select("user_id")
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
        .data
    )
    if rows:
        patch = {"created_at": now_iso()}  # touch
        if body and body.full_name:
            patch["full_name"] = body.full_name
        supabase.table("profiles").update(patch).eq("user_id", user.user_id).execute()
    else:
        payload = {
            "user_id": user.user_id,
            "full_name": (body.full_name if body and body.full_name else user.email or "Teacher"),
            "created_at": now_iso()
        }
        supabase.table("profiles").insert(payload).execute()
    return {"ok": True}

@app.post("/profiles/ensure_profile")
def ensure_profile(body: EnsureProfile = None, user: AuthedUser = Depends(get_current_user)):
    try:
        return _ensure_profile_impl(body, user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ensure_profile failed: {e}")

# Legacy alias to preserve your frontend
@app.post("/profiles/ensure_teacher")
def ensure_teacher_alias(body: EnsureProfile = None, user: AuthedUser = Depends(get_current_user)):
    try:
        return _ensure_profile_impl(body, user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ensure_teacher failed: {e}")

# ✅ FRONTEND EXPECTS THIS
@app.get("/profiles/me")
def profiles_me(user: AuthedUser = Depends(get_current_user)):
    r = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
    )
    return {"row": (r.data[0] if r.data else None)}

# =========================
# Class & Join/Verify
# =========================
def _norm_email(e: str) -> str:
    return (e or "").strip().lower()

def _norm_seat(s: str) -> str:
    return (s or "").strip().upper()

def _normalize_name(n: str) -> str:
    return re.sub(r"\s+", " ", (n or "").strip()).lower()

def _valid_email_basic(e: str) -> bool:
    return "@" in e and "." in e.split("@")[-1]

def _find_student_by_seat(seat_no: str):
    seat = _norm_seat(seat_no)
    r = (supabase.table("students")
         .select("student_id, seat_no, full_name, email")
         .ilike("seat_no", seat)
         .limit(1).execute())
    return r.data[0] if r.data else None

def get_or_create_student(seat_no: str, full_name: Optional[str], email: Optional[str]) -> str:
    seat = _norm_seat(seat_no)
    if not seat:
        raise HTTPException(status_code=400, detail="Missing seat_no")

    r = (supabase.table("students")
         .select("student_id")
         .ilike("seat_no", seat)
         .limit(1)
         .execute())
    if r.data:
        return r.data[0]["student_id"]

    try:
        row = (supabase.table("students")
               .insert({"seat_no": seat, "full_name": full_name, "email": email})
               .execute().data[0])
        return row["student_id"]
    except Exception:
        r2 = (supabase.table("students")
              .select("student_id")
              .ilike("seat_no", seat)
              .limit(1).execute())
        if r2.data:
            return r2.data[0]["student_id"]
        raise

@app.get("/classes/{class_id}/meta")
def class_meta(class_id: int):
    r = (supabase.table("classes")
         .select("course_name, course_code, department, semester, section, class_id")
         .eq("class_id", class_id)
         .limit(1)
         .execute())
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
        # NOTE: If you want teacher name here, add/return owner_id in classes
        # and join to profiles to fetch full_name. Frontend already has fallbacks.
    }

@app.post("/public/join/{class_id}", status_code=201)
def public_join_class(class_id: int, body: Dict[str, Any]):
    """
    Public enrollment: no auth. Enforce global seat_no ownership via students table,
    and allow many-to-many via class_students (unique per (class_id, student_id)).
    """
    full_name = str(body.get("name") or "").strip()
    seat_no   = _norm_seat(body.get("seat") or "")
    email     = _norm_email(body.get("email") or "")

    if not full_name or not seat_no or not email:
        raise HTTPException(status_code=400, detail="All fields are required")
    if not _valid_email_basic(email):
        raise HTTPException(status_code=422, detail="Invalid email")

    exists = (supabase.table("classes").select("class_id").eq("class_id", class_id).limit(1).execute().data)
    if not exists:
        raise HTTPException(status_code=404, detail="Class not found")

    # 1) Enforce seat ownership
    existing = _find_student_by_seat(seat_no)
    if existing:
        same_name  = _normalize_name(full_name) == _normalize_name(existing.get("full_name") or "")
        same_email = email == _norm_email(existing.get("email") or "")
        if not (same_name and same_email):
            raise HTTPException(
                status_code=409,
                detail="This seat number already belongs to a different student. Please contact your instructor."
            )
        student_id = existing["student_id"]
    else:
        student_id = (supabase.table("students")
                      .insert({"seat_no": seat_no, "full_name": full_name, "email": email})
                      .execute().data[0]["student_id"])

    # 2) prevent duplicate enrollment for the same class
    already = (supabase.table("class_students")
               .select("class_id")
               .eq("class_id", class_id)
               .eq("student_id", student_id)
               .limit(1).execute().data)
    if already:
        return {"ok": True, "status": "approved", "enrolled": True}

    # intake note (optional)
    existing_req = (supabase.table("join_intake")
                    .select("intake_id,status")
                    .eq("class_id", class_id)
                    .or_(f"seat_no.eq.{seat_no},email.ilike.{email}")
                    .order("submitted_at", desc=True)
                    .limit(1).execute().data)
    if existing_req:
        intake_id = existing_req[0]["intake_id"]
        if existing_req[0]["status"] != "approved":
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

    # 3) enroll (denormalized columns for easy reads)
    supabase.table("class_students").insert({
        "class_id": class_id,
        "student_id": student_id,
        "full_name": full_name,
        "seat_no": seat_no,
        "email": email,
        "enrolled_at": now_iso(),
    }).execute()

    return {"ok": True, "intake_id": intake_id, "status": "approved", "enrolled": True}

@app.get("/classes/{class_id}/verify_student")
def verify_student(class_id: int, seat_no: str | None = Query(None), email: str | None = Query(None)):
    if not seat_no and not email:
        raise HTTPException(status_code=400, detail="Provide seat_no or email")

    seat = _norm_seat(seat_no or "")
    mail = _norm_email(email or "")

    if (seat and supabase.table("class_students").select("class_id").eq("class_id", class_id).eq("seat_no", seat).execute().data) and \
       (mail and supabase.table("class_students").select("class_id").eq("class_id", class_id).ilike("email", mail).execute().data):
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

# ---- NEW: quiz totals computed from questions (weights align with submit_quiz) ----
QUESTION_WEIGHT = {
    "mcq": 1,
    "true_false": 1,
    "short_answer": 3,
}
def _build_quiz_totals(qids: List[int]) -> Dict[int, int]:
    """
    Returns {quiz_id: total_marks} by summing weights of its questions.
    Unknown types default to short_answer weight (conservative) OR 1 — here we use 1.
    """
    if not qids:
        return {}
    qs = (
        supabase.table("questions")
        .select("quiz_id, question_type")
        .in_("quiz_id", qids)
        .execute()
        .data or []
    )
    totals: Dict[int, int] = {}
    for row in qs:
        qid = row.get("quiz_id")
        qtype = (row.get("question_type") or "").strip().lower()
        weight = QUESTION_WEIGHT.get(qtype, 1)  # default 1 if unknown
        totals[qid] = totals.get(qid, 0) + int(weight)
    return totals

@app.get("/classes/{class_id}/records")
def class_records(class_id: int):
    sr = (supabase.table("class_students")
        .select("student_id, full_name, seat_no, email, enrolled_at")
        .eq("class_id", class_id)
        .order("enrolled_at", desc=True)
        .execute())

    studs = sr.data or []

    quizzes_rows, qids = _quiz_ids_for_class(class_id)
    by_qid = {q["quiz_id"]: q for q in quizzes_rows}

    # Build totals per quiz (actual marks)
    quiz_totals = _build_quiz_totals(qids)

    results = []
    if qids:
        results = (supabase.table("results")
                   .select("quiz_id, score, submitted_at, seat_no")
                   .eq("class_id", class_id)
                   .in_("quiz_id", qids)
                   .execute().data or [])
    by_seat: Dict[str, List[dict]] = {}
    for r in results:
        by_seat.setdefault((r.get("seat_no") or "").upper(), []).append(r)

    fe, class_got_sum, class_tot_sum = [], 0, 0
    for s in studs:
        seat = (s.get("seat_no") or "").upper()
        rlist = by_seat.get(seat, [])

        # aggregate using actual totals
        got_sum = 0
        tot_sum = 0
        for r in rlist:
            qid = r.get("quiz_id")
            qtot = int(quiz_totals.get(qid, 0))
            rscore = r.get("score")
            if qtot > 0 and isinstance(rscore, (int, float)):
                got_sum += int(round(rscore))
                tot_sum += qtot

        avg = None
        if tot_sum > 0:
            avg = _pct((got_sum / float(tot_sum)) * 100)
            class_got_sum += got_sum
            class_tot_sum += tot_sum

        last = None
        if rlist:
            last_row = sorted(rlist, key=lambda x: x.get("submitted_at") or "", reverse=True)[0]
            qm = by_qid.get(last_row["quiz_id"], {})
            last = {
                "quiz": qm.get("title") or f"Quiz {qm.get('quiz_id')}",
                "score": int(round(last_row.get("score") or 0)),   # raw obtained for that quiz
                "total": int(quiz_totals.get(last_row["quiz_id"], 0)),  # actual quiz total
                "date": last_row.get("submitted_at"),
            }

        fe.append({
            "student_id": s.get("student_id"),
            "id": seat,  # keep your existing id = seat so the UI doesn’t break
            "name": s.get("full_name") or "Student",
            "seat": seat,
            "email": s.get("email"),
            "average": avg,                          # percentage derived from real totals
            "total_obtained": got_sum,               # expose aggregates for UI/CSV
            "total_possible": tot_sum,
            "totals": {"obtained": got_sum, "total": tot_sum},  # also expose nested for flexibility
            "last": last,
        })

    avg_class = _pct((class_got_sum / float(class_tot_sum)) * 100) if class_tot_sum > 0 else None
    top = None
    if fe:
        ranked = [x for x in fe if x["average"] is not None]
        ranked.sort(key=lambda x: x["average"], reverse=True)
        if ranked:
            top = {"id": ranked[0]["id"], "name": ranked[0]["name"], "seat": ranked[0]["seat"], "avg": ranked[0]["average"]}

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
    if not qids: 
        return {"quizzes": []}
    by_id = {q["quiz_id"]: q for q in quizzes_rows}

    # build totals
    quiz_totals = _build_quiz_totals(qids)

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
            "score": int(round(r.get("score") or 0)),               # raw score
            "total": int(quiz_totals.get(r["quiz_id"], 0)),         # actual quiz total
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
    # Fetch quiz row
    qr = (
        supabase.table("quizzes")
        .select("*")
        .eq("quiz_id", quiz_id)
        .limit(1)
        .execute()
    )
    rows = qr.data
    if not rows:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz = rows[0]

    # Fetch questions (stable order by question_id)
    qs = (
        supabase.table("questions")
        .select("*")
        .eq("quiz_id", quiz_id)
        .order("question_id")
        .execute()
        .data
    )

    # Collect all question_ids (or a dummy -1 to avoid IN () errors)
    qids = [q["question_id"] for q in qs] or [-1]

    # Fetch options for all questions (ordered by option_id so arrays align)
    opts = (
        supabase.table("question_options")
        .select("*")
        .in_("question_id", qids)
        .order("option_id")
        .execute()
        .data
    )

    # Group options by question_id
    by_q: dict[int, list[dict]] = {}
    for o in (opts or []):
        by_q.setdefault(o["question_id"], []).append(o)

    questions = []
    for q in qs or []:
        qid = q["question_id"]
        qtype = (q.get("question_type") or "").strip().lower()  # "mcq" | "short_answer" | ...
        prompt = q.get("question_text") or ""

        if qtype == "mcq":
            q_opts = by_q.get(qid, [])  # already ordered by option_id above
            choices = [str(o.get("option_text", "")) for o in q_opts]
            option_ids = [o.get("option_id") for o in q_opts]

            # find first correct option index (or -1 if none flagged)
            correct_idx = -1
            for i, o in enumerate(q_opts):
                if o.get("is_correct"):
                    correct_idx = i
                    break

            questions.append({
                "type": "mcq",
                "questionId": str(qid),
                "prompt": prompt,
                "choices": choices,
                "optionIds": option_ids,   # <-- aligns with choices by index
                "answerIndex": correct_idx
            })
        else:
            # treat everything else as short
            questions.append({
                "type": "short",
                "questionId": str(qid),
                "prompt": prompt,
                "answer": q.get("correct_answer")
            })

    return {
        "quiz": {
            "id": quiz_id,
            "classId": quiz.get("class_id"),
            "title": quiz.get("title"),
            "meta": {
                "type": (quiz.get("type") or "mixed"),
                "durationMin": quiz.get("duration_min"),
            },
            "createdAt": quiz.get("created_at"),
            "questions": questions,
        }
    }



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
# Results
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
    quiz_id: int              
    seat_no: str
    class_id: int
    email: str
    answers: List[SubmitAnswer] = []  # allow empty list


@app.post("/submit_quiz", status_code=200)
async def submit_quiz(req: CheckQuizRequest):
    detailed_results: list[dict] = []
    total_score = 0

    if not req.answers or len(req.answers) == 0:
        qs_all = (supabase.table("questions")
                  .select("question_id")
                  .eq("quiz_id", req.quiz_id)
                  .order("question_id")
                  .execute().data or [])
        req.answers = [
            SubmitAnswer(question_id=int(q["question_id"]), answer="")  # blank (0 marks)

            for q in qs_all
        ]

    for ans in req.answers:
        qid = int(ans.question_id)  # guaranteed valid by Pydantic

        # fetch the question row
        qr = (supabase.table("questions")
              .select("question_type, question_text")
              .eq("question_id", qid)
              .limit(1).execute())
        if not qr.data:
            # skip or raise; skipping is gentler for late-added/removed questions
            continue

        qrow = qr.data[0]
        qtype = (qrow.get("question_type") or "").strip().lower()

        score = 0
        if qtype == "mcq":
            # MCQ carries option_id in ans.answer
            try:
                opt_id = int((ans.answer or "-1").strip())
            except Exception:
                opt_id = -1

            if opt_id > 0:
                orow = (supabase.table("question_options")
                        .select("is_correct")
                        .eq("option_id", opt_id)
                        .limit(1).execute()).data
                score = 1 if (orow and orow[0]["is_correct"]) else 0
        else:
            # short/free-response → AI score 0..3
            ai = await call_ai_evaluate(qrow.get("question_text") or "", ans.answer or "", max_marks=3)
            score = int(ai.get("score") or 0)

        total_score += score
        detailed_results.append({
            "question_id": qid,
            "submitted_answer": ans.answer,
            "score": score
        })

    # insert result (see #2 for answers_json)
    (supabase.table("results").insert({
        "quiz_id": int(req.quiz_id),     # store as bigint
        "class_id": int(req.class_id),
        "seat_no": (req.seat_no or None),
        "email": (req.email or None),
        "score": total_score,
        "answers_json": detailed_results,  # <-- JSONB properly (not string)
        "submitted_at": now_iso()
    }).execute())

    return {
        "quiz_id": int(req.quiz_id),
        "seat_no": req.seat_no,
        "class_id": int(req.class_id),
        "email": req.email,
        "score": total_score,
        "details": detailed_results
    }



# =========================
# Student update (edit seat/name/email with cascades) — ID-based (auth required)
# =========================
@app.patch("/students/{student_id}")
def update_student(student_id: str, patch: StudentPatch, user: AuthedUser = Depends(get_current_user)):
    # 1) fetch current master row
    cur_r = (supabase.table("students")
             .select("student_id, seat_no, full_name, email")
             .eq("student_id", student_id).limit(1).execute())
    if not cur_r.data:
        raise HTTPException(status_code=404, detail="Student not found")
    cur = cur_r.data[0]
    old_seat = _norm_seat(cur.get("seat_no") or "")

    # Defensive: treat blanks as not provided
    full_name_in = _none_if_blank(patch.full_name)
    email_in     = _none_if_blank(patch.email)
    seat_in      = _none_if_blank(patch.seat_no)

    new_name  = full_name_in if full_name_in is not None else cur.get("full_name")
    new_email = _norm_email(email_in) if email_in is not None else (cur.get("email") or None)
    new_seat  = _norm_seat(seat_in) if seat_in is not None else old_seat

    # 2) if seat changes, enforce uniqueness
    if new_seat != old_seat:
        owner = _find_student_by_seat(new_seat)
        if owner and owner["student_id"] != student_id:
            raise HTTPException(status_code=409, detail="Seat number is already taken by another student.")
    
    # 3) update master
    supabase.table("students").update({
        "seat_no": new_seat,
        "full_name": new_name,
        "email": new_email
    }).eq("student_id", student_id).execute()

    # 4) cascade to class_students (denormalized view)
    supabase.table("class_students").update({
        "seat_no": new_seat,
        "full_name": new_name,
        "email": new_email
    }).eq("student_id", student_id).execute()

    # 5) cascade to results so historical reports stay tied to the new seat
    if old_seat and new_seat and new_seat != old_seat:
        supabase.table("results").update({
            "seat_no": new_seat,
            "email": new_email
        }).eq("seat_no", old_seat).execute()

    return {"ok": True, "student_id": student_id, "updated": {
        "seat_no": new_seat, "full_name": new_name, "email": new_email
    }}

# =========================
# ✅ Compatibility: edit by SEAT within a class (no auth), cascades to both tables + results
# =========================
@app.patch("/classes/{class_id}/student/{seat_no}")
def patch_student_by_seat(class_id: int, seat_no: str, body: StudentPatch):
    seat = _norm_seat(seat_no)

    # 0) Find the student_id for this (class_id, seat_no)
    row = (supabase.table("class_students")
           .select("student_id, full_name, email, seat_no")
           .eq("class_id", class_id)
           .eq("seat_no", seat)
           .limit(1).execute().data)
    if not row:
        raise HTTPException(status_code=404, detail="Student not found in this class")
    student_id = row[0]["student_id"]

    # 1) Fetch current master row
    cur_r = (supabase.table("students")
             .select("student_id, seat_no, full_name, email")
             .eq("student_id", student_id).limit(1).execute())
    if not cur_r.data:
        raise HTTPException(status_code=404, detail="Student not found")
    cur = cur_r.data[0]
    old_seat = _norm_seat(cur.get("seat_no") or "")

    # Defensive: treat blanks as not provided
    full_name_in = _none_if_blank(body.full_name)
    email_in     = _none_if_blank(body.email)
    seat_in      = _none_if_blank(body.seat_no)

    new_name  = full_name_in if full_name_in is not None else cur.get("full_name")
    new_email = _norm_email(email_in) if email_in is not None else (cur.get("email") or None)
    new_seat  = _norm_seat(seat_in) if seat_in is not None else old_seat

    # 2) if seat changes, enforce uniqueness globally
    if new_seat != old_seat:
        owner = _find_student_by_seat(new_seat)
        if owner and owner["student_id"] != student_id:
            raise HTTPException(status_code=409, detail="Seat number is already taken by another student.")

    # 3) update master (students)
    supabase.table("students").update({
        "seat_no": new_seat,
        "full_name": new_name,
        "email": new_email
    }).eq("student_id", student_id).execute()

    # 4) cascade to class_students
    #    IMPORTANT: include BOTH filters to play nice with strict RLS
    supabase.table("class_students").update({
        "seat_no": new_seat,
        "full_name": new_name,
        "email": new_email
    }).eq("student_id", student_id).eq("class_id", class_id).execute()

    # 5) cascade to results so historical reports stay tied to the new seat (global)
    if old_seat and new_seat and new_seat != old_seat:
        supabase.table("results").update({
            "seat_no": new_seat,
            "email": new_email
        }).eq("seat_no", old_seat).execute()

    return {"ok": True, "student_id": student_id, "updated": {
        "seat_no": new_seat, "full_name": new_name, "email": new_email
    }}


# =========================
# ✅ Compatibility: delete enrollment by SEAT within a class
# If student is in other classes -> remove only this enrollment
# Else -> remove results for this seat, remove all enrollments (if any) and delete master student row
# =========================
@app.delete("/classes/{class_id}/student/{seat_no}", status_code=204)
def delete_student_from_class(class_id: int, seat_no: str):
    seat = _norm_seat(seat_no)
    try:
        # Find enrollment to get student_id
        enr = (supabase.table("class_students")
               .select("student_id, seat_no, email")
               .eq("class_id", class_id)
               .eq("seat_no", seat)
               .limit(1).execute().data)
        if not enr:
            return JSONResponse(status_code=204, content={})
        student_id = enr[0]["student_id"]

        # How many classes is this student in?
        cnt = (supabase.table("class_students")
               .select("class_id", count="exact")
               .eq("student_id", student_id)
               .execute())
        total_classes = cnt.count or 0

        # Always remove the enrollment for this class
        supabase.table("class_students").delete() \
            .eq("class_id", class_id) \
            .eq("student_id", student_id) \
            .execute()

        if total_classes > 1:
            # Student still belongs to other classes – keep master + results
            return JSONResponse(status_code=204, content={})

        # Otherwise: fully remove student (only belonged to this class)
        # 1) delete results for this (globally-unique) seat
        supabase.table("results").delete().eq("seat_no", seat).execute()

        # 2) remove any leftover enrollments (safety)
        supabase.table("class_students").delete().eq("student_id", student_id).execute()

        # 3) delete master row
        supabase.table("students").delete().eq("student_id", student_id).execute()

        return JSONResponse(status_code=204, content={})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

# =========================
# Generator (topic/pdf/image) with hardened OCR & preview flag
# =========================
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
        preview_flag = ((str(preview).strip() == "1") if preview is not None else (str(preview_q or "0").strip() == "1"))

        content_text = ""

        if pdf is not None:
            contents = await pdf.read()
            with pdfplumber.open(BytesIO(contents)) as pdf_file:
                for page in pdf_file.pages:
                    t = page.extract_text()
                    if t:
                        content_text += t + "\n"
            if not content_text.strip():
                images = convert_from_bytes(contents, dpi=300)
                for pil_img in images:
                    buf = BytesIO()
                    pil_img.save(buf, format="PNG")
                    txt = _ocr_image_bytes(buf.getvalue())
                    if txt:
                        content_text += txt + "\n"
        elif image is not None:
            raw = await image.read()
            content_text = _ocr_image_bytes(raw)

        if (not content_text or not content_text.strip()) and (topic and topic.strip()):
            content_text = topic.strip()

        if (not content_text or not content_text.strip()) and (image is not None):
            content_text = "General knowledge basics"

        if (not content_text or not content_text.strip()) and (pdf is not None):
            raise HTTPException(status_code=422, detail="No readable text found in the PDF. Try a text-based PDF or provide a topic.")

        cleaned = re.sub(r"\s+", " ", (content_text or "")).strip()

        if pdf is not None:
            if len(re.findall(r"[A-Za-z0-9]", cleaned)) < 10 and not (topic and topic.strip()):
                raise HTTPException(status_code=422, detail="No readable text found in the PDF. Try a text-based PDF or provide a topic.")

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

        debug_flag = (request.query_params.get("debug") == "1") or (str(request.headers.get("x-debug", "0")) == "1")
        if preview_flag:
            resp = {
                "title": (topic or ("PDF" if pdf else "Image") or "Generated Quiz"),
                "questions": questions
            }
            if debug_flag:
                resp["_debug_ocr_preview"] = (cleaned or "")[:300]
            return resp

        title = (topic or ("PDF/Image Quiz"))
        existing = supabase.table("quizzes").select("*").eq("title", title).eq("class_id", class_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Quiz with this title already exists for the class")

        quiz_payload = {"class_id": class_id, "title": title, "type": format, "duration_min": 10, "created_at": now_iso()}
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
# Generic CRUD (unchanged)
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
        raise HTTPException(status_code=400, detail=f"Use the specific delete endpoint for '{table}' (composite key)")

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/classes_with_counts")
def classes_with_counts():
    cr = (supabase.table("classes")
          .select("class_id, course_name, course_code, department, semester, section, created_at")
          .order("created_at", desc=True).execute())
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
    return {"ok": True}
