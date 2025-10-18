# main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, status, Request, Depends, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import httpx
from supabase import create_client, Client
from datetime import datetime
from dotenv import load_dotenv
from uuid import uuid4
from typing import Optional, Dict
from collections import Counter


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
AI_API_URL = os.getenv("AI_API_URL")
AI_API_KEY = os.getenv("AI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Inquizitive Backend (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],   # lets Authorization through
    expose_headers=["*"],
)

ALLOWED_TABLES = {"profiles","quizzes","classes","questions","question_options","results"}

# ---------- Pydantic Models ----------
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

class CheckQuizRequest(BaseModel):
    quiz_id: str
    student_id: str
    answers: List[SubmitAnswer]

class GenericRecord(BaseModel):
    data: Dict[str, Any]

# JSON body models for previously query-param endpoints
class ClassStudentAction(BaseModel):
    class_id: int
    student_id: str

class ResultsQuery(BaseModel):
    quiz_id: Optional[int] = None
    student_id: Optional[str] = None
    
class AuthedUser(BaseModel):
    user_id: str
    email: Optional[str] = None    # <- Optional[str] instead of str | None
    role: Optional[str] = None     # <- Optional[str] instead of str | None

class EnsureTeacher(BaseModel):
    full_name: Optional[str] = None
    
class EnsureStudent(BaseModel):
    full_name: Optional[str] = None
    seat_no:   Optional[str] = None

class StudentPatch(BaseModel):
    full_name: Optional[str] = None
    seat_no:   Optional[str] = None
    email:     Optional[str] = None


def now_iso():
    return datetime.utcnow().isoformat()

# ---------- AI Calls ----------
async def call_ai_generate(topic: str, n: int, qformat: str) -> Dict[str, Any]:
    if not AI_API_URL:
        raise RuntimeError("AI_API_URL not set")
    payload = {"topic": topic, "n_questions": n, "format": qformat}
    headers = {"Content-Type": "application/json"}
    if AI_API_KEY:
        headers["Authorization"] = f"Bearer {AI_API_KEY}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(AI_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

async def call_ai_evaluate(reference: str, answer: str) -> Dict[str, Any]:
    if not AI_API_URL:
        raise RuntimeError("AI_API_URL not set")
    payload = {"mode": "evaluate", "reference_answer": reference, "student_answer": answer}
    headers = {"Content-Type": "application/json"}
    if AI_API_KEY:
        headers["Authorization"] = f"Bearer {AI_API_KEY}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(AI_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

@app.exception_handler(RuntimeError)
async def runtime_exception_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ---------- Authentication (PY3.9-safe) ----------
    
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

    # read role from profiles table
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


@app.post("/profiles/ensure_teacher")
def ensure_teacher(body: EnsureTeacher = None, user: AuthedUser = Depends(get_current_user)):
    try:
        # does a row already exist?
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
                "created_at": now_iso(),  # this column exists in your schema
            }
            if body and body.full_name:
                payload["full_name"] = body.full_name

            supabase.table("profiles").insert(payload).execute()

        return {"ok": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ensure_teacher failed: {e}")
    
    
# (optional) quick debug route to see your row (use with Authorization header)
@app.get("/profiles/me")
def profiles_me(user: AuthedUser = Depends(get_current_user)):
    r = supabase.table("profiles").select("*").eq("user_id", user.user_id).limit(1).execute()
    return {"row": (r.data[0] if r.data else None)}

# ---------- Joining the Class and Verification  ----------

# --- tiny helper normalize ---
def _norm_email(e: str) -> str:
    return (e or "").strip().lower()
def _norm_seat(s: str) -> str:
    return (s or "").strip().upper()
def _valid_email_basic(e: str) -> bool:
    return "@" in e and "." in e.split("@")[-1]

# 1) get course meta for the Course name
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


# 2) PUBLIC: submit a join request (no auth) — AUTO-APPROVE + ENROLL
@app.post("/public/join/{class_id}", status_code=201)
def public_join_class(class_id: int, body: Dict[str, Any]):
    full_name = str(body.get("name") or "").strip()
    seat_no   = _norm_seat(body.get("seat") or "")
    email     = _norm_email(body.get("email") or "")

    if not full_name or not seat_no or not email:
        raise HTTPException(status_code=400, detail="All fields are required")
    if not _valid_email_basic(email):
        raise HTTPException(status_code=422, detail="Invalid email")

    # class must exist
    exists = (
        supabase.table("classes").select("class_id")
        .eq("class_id", class_id).limit(1).execute().data
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Class not found")

    # If already enrolled (by seat or email), return success (idempotent)
    already = (
        supabase.table("class_students").select("student_id")
        .eq("class_id", class_id)
        .or_(f"seat_no.eq.{seat_no},email.ilike.{email}")
        .limit(1).execute().data
    )
    if already:
        return {"ok": True, "status": "approved", "enrolled": True}

    # If an active intake exists, just mark it approved; else create approved intake
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

    # Enroll into class_students with a valid UUID student_id
    student_uuid = str(uuid4())
    try:
        supabase.table("class_students").insert({
            "class_id": class_id,
            "full_name": full_name,
            "seat_no": seat_no,
            "email": email,
            "enrolled_at": now_iso(),
        }).execute()
    except Exception:
        # If a race caused a duplicate, we can ignore — the row exists already.
        pass

    return {"ok": True, "intake_id": intake_id, "status": "approved", "enrolled": True}

    
# 3) VERIFY before starting a quiz (no auth)
@app.get("/classes/{class_id}/verify_student")
def verify_student(class_id: int,
                   seat_no: str | None = Query(None),
                   email: str | None = Query(None)):
    if not seat_no and not email:
        raise HTTPException(status_code=400, detail="Provide seat_no or email")

    seat = _norm_seat(seat_no or "")
    mail = _norm_email(email or "")

    # enrolled?
    if (seat and supabase.table("class_students").select("class_id").eq("class_id", class_id).eq("seat_no", seat).execute().data) and (mail and supabase.table("class_students").select("class_id").eq("class_id", class_id).ilike("email", mail).execute().data):
        return {"ok": True, "source": "class_students"}
    # if mail and supabase.table("class_students").select("class_id").eq("class_id", class_id).ilike("email", mail).execute().data:
    #     return {"ok": True, "source": "class_students"}

    # (optional) accept approved intake as valid
    ji = supabase.table("join_intake").select("status").eq("class_id", class_id)
    if seat: ji = ji.eq("seat_no", seat)
    if mail: ji = ji.ilike("email", mail)
    rows = ji.execute().data or []
    if any(x["status"] in ("approved","enrolled") for x in rows):
        return {"ok": True, "source": "join_intake"}

    raise HTTPException(status_code=404, detail="Not found in this class")

# ---------- Record Details ----------

# --- helpers -------------------------------------------------------------
def _pct(v):
    try:
        return max(0, min(100, int(round(float(v)))))
    except Exception:
        return None

def _quiz_ids_for_class(cid: int):
    rs = supabase.table("quizzes").select("quiz_id,title,created_at").eq("class_id", cid).order("created_at").execute().data or []
    return rs, [q["quiz_id"] for q in rs]

# --- API: class records snapshot ----------------------------------------
# @app.get("/classes/{class_id}/records")
# def class_records(class_id: int):
#     """
#     Shape tailored for RecordView:
#     {
#       quizzesConducted: number,
#       avgClassScore: number|null,          # hidden on FE when null
#       topPerformer: { id, name, seat, avg} | null,
#       students: [
#         { id, name, seat, email, average: number|null,
#           last: { quiz, score, total, date } | null }
#       ]
#     }
#     """
#     # 1) enrolled students
#     sr = (
#         supabase.table("class_students")
#         .select("class_id,student_id,full_name,seat_no,email,enrolled_at")
#         .eq("class_id", class_id)
#         .order("enrolled_at", desc=True)
#         .execute()
#     )
#     studs = sr.data or []

#     # 2) quizzes in this class
#     quizzes_rows, qids = _quiz_ids_for_class(class_id)
#     quizzes_by_id = {q["quiz_id"]: q for q in quizzes_rows}
#     quizzes_conducted = len(qids)

#     # 3) all results for those quizzes (if any)
#     results = []
#     if qids:
#         results = (
#             supabase.table("results")
#             .select("quiz_id,student_id,score,submitted_at")
#             .in_("quiz_id", qids)
#             .execute()
#             .data
#             or []
#         )

#     # Index results per student
#     by_student = {}
#     for r in results:
#         sid = r["student_id"]
#         by_student.setdefault(sid, []).append(r)

#     # Build FE students array with averages + last
#     fe_students = []
#     avgs = []
#     for s in studs:
#         sid = s["student_id"]
#         rlist = by_student.get(sid, [])
#         # average: treat stored 'score' as percentage (0..100)
#         avg = _pct(sum(_pct(r["score"]) or 0 for r in rlist) / len(rlist)) if rlist else None
#         if avg is not None:
#             avgs.append(avg)

#         # last = most recent by submitted_at
#         last = None
#         if rlist:
#             last_row = sorted(rlist, key=lambda x: x.get("submitted_at") or "", reverse=True)[0]
#             qmeta = quizzes_by_id.get(last_row["quiz_id"], {})
#             last = {
#                 "quiz": qmeta.get("title") or f"Quiz {qmeta.get('quiz_id')}",
#                 "score": _pct(last_row.get("score")),
#                 "total": 100,                         # we only store %; FE shows "x/100"
#                 "date": last_row.get("submitted_at"),
#             }

#         fe_students.append({
#             "id": sid,
#             "name": s.get("full_name") or "Student",
#             "seat": s.get("seat_no"),
#             "email": s.get("email"),
#             "average": avg,
#             "last": last,
#         })

#     avg_class = _pct(sum(avgs)/len(avgs)) if avgs else None
#     top = None
#     if avgs:
#         st = sorted([x for x in fe_students if x["average"] is not None], key=lambda x: x["average"], reverse=True)
#         if st:
#             top = {"id": st[0]["id"], "name": st[0]["name"], "seat": st[0]["seat"], "avg": st[0]["average"]}

#     return {
#         "quizzesConducted": quizzes_conducted,
#         "avgClassScore": avg_class,     # FE will hide cards when null / 0 quizzes
#         "topPerformer": top,
#         "students": fe_students,
#     }



def _pct(v):
    try: return max(0, min(100, int(round(float(v)))))
    except: return None

def _quiz_ids_for_class(cid: int):
    rs = (supabase.table("quizzes")
          .select("quiz_id,title,created_at")
          .eq("class_id", cid)
          .order("created_at")
          .execute().data or [])
    return rs, [q["quiz_id"] for q in rs]

@app.get("/classes/{class_id}/records")
def class_records(class_id: int):
    # 1) enrolled students
    sr = (supabase.table("class_students")
          .select("full_name, seat_no, email, enrolled_at")
          .eq("class_id", class_id)
          .order("enrolled_at", desc=True)
          .execute())
    studs = sr.data or []

    # 2) quizzes
    quizzes_rows, qids = _quiz_ids_for_class(class_id)
    by_qid = {q["quiz_id"]: q for q in quizzes_rows}

    # 3) results for this class (group by seat_no)
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

    # 4) FE shape
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
            "id": seat,                    # <-- use seat as id for FE
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

    

# @app.patch("/classes/{class_id}/students/{student_id}")
# def update_student_in_class(class_id: int, student_id: str, body: StudentPatch):
#     patch = {}
#     if body.full_name is not None: patch["full_name"] = body.full_name.strip() or None
#     if body.seat_no   is not None: patch["seat_no"]   = (body.seat_no or "").strip().upper() or None
#     if body.email     is not None: patch["email"]     = (body.email or "").strip().lower() or None
#     if not patch:
#         return {"updated": 0}
#     r = supabase.table("class_students").update(patch)\
#         .eq("class_id", class_id).eq("student_id", student_id).execute()
#     return {"updated": len(r.data or [])}

# @app.delete("/classes/{class_id}/students/{student_id}")
# def delete_student_from_class(class_id: int, student_id: str):
#     supabase.table("class_students").delete().eq("class_id", class_id).eq("student_id", student_id).execute()
#     return JSONResponse(status_code=204, content={})
 
 
 
@app.patch("/classes/{class_id}/student/{seat_no}")
def update_student_by_seat(class_id: int, seat_no: str, body: StudentPatch):
    patch = {}
    if body.full_name is not None: patch["full_name"] = body.full_name.strip() or None
    if body.seat_no   is not None: patch["seat_no"]   = (body.seat_no or "").upper() or None
    if body.email     is not None: patch["email"]     = (body.email or "").lower() or None
    if not patch: return {"updated": 0}
    r = (supabase.table("class_students")
         .update(patch)
         .eq("class_id", class_id)
         .eq("seat_no", (seat_no or "").upper())
         .execute())
    return {"updated": len(r.data or [])}

@app.delete("/classes/{class_id}/student/{seat_no}", status_code=204)
def delete_student_by_seat(class_id: int, seat_no: str):
    supabase.table("class_students").delete()\
        .eq("class_id", class_id).eq("seat_no", (seat_no or "").upper()).execute()
    return JSONResponse(status_code=204, content={})
 
    
# ---------- Each Student Quiz Results ----------

# @app.get("/classes/{class_id}/students/{student_id}/results")
# def student_results(class_id: int, student_id: str):
#     quizzes_rows, qids = _quiz_ids_for_class(class_id)
#     if not qids:
#         return {"quizzes": []}

#     by_id = {q["quiz_id"]: q for q in quizzes_rows}
#     rs = (
#         supabase.table("results")
#         .select("quiz_id,score,submitted_at")
#         .eq("student_id", student_id)
#         .in_("quiz_id", qids)
#         .order("submitted_at", desc=True)
#         .execute()
#         .data or []
#     )
#     out = []
#     for r in rs:
#         q = by_id.get(r["quiz_id"])
#         out.append({
#             "id": r["quiz_id"],
#             "title": (q.get("title") if q else f"Quiz {r['quiz_id']}"),
#             "date": r.get("submitted_at"),
#             "score": _pct(r.get("score")),
#             "total": 100,
#         })
#     return {"quizzes": out}


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



# ---------- Quiz Endpoints ----------
@app.post("/generate_quiz", status_code=201)
async def generate_quiz(req: GenerateQuizRequest):
    if req.format not in {"mcq", "short", "mix"}:
        raise HTTPException(status_code=400, detail="Invalid format")
    ai_resp = await call_ai_generate(req.topic, req.n_questions, req.format)
    questions = ai_resp.get("questions")
    if not isinstance(questions, list):
        raise HTTPException(status_code=500, detail="AI response malformed")

    quiz_payload = {"class_id": None,"title": req.topic,"created_at": now_iso()}
    r = supabase.table("quizzes").insert(quiz_payload).execute()
    quiz_id = r.data[0]["quiz_id"]

    inserted_questions = []
    for q in questions:
        q_row = {
            "quiz_id": quiz_id,
            "question_text": q.get("text",""),
            "question_type": q.get("type","short_answer"),
            "correct_answer": q.get("correct_answer", None)
        }
        r = supabase.table("questions").insert(q_row).execute()
        question_id = r.data[0]["question_id"]

        opts = q.get("options", [])
        if opts:
            opt_rows = [{"question_id": question_id, "option_text": o["text"], "is_correct": o.get("is_correct",False)} for o in opts]
            supabase.table("question_options").insert(opt_rows).execute()

        inserted_questions.append({"question_id": question_id, "text": q.get("text","")})
    return {"quiz_id": quiz_id, "questions": inserted_questions}

# ---------- Class Students Endpoints (JSON body) ----------
@app.post("/class_students/")
def add_student_to_class(req: ClassStudentAction):
    row = {"class_id": req.class_id, "student_id": req.student_id, "enrolled_at": now_iso()}
    r = supabase.table("class_students").insert(row).execute()
    return {"inserted": r.data}

@app.delete("/class_students/")
def remove_student_from_class(req: ClassStudentAction):
    supabase.table("class_students").delete().eq("class_id", req.class_id).eq("student_id", req.student_id).execute()
    return {"deleted": True}

# @app.get("/class_students/")
# def list_students_in_class(req: ClassStudentAction):
#     query = supabase.table("class_students").select("*")
#     if req.class_id: query = query.eq("class_id", req.class_id)
#     if req.student_id: query = query.eq("student_id", req.student_id)
#     r = query.execute()
#     return {"rows": r.data}
@app.get("/class_students/")
def list_students_in_class(class_id: Optional[int] = None, student_id: Optional[str] = None):
    query = supabase.table("class_students").select("*")
    if class_id: query = query.eq("class_id", class_id)
    if student_id: query = query.eq("student_id", student_id)
    r = query.execute()
    return {"rows": r.data}
# @app.get("/results/")
# def get_results(req: ResultsQuery):
#     query = supabase.table("results").select("*")
#     if req.quiz_id: query = query.eq("quiz_id", req.quiz_id)
#     if req.student_id: query = query.eq("student_id", req.student_id)
#     r = supabase.table("results").select("*").execute()
#     return {"rows": r.data}


# @app.get("/results/")
# def get_results(quiz_id: Optional[int] = None, student_id: Optional[str] = None):
#     query = supabase.table("results").select("*")
#     if quiz_id:
#         query = query.eq("quiz_id", quiz_id)
#     if student_id:
#         query = query.eq("student_id", student_id)
#     r = query.execute()
#     return {"rows": r.data}


@app.get("/results/")
def get_results(
    quiz_id: Optional[int] = None,
    seat_no: Optional[str] = None,
    email: Optional[str] = None,
    class_id: Optional[int] = None,
):
    q = supabase.table("results").select("*")
    if quiz_id is not None:
        q = q.eq("quiz_id", quiz_id)
    if class_id is not None:
        q = q.eq("class_id", class_id)
    if seat_no:
        q = q.eq("seat_no", (seat_no or "").upper())
    if email:
        q = q.ilike("email", (email or "").lower())
    r = q.execute()
    return {"rows": r.data}


# ---------- Generic CRUD Endpoints ----------
# @app.post("/{table}/", status_code=201)
# def create_record(table: str, record: GenericRecord):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")
#     payload = record.data.copy()
#     payload.setdefault("created_at", now_iso())
#     r = supabase.table(table).insert(payload).execute()
#     return {"inserted": r.data}

@app.post("/{table}/", status_code=201)
def create_record(table: str, record: GenericRecord):
    try:
        if table not in ALLOWED_TABLES:
            raise HTTPException(status_code=404, detail="Table not allowed")
        payload = record.data.copy()
        # payload.setdefault("created_at", now_iso())
        r = supabase.table(table).insert(payload).execute()
        return {"inserted": r.data}
    except Exception as e:
        import traceback
        traceback.print_exc()
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

    # handle special tables with composite keys
    if table == "class_students" or table == "results":
        raise HTTPException(
            status_code=400,
            detail=f"Use the specific delete endpoint for '{table}' (composite key)"
        )

    # mapping of id columns for single-key tables
    id_column = {
        "profiles": "user_id",
        "classes": "class_id",
        "quizzes": "quiz_id",
        "questions": "question_id",
        "question_options": "option_id"
    }.get(table, "id")  # fallback just in case

    try:
        supabase.table(table).delete().eq(id_column, id).execute()
        return JSONResponse(status_code=204, content={})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# @app.delete("/{table}/{id}", status_code=204)
# def delete_record(table: str, id: str):
#     if table not in ALLOWED_TABLES:
#         raise HTTPException(status_code=404, detail="Table not allowed")
#     supabase.table(table).delete().eq("user_id" if table=="profiles" else "id", id).execute()
#     return JSONResponse(status_code=204, content={})




# =========================
# QUIZ API used by frontend
# =========================

from typing import Tuple

def _uuid_or_int(v: Any) -> Any:
    # helper: many of your ids are integers; student_id is uuid text
    try:
        return int(v)
    except Exception:
        return v

def _now_iso():
    return datetime.utcnow().isoformat()

def _normalize_question(raw, i=0):
    """
    Accepts either MCQ or Short in your frontend shape and returns
    DB rows-friendly dicts.
    """
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
        "question_type": q["question_type"],      # 'mcq' | 'short_answer'
        "correct_answer": q.get("correct_answer") # for short questions
        # no created_at here
    }
    r = supabase.table("questions").insert(q_row).execute()
    question_id = r.data[0]["question_id"]

    # options (MCQ) — mark correct via is_correct
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



# @app.post("/classes/{class_id}/quiz/generate")
# def generate_preview_for_class(class_id: int, payload: Dict[str, Any]):
#     """
#     Your UI calls this to get a PREVIEW (no DB write).
#     Later, you can call your AI here. For now we mock.
#     payload: { material, quizType, difficulty, count }
#     """
#     material = (payload.get("material") or "").strip()
#     quiz_type = (payload.get("quizType") or "mixed").lower()
#     difficulty = int(payload.get("difficulty") or 60)
#     count = max(1, min(50, int(payload.get("count") or 10)))

#     base = " ".join(material.split()[:24]) or "From uploaded material"
#     questions = []
#     for i in range(count):
#         text = f"Q{i+1}. {base} — concept {i+1}?"
#         if quiz_type == "short":
#             questions.append({"type": "short", "prompt": text, "answer": None})
#         elif quiz_type == "mcq":
#             questions.append({
#                 "type": "mcq",
#                 "prompt": text,
#                 "choices": ["Option A","Option B","Option C","Option D"],
#                 "answerIndex": i % 4
#             })
#         else:
#             if i % 2 == 0:
#                 questions.append({
#                     "type": "mcq",
#                     "prompt": text,
#                     "choices": ["Option A","Option B","Option C","Option D"],
#                     "answerIndex": (i+1) % 4
#                 })
#             else:
#                 questions.append({"type": "short", "prompt": text, "answer": None})

#     return {
#         "title": "Generated Quiz (Preview)",
#         "meta": {"type": quiz_type, "difficulty": difficulty, "count": len(questions)},
#         "questions": questions,
#     }


@app.get("/quizzes")
def list_quizzes(class_id: Optional[int] = None, with_counts: bool = True):
    """
    List quizzes (optionally filtered by class) and include per-quiz counts:
      - question_count: number of questions in each quiz
      - result_count:   number of result rows (submissions) for each quiz
    """
    # 1) base quiz rows
    q = supabase.table("quizzes").select("*").order("created_at", desc=True)
    if class_id is not None:
        q = q.eq("class_id", class_id)
    r = q.execute()
    rows = r.data or []

    if not with_counts or not rows:
        return {"rows": rows}

    # 2) gather ids
    ids = [row["quiz_id"] for row in rows]

    # 3) question counts (single fetch; count in Python)
    q_rows = (
        supabase.table("questions")
        .select("quiz_id")
        .in_("quiz_id", ids)
        .execute()
        .data or []
    )
    q_count = Counter([x["quiz_id"] for x in q_rows])

    # 4) result counts (optional but useful)
    r_rows = (
        supabase.table("results")
        .select("quiz_id")
        .in_("quiz_id", ids)
        .execute()
        .data or []
    )
    r_count = Counter([x["quiz_id"] for x in r_rows])

    # 5) attach counts
    out = []
    for row in rows:
        qid = row["quiz_id"]
        row["question_count"] = int(q_count.get(qid, 0))
        row["result_count"]   = int(r_count.get(qid, 0))
        out.append(row)

    return {"rows": out}


# @app.post("/quizzes")
# def create_quiz(payload: Dict[str, Any]):
#     """
#     payload: {
#       class_id, title, type, duration_min,
#       questions: [{ type, prompt, choices?, answerIndex?, answer? }]
#     }
#     """
#     try:
#         class_id = int(payload.get("class_id"))
#         title = (payload.get("title") or "Untitled Quiz").strip()[:120]
#         qtype = (payload.get("type") or "mixed").lower()
#         duration = int(payload.get("duration_min") or 20)
#         created = _now_iso()

#         r = supabase.table("quizzes").insert({
#             "class_id": class_id,
#             "title": title,
#             "type": qtype,
#             "duration_min": duration,
#             "created_at": created
#         }).execute()
#         quiz_id = r.data[0]["quiz_id"]

#         for i, raw in enumerate(payload.get("questions") or []):
#             qnorm = _normalize_question(raw, i)
#             _insert_question_with_options(quiz_id, qnorm)

#         return {"quiz_id": quiz_id}
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Create failed: {e}")



@app.post("/quizzes")
def create_quiz(payload: Dict[str, Any]):
    """
    payload: {
      class_id, title, type, duration_min,
      questions: [{ type:'mcq'|'short', prompt, choices?, answerIndex?, answer? }]
    }
    """
    try:
        class_id = int(payload.get("class_id"))
        title = (payload.get("title") or "Untitled Quiz").strip()[:120]
        qtype = (payload.get("type") or "mixed").lower()
        duration = int(payload.get("duration_min") or 20)
        created = now_iso()

        # insert quiz row (columns now exist)
        r = supabase.table("quizzes").insert({
            "class_id": class_id,
            "title": title,
            "type": qtype,
            "duration_min": duration,
            "created_at": created,
        }).execute()
        quiz_id = r.data[0]["quiz_id"]

        # insert questions (+ options)
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

    # attach options to each question
    by_q = {}
    for o in opts:
        by_q.setdefault(o["question_id"], []).append(o)

    questions = []
    for q in qs:
        if q["question_type"] == "mcq":
            choices = [o["option_text"] for o in by_q.get(q["question_id"], [])]
            # try to find correct index
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
        # delete children first (FKs may or may not cascade depending on your schema)
        qs = supabase.table("questions").select("question_id").eq("quiz_id", quiz_id).execute().data
        qids = [q["question_id"] for q in qs] or [-1]
        supabase.table("question_options").delete().in_("question_id", qids).execute()
        supabase.table("questions").delete().eq("quiz_id", quiz_id).execute()
        supabase.table("quizzes").delete().eq("quiz_id", quiz_id).execute()
        return JSONResponse(status_code=204, content={})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

# @app.post("/results")
# def submit_result(payload: Dict[str, Any]):
#     """
#     payload: { quiz_id, student_id, score?, answers_json? }
#     """
#     try:
#         data = {
#             "quiz_id": int(payload.get("quiz_id")),
#             "student_id": str(payload.get("student_id")),
#             "score": payload.get("score"),
#             "answers_json": payload.get("answers_json"),
#             "submitted_at": _now_iso(),
#         }
#         r = supabase.table("results").insert(data).execute()
#         return {"inserted": r.data}
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Submit failed: {e}")



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
            "submitted_at": _now_iso(),
        }
        r = supabase.table("results").insert(data).execute()
        return {"inserted": r.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Submit failed: {e}")



# ================= QUIZ: frontend-compatible generator =================
from random import randint

@app.post("/classes/{class_id}/quiz/generate")
async def generate_quiz_for_class(class_id: str, body: Dict[str, Any]):
    """
    Accepts the frontend payload:
    { material: str, quizType: 'mcq'|'short'|'mixed', difficulty: int(0..100), count: int }

    Returns the preview shape the UI already expects:
    {
      title, meta:{ type, difficulty, count },
      questions: [
        { type:'mcq', prompt, choices:[...], answerIndex } | { type:'short', prompt, answer? }
      ]
    }
    """
    material = (body.get("material") or "").strip()
    quiz_type = (body.get("quizType") or "mixed").lower()
    difficulty = int(body.get("difficulty") or 60)
    count = max(1, min(100, int(body.get("count") or 10)))

    # if you have an AI endpoint configured, call it; else fall back to a simple server-side generator
    questions = []
    if AI_API_URL:
        try:
            # Reuse your AI endpoint, but pass the mapped args
            ai = await call_ai_generate(topic=material or "General Knowledge", n=count,
                                        qformat="mix" if quiz_type == "mixed" else quiz_type)
            ai_qs = ai.get("questions") or []
            for i, q in enumerate(ai_qs[:count]):
                t = (q.get("type") or quiz_type).lower()
                text = q.get("prompt") or q.get("text") or f"Question {i+1}"
                if t == "mcq" or isinstance(q.get("options"), list) or isinstance(q.get("choices"), list):
                    choices = q.get("choices") or q.get("options") or ["Option A", "Option B"]
                    ans_idx = (q.get("answerIndex")
                               if isinstance(q.get("answerIndex"), int)
                               else q.get("correct_index")
                               if isinstance(q.get("correct_index"), int)
                               else 0)
                    ans_idx = max(0, min(len(choices)-1, ans_idx))
                    questions.append({"type": "mcq", "prompt": text, "choices": choices, "answerIndex": ans_idx})
                else:
                    questions.append({"type": "short", "prompt": text, "answer": q.get("answer")})
        except Exception:
            # fall back to local generator if AI fails
            pass

    if not questions:
        # simple fallback generator (server-side mock; mirrors your old frontend mock)
        base = " ".join((material or "From uploaded material").split()[:20])
        for i in range(count):
            if quiz_type == "short":
                questions.append({
                    "type": "short",
                    "prompt": f"Q{i+1}. {base} — explain briefly.",
                    "answer": "Sample expected answer."
                })
            elif quiz_type == "mcq":
                questions.append({
                    "type": "mcq",
                    "prompt": f"Q{i+1}. {base} — pick the correct option.",
                    "choices": ["Option A", "Option B", "Option C", "Option D"],
                    "answerIndex": i % 4
                })
            else:
                # mixed
                if i % 2 == 0:
                    questions.append({
                        "type": "mcq",
                        "prompt": f"Q{i+1}. {base} — choose the best answer.",
                        "choices": ["Option A", "Option B", "Option C", "Option D"],
                        "answerIndex": (i+1) % 4
                    })
                else:
                    questions.append({
                        "type": "short",
                        "prompt": f"Q{i+1}. {base} — short response?",
                        "answer": "Sample expected answer."
                    })

    # also persist a quiz stub to Supabase (optional preview record)
    # title = first sentence or fallback
    title = (material.split(".")[0] or "Generated Quiz").strip()[:80] or "Generated Quiz"
    quiz_row = {
        "class_id": class_id,
        "title": title,
        "created_at": now_iso(),
    }
    try:
        qr = supabase.table("quizzes").insert(quiz_row).execute()
        db_quiz_id = qr.data[0]["quiz_id"]
        # store questions to DB for later use
        for q in questions:
            q_row = {
                "quiz_id": db_quiz_id,
                "question_text": q["prompt"],
                "question_type": "mcq" if "choices" in q else "short_answer",
                "correct_answer": None if "choices" in q else (q.get("answer") or None),
            }
            ir = supabase.table("questions").insert(q_row).execute()
            qid = ir.data[0]["question_id"]
            if "choices" in q:
                opts = []
                for i, opt in enumerate(q["choices"]):
                    opts.append({
                        "question_id": qid,
                        "option_text": opt,
                        "is_correct": (i == q.get("answerIndex", -1))
                    })
                supabase.table("question_options").insert(opts).execute()
    except Exception:
        # if table schema differs in your project, skipping DB save is fine for preview
        db_quiz_id = None

    return {
        "title": title,
        "meta": {"type": quiz_type, "difficulty": difficulty, "count": len(questions)},
        "questions": questions,
    }
    
    
# ================= Counts =================
    

@app.get("/classes_with_counts")
def classes_with_counts():
    # 1) base classes
    cr = (
        supabase.table("classes")
        .select("class_id, course_name, course_code, department, semester, section, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    classes = cr.data or []

    # 2) one grouped fetch for all class_ids from class_students
    sr = supabase.table("class_students").select("class_id").execute()
    cnt = Counter([row["class_id"] for row in (sr.data or [])])

    # 3) shape for the card UI
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






