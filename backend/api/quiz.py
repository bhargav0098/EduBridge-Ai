from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
import json
import os
import math
import random

from ..database import get_db
from ..models.models import Question, StudentPerformance, StudentProfile, User, UserRole, ActivityLog, Achievement, StudentTopicMastery
from .auth import verify_token
from ..utils.sse_manager import sse_manager
from ..schemas.schemas import QuizSubmission, QuizQuestionSchema

router = APIRouter()

# Elo-lite brackets
def get_elo_difficulty(elo: int) -> int:
    if elo < 1000:
        return 1
    elif elo < 1150:
        return 2
    elif elo < 1300:
        return 3
    elif elo < 1450:
        return 4
    else:
        return 5


def seed_questions(db: Session):
    """
    Seed questions from backend/data/quiz_bank.json dynamically.
    Falls back to warning if the file is not present.
    """
    import json
    import os

    # Count how many questions exist
    existing_count = db.query(Question).count()
    if existing_count >= 232:
        return

    # Clear existing questions to ensure clean seeding
    db.query(Question).delete()
    db.commit()

    questions_list = []
    # Path is relative to the root directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(backend_dir, "data", "quiz_bank.json")
    
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for q_data in data:
                    questions_list.append(
                        Question(
                            subject=q_data["subject"],
                            topic=q_data["topic"],
                            question_text=q_data["question_text"],
                            difficulty=q_data["difficulty"],
                            type=q_data.get("type", "MCQ"),
                            options=q_data.get("options"),
                            answer=q_data["answer"],
                            explanation=q_data.get("explanation")
                        )
                    )
            db.add_all(questions_list)
            db.commit()
            print(f"Seeded {len(questions_list)} questions dynamically from JSON.")
            return
        except Exception as e:
            print(f"Failed to load quiz bank JSON: {e}. Falling back.")
            db.rollback()

    print("WARNING: quiz_bank.json not found! Empty question seeding.")


@router.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    seed_questions(db)
    return {"message": "Database seeded successfully"}


@router.get("/concept-graph")
def get_concept_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    import json
    import os
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(backend_dir, "data", "concept_graph.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Concept graph configuration not found")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse concept graph: {str(e)}")
    from ..models.models import StudentTopicMastery
    masteries = db.query(StudentTopicMastery).filter(
        StudentTopicMastery.student_id == current_user.id
    ).all()
    mastery_map = {m.topic.lower().strip(): m.p_known for m in masteries}
    for node in graph_data.get("nodes", []):
        node_id = node["id"].lower().strip()
        node["mastery"] = round(mastery_map.get(node_id, 0.25) * 100, 1)
    return graph_data


@router.get("/next")
def get_next_question(
    subject: str = Query(..., description="Subject of the quiz: physics or math"),
    topic: Optional[str] = Query(None, description="Topic of the quiz"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Ensure database is seeded
    seed_questions(db)

    # Get student's profile and ELO
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    student_elo = profile.elo if profile else 1200

    # Pick topic
    topics_query = db.query(Question.topic).filter(Question.subject == subject.lower()).distinct().all()
    topic_list = [t[0] for t in topics_query if t[0]]
    if not topic_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No topics available for this subject."
        )
    
    selected_topic = topic if topic else random.choice(topic_list)

    # BKT mastery level lookup
    mastery = db.query(StudentTopicMastery).filter(
        StudentTopicMastery.student_id == current_user.id,
        StudentTopicMastery.topic == selected_topic
    ).first()
    p_known = mastery.p_known if mastery else 0.25

    # Determine BKT-lite target difficulty list
    if p_known < 0.35:
        diffs = [1, 2]
    elif p_known > 0.75:
        diffs = [4, 5]
    else:
        diffs = [3]

    # Find questions of the matching topic and difficulty
    question = db.query(Question).filter(
        Question.subject == subject.lower(),
        Question.topic == selected_topic,
        Question.difficulty.in_(diffs)
    ).order_by(func.random()).first()

    # Fallback to any question in selected topic
    if not question:
        question = db.query(Question).filter(
            Question.subject == subject.lower(),
            Question.topic == selected_topic
        ).order_by(func.random()).first()

    # Fallback to any question in subject matching ELO-based target diff
    if not question:
        target_diff = get_elo_difficulty(student_elo)
        question = db.query(Question).filter(
            Question.subject == subject.lower(),
            Question.difficulty == target_diff
        ).order_by(func.random()).first()

    # Absolute fallback
    if not question:
        question = db.query(Question).filter(
            Question.subject == subject.lower()
        ).order_by(func.random()).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions available for this subject."
        )

    return {
        "id": question.id,
        "subject": question.subject,
        "topic": question.topic,
        "question_text": question.question_text,
        "difficulty": question.difficulty,
        "type": question.type,
        "options": question.options,
        "student_elo": student_elo,
        "p_known": p_known
    }


# Micro-lessons dictionary mapping topics to concepts
MICRO_LESSONS = {
    # Physics
    "kinematics": "Kinematics describes motion. The three key equations of motion for constant acceleration are: v = u + at, s = ut + 0.5at^2, and v^2 = u^2 + 2as. Remember to check your units!",
    "laws of motion": "Newton's laws of motion: 1st Law (Inertia) - objects remain at rest/motion unless forced to change. 2nd Law (F = ma) - force equals mass times acceleration. 3rd Law - every action has an equal and opposite reaction.",
    "work and energy": "Work is force times displacement (W = F * d * cos(theta)). Kinetic Energy is 0.5 * m * v^2. Potential Energy is m * g * h. Total mechanical energy is conserved in a closed system.",
    "gravitation": "Newton's law of gravitation states F = G * m1 * m2 / r^2. Acceleration due to gravity at earth surface is g = G * M / R^2 (~9.8 m/s^2).",
    "thermodynamics": "The 1st Law is conservation of energy (dU = dQ - dW). The 2nd Law states entropy of an isolated system always increases. Heat flows naturally from hot to cold.",
    "modern physics": "Modern Physics covers Einstein's relativity (E = mc^2), quantum mechanics, and atomic structures. Energy is quantized in packets called photons (E = h * f).",
    
    # Math
    "sets and functions": "A Set is a collection of distinct elements. The intersection (A ∩ B) contains common elements. A Function maps each input to exactly one output.",
    "algebra": "Algebra deals with equations. To solve for x, isolate the variable by performing inverse operations on both sides (e.g. if 2x + 3 = 13, subtract 3, then divide by 2).",
    "calculus": "Calculus studies change. The derivative represents the slope or rate of change (e.g. d/dx of x^2 is 2x). Integration calculates the area under a curve.",
    "probability": "Probability measures likelihood: P(A) = favorable outcomes / total outcomes. For independent events, P(A and B) = P(A) * P(B). Conditional probability is P(A|B) = P(A and B) / P(B).",
    "coordinate geometry": "Coordinate geometry locates points on a grid. The distance between (x1, y1) and (x2, y2) is sqrt((x2-x1)^2 + (y2-y1)^2). The slope of a line is (y2-y1)/(x2-x1).",
    
    # Data Structures
    "arrays": "Arrays store elements in contiguous memory. Accessing by index is O(1), but searching or inserting in an unsorted array takes O(N) time.",
    "stacks": "Stacks are LIFO (Last In First Out) structures. Push and Pop operations are O(1) and occur at the same end (the top). Used in function calls and history backtracks.",
    "queues": "Queues are FIFO (First In First Out) structures. Enqueue occurs at the rear, Dequeue occurs at the front. Both are O(1). Used in print jobs and CPU scheduling.",
    "linked lists": "Linked Lists consist of nodes containing data and a next pointer. Accessing is O(N) since you must traverse. Insertion at head is O(1).",
    "complexity": "Big O complexity measures how algorithm execution time or memory scale with input size N. Standard ranks: O(1) < O(log N) < O(N) < O(N log N) < O(N^2).",
    "binary trees": "Binary Trees are structures where each node has at most 2 children. In-order traversal of a Binary Search Tree (left-root-right) visits keys in sorted ascending order.",
    "sorting": "Sorting arranges items. Bubble/Insertion/Selection sorts are O(N^2). Merge and Heap Sorts are guaranteed O(N log N). Quick Sort is O(N log N) average, O(N^2) worst case.",
    "searching": "Searching finds keys. Binary Search works on sorted arrays and takes O(log N) time by repeatedly halving the search interval.",
    "hashing": "Hashing maps keys to indexes in a table. Average search/insert time is O(1). Collisions can be resolved using chaining or open addressing.",
    "graphs": "Graphs consist of Vertices and Edges. Traversals include BFS (Breadth-First Search using a Queue) and DFS (Depth-First Search using recursion/Stack).",
    "avl trees": "AVL Trees are self-balancing binary search trees. The height difference of left and right subtrees (balance factor) cannot exceed 1. Rotations (LL, RR, LR, RL) restore balance.",
    "red-black trees": "Red-Black Trees are balanced search trees where nodes are colored red or black. Balancing rules ensure no path is more than twice as long as another.",
    "dynamic programming": "Dynamic Programming solves complex problems by breaking them into overlapping subproblems, solving each once, and storing solutions in a table (memoization/tabulation).",
    "graph algorithms": "Common graph algos include Dijkstra's (single-source shortest path, O(V^2) or O(E + V log V)) and Kruskal's/Prim's (minimum spanning trees).",
    "heaps": "Heaps are complete binary trees. A Max-Heap keeps the largest element at the root. Insertion and deletion (extract-max) take O(log N) time.",
    
    # English Literature
    "shakespearian plays": "William Shakespeare wrote tragedies (Hamlet, Macbeth), comedies (Midsummer Night's Dream), and histories. Tragedies usually depict the downfall of a noble hero.",
    "literary devices": "Literary devices enrich text. Simile compares using 'like/as'. Metaphor states one thing is another. Personification gives human traits to non-human elements.",
    "romantic poetry": "Romanticism (late 18th century) focused on nature, emotion, individualism, and imagination. Famous poets include Wordsworth, Coleridge, Keats, and Shelley.",
    "victorian novels": "Victorian novels (19th century) reflect industrial society, social classes, morality, and reform. Famous writers include Charles Dickens, George Eliot, and the Brontës.",
    "fables": "Fables are short stories featuring animals with human traits, designed to teach a moral lesson (e.g. Aesop's Fables).",
    "modernist literature": "Modernism (early 20th century) rejected traditional formats, using stream-of-consciousness, fragmented timelines, and existential themes (e.g. Virginia Woolf, James Joyce).",
    "tragedy": "Tragedy is a genre where characters encounter suffering and downfall, often due to a tragic flaw (hamartia) or fate, provoking catharsis (pity and fear) in the audience.",
    "poetic metres": "Poetic metre is the rhythmic structure of a verse. Iambic pentameter consists of five pairs of unstressed/stressed syllables (da-DUM da-DUM da-DUM da-DUM da-DUM).",
    "renaissance drama": "Renaissance drama (16th-17th century England) flourished under Elizabeth I and James I, featuring blank verse, complex plots, and moral ambiguity.",
    "satire": "Satire uses humor, irony, exaggeration, or ridicule to expose and criticize human vices, stupidity, or social conventions (e.g. Jonathan Swift).",
    "post-colonial criticism": "Post-colonial criticism analyzes the legacy of colonial rule, focus on identity, displacement, hybridity, and reclamation of voice by marginalized populations.",
    "structuralism": "Structuralism is a critical framework stating that cultural elements must be understood in terms of their relationship to a larger, overarching system or structure.",
    "existential drama": "Existential drama (e.g., Theatre of the Absurd) highlights the absurdity of human existence, lack of absolute truth, and the struggle to find meaning.",
    "narratology": "Narratology is the study of narrative structures, focusing on how stories are constructed, narrator types, perspective (focalisation), and plot layers.",
    "hermeneutics": "Hermeneutics is the theory and methodology of text interpretation, especially historical and philosophical texts, focusing on the cycle of understanding."
}


@router.get("/pathway")
def get_learning_pathway(
    subject: str = Query(..., description="Subject of the quiz: e.g. data structures, mathematics, english literature"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Ensure database is seeded
    seed_questions(db)

    # Query all unique topics for the subject
    topics = db.query(Question.topic).filter(Question.subject == subject.lower()).distinct().all()
    topic_list = [t[0] for t in topics]
    
    # Query student's performance for this subject
    performances = db.query(StudentPerformance).join(
        Question, StudentPerformance.question_id == Question.id
    ).filter(
        StudentPerformance.student_id == current_user.id,
        Question.subject == subject.lower()
    ).all()
    
    topic_stats = {topic: {"correct": 0, "total": 0} for topic in topic_list}
    for perf in performances:
        q = db.query(Question).filter(Question.id == perf.question_id).first()
        if q and q.topic in topic_stats:
            topic_stats[q.topic]["total"] += 1
            if perf.correct:
                topic_stats[q.topic]["correct"] += 1
                
    pathway = []
    for topic in topic_list:
        stats = topic_stats[topic]
        accuracy = (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0.0
        
        # Scheduler logic:
        # If accuracy < 0.7 or total attempts < 3, recommend fundamentals. Otherwise, recommend word problems.
        if accuracy < 0.7 or stats["total"] < 3:
            next_lesson = f"{topic} Fundamentals"
            status = "In Progress" if stats["total"] > 0 else "Not Started"
        else:
            next_lesson = f"{topic} Word Problems"
            status = "Mastered"
            
        # BKT & Spaced Repetition calculation
        mastery = db.query(StudentTopicMastery).filter(
            StudentTopicMastery.student_id == current_user.id,
            StudentTopicMastery.topic == topic
        ).first()
        p_known = mastery.p_known if mastery else 0.25
        last_practiced = mastery.last_practiced if mastery else None

        if last_practiced:
            if last_practiced.tzinfo is None:
                t_days = (datetime.now() - last_practiced).total_seconds() / 86400.0
            else:
                t_days = (datetime.now(timezone.utc) - last_practiced).total_seconds() / 86400.0
        else:
            t_days = 99.0

        strength = 2.0 + 8.0 * p_known
        retention = math.exp(-t_days / strength)
        review_recommended = (retention < 0.6)

        pathway.append({
            "topic": topic,
            "accuracy": round(accuracy * 100, 1),
            "attempts": stats["total"],
            "correct": stats["correct"],
            "next_lesson": next_lesson,
            "status": status,
            "review_recommended": review_recommended,
            "retention": round(retention * 100, 1),
            "p_known": round(p_known, 3),
            "last_practiced": last_practiced.isoformat() if last_practiced else None
        })
        
    return {
        "subject": subject,
        "student_id": current_user.id,
        "pathway": pathway
    }


def evaluate_short_answer_semantically(question_text: str, model_answer: str, student_answer: str, topic: str) -> dict:
    """
    Evaluate a student's short answer against the model answer semantically.
    Checks for misconceptions and provides feedback.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Normalise
    student_norm = student_answer.strip().lower()
    model_norm = model_answer.strip().lower()
    
    # Check if Gemini API is configured
    from ..config import settings
    import google.generativeai as genai
    
    use_real = False
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
        use_real = True
        
    if use_real:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
            prompt = (
                f"Question: {question_text}\n"
                f"Correct Model Answer: {model_answer}\n"
                f"Student's Answer: {student_answer}\n\n"
                "Evaluate the student's answer semantically. Check for correct understanding. "
                "If they show a clear misconception (e.g. wrong organelle, inverted direction/sign, or confused terminology), "
                "flag correct=false, explain the misconception in 'misconception_detected', and provide helpful 'feedback'. "
                "Otherwise if it is correct, return correct=true, misconception_detected=null, and generic encouraging 'feedback'. "
                "You must respond ONLY with a JSON object in this format:\n"
                "{\n"
                '  "correct": boolean,\n'
                '  "misconception_detected": "string or null",\n'
                '  "feedback": "string"\n'
                "}"
            )
            response = model.generate_content(prompt)
            result = json.loads(response.text.strip())
            return {
                "correct": bool(result.get("correct", False)),
                "misconception_detected": result.get("misconception_detected"),
                "feedback": result.get("feedback", "No feedback provided.")
            }
        except Exception as e:
            logger.error(f"Semantic grading with Gemini failed: {e}. Falling back.", exc_info=True)
            
    # Local fallback / Keyword matching
    # Let's check for specific distractor patterns
    misconception_detected = None
    correct = False
    
    # Misconception check: Photosynthesis vs Mitochondria
    if "photosynthesis" in question_text.lower() or "photosynthesis" in model_norm:
        if "mitochondria" in student_norm:
            misconception_detected = "Did you mix up mitochondria with chloroplasts? Photosynthesis occurs in chloroplasts."
        elif "chloroplast" in student_norm:
            correct = True
            
    # Misconception check: Newton's 1st law vs Inertia
    if "newton" in question_text.lower() or "1st law" in question_text.lower() or "first law" in question_text.lower():
        if "net force" in student_norm and "zero" in student_norm:
            # But did they mention inertia or stay at rest?
            if "inertia" in student_norm or "rest" in student_norm or "motion" in student_norm:
                correct = True
            else:
                misconception_detected = "Missing the core concept of inertia or staying at rest/motion unless acted upon."
        elif "inertia" in student_norm:
            correct = True
            
    # General keyword scoring fallback
    if not correct and not misconception_detected:
        # Extract key words (length > 3, exclude common stop words)
        stop_words = {"what", "is", "the", "are", "and", "for", "with", "from", "that", "this", "these", "those"}
        model_words = [w.strip(".,?!()") for w in model_norm.split() if w.strip(".,?!()") not in stop_words and len(w) > 3]
        # Split student answer into normalized tokens
        student_tokens = set(w.strip(".,?!()") for w in student_norm.split())
        
        if model_words:
            matched = [w for w in model_words if w in student_tokens]
            match_ratio = len(matched) / len(model_words)
            if match_ratio >= 0.5:
                correct = True
                
    feedback = "Correct! Great job." if correct else "Incorrect."
    if misconception_detected:
        feedback = f"Incorrect. Hint: {misconception_detected}"
    elif not correct:
        feedback = "Incorrect. Hint: Review the key concepts of the topic or study the micro-lesson below."
        
    return {
        "correct": correct,
        "misconception_detected": misconception_detected,
        "feedback": feedback
    }


@router.post("/answer")
async def submit_answer(
    question_id: int,
    student_answer: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id, elo=1200)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Verify answer & Perform semantic evaluation for SHORT questions
    is_correct = False
    misconception_detected = None
    feedback_msg = ""
    
    if question.type == "SHORT":
        eval_res = evaluate_short_answer_semantically(
            question_text=question.question_text,
            model_answer=question.answer,
            student_answer=student_answer,
            topic=question.topic
        )
        is_correct = eval_res["correct"]
        misconception_detected = eval_res["misconception_detected"]
        feedback_msg = eval_res["feedback"]
    else:
        is_correct = (student_answer.strip().lower() == question.answer.strip().lower())
        feedback_msg = "Great job!" if is_correct else "Study hard and try again!"

    # Elo-lite adjustment logic
    # "correct answer on hard question = +20 ELO, wrong on easy = -20"
    old_elo = profile.elo
    elo_change = 0
    if is_correct:
        if question.difficulty >= 3: # Hard question
            elo_change = 20
        else:
            elo_change = 10
    else:
        if question.difficulty <= 2: # Easy question
            elo_change = -20
        else:
            elo_change = -10

    new_elo = max(old_elo + elo_change, 500) # Floor ELO at 500
    profile.elo = new_elo

    # Record performance
    perf = StudentPerformance(
        student_id=current_user.id,
        question_id=question.id,
        correct=is_correct
    )
    db.add(perf)
    db.flush()

    # BKT-lite Mastery Update
    mastery = db.query(StudentTopicMastery).filter(
        StudentTopicMastery.student_id == current_user.id,
        StudentTopicMastery.topic == question.topic
    ).first()
    if not mastery:
        mastery = StudentTopicMastery(
            student_id=current_user.id,
            topic=question.topic,
            p_known=0.25
        )
        db.add(mastery)
        db.flush()
    
    guess = 0.2
    slip = 0.1
    learn_rate = 0.15
    p_known = mastery.p_known
    
    if is_correct:
        p_known_updated = (p_known * (1 - slip)) / ((p_known * (1 - slip)) + ((1 - p_known) * guess))
    else:
        p_known_updated = (p_known * slip) / ((p_known * slip) + ((1 - p_known) * (1 - guess)))
        
    p_known_new = p_known_updated + (1 - p_known_updated) * learn_rate
    mastery.p_known = max(0.01, min(0.99, p_known_new))
    mastery.last_practiced = datetime.now(timezone.utc)

    # Log Activity
    log = ActivityLog(
        user_id=current_user.id,
        role="student",
        action_type="quiz_attempt",
        metadata_json={
            "subject": question.subject,
            "topic": question.topic,
            "correct": is_correct,
            "elo_change": elo_change,
            "new_elo": new_elo,
            "p_known": mastery.p_known
        },
        related_id=str(question.id)
    )
    db.add(log)

    # Check mistakes/streak on this topic
    triggered_micro_lesson = None
    topic_key = question.topic.lower().strip()
    
    # Query last attempts for this topic
    last_attempts_topic = db.query(StudentPerformance).join(
        Question, StudentPerformance.question_id == Question.id
    ).filter(
        StudentPerformance.student_id == current_user.id,
        Question.topic == question.topic
    ).order_by(StudentPerformance.attempt_time.desc(), StudentPerformance.id.desc()).limit(3).all()
    
    # 1. 3 correct in a row -> Increase ELO/Difficulty extra boost
    if is_correct and len(last_attempts_topic) >= 3 and all(a.correct for a in last_attempts_topic):
        profile.elo = profile.elo + 30
        feedback_msg = f"{feedback_msg} Excellent! 3 correct in a row. Difficulty boosted (+30 ELO)!"
        
    # 2. 2 incorrect in a row -> Trigger micro-lesson
    if not is_correct and len(last_attempts_topic) >= 2 and not last_attempts_topic[0].correct and not last_attempts_topic[1].correct:
        triggered_micro_lesson = MICRO_LESSONS.get(
            topic_key,
            f"Keep practicing! Focus on studying the core concepts of {question.topic} to improve your score."
        )
        feedback_msg = f"{feedback_msg} Tip: Review the triggered micro-lesson below to help you clear doubts."

    # Check for Quiz Streak Master (Global)
    last_attempts = db.query(StudentPerformance).filter(
        StudentPerformance.student_id == current_user.id
    ).order_by(StudentPerformance.attempt_time.desc(), StudentPerformance.id.desc()).limit(3).all()

    if len(last_attempts) >= 3 and all(a.correct for a in last_attempts):
        existing_badge = db.query(Achievement).filter(
            Achievement.user_id == current_user.id,
            Achievement.badge_name == "Quiz Streak Master"
        ).first()
        if not existing_badge:
            badge = Achievement(
                user_id=current_user.id,
                badge_name="Quiz Streak Master",
                description="Answered 3 quiz questions correctly in a row!",
                points=50
            )
            db.add(badge)

    db.commit()

    # Broadcast update
    await sse_manager.broadcast({
        "event": "quiz_completed",
        "student_name": current_user.name,
        "correct": is_correct,
        "subject": question.subject
    })

    return {
        "correct": is_correct,
        "correct_answer": question.answer,
        "old_elo": old_elo,
        "new_elo": profile.elo,
        "elo_change": profile.elo - old_elo,
        "feedback": feedback_msg,
        "misconception_detected": misconception_detected,
        "p_known": mastery.p_known,
        "triggered_micro_lesson": triggered_micro_lesson
    }


@router.get("/analytics/{student_id}")
def get_analytics(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Ensure current user is student themselves, or teacher/admin
    if current_user.id != student_id and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    performances = db.query(StudentPerformance, Question).join(
        Question, StudentPerformance.question_id == Question.id
    ).filter(StudentPerformance.student_id == student_id).all()

    if not performances:
        return {"total_attempts": 0, "topics": {}}

    topic_stats = {}
    for perf, q in performances:
        if q.topic not in topic_stats:
            topic_stats[q.topic] = {"correct": 0, "total": 0}
        topic_stats[q.topic]["total"] += 1
        if perf.correct:
            topic_stats[q.topic]["correct"] += 1

    topic_analytics = {}
    for topic, stats in topic_stats.items():
        topic_analytics[topic] = {
            "correct_attempts": stats["correct"],
            "total_attempts": stats["total"],
            "accuracy": round((stats["correct"] / stats["total"]) * 100, 2)
        }

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    student_elo = profile.elo if profile else 1200

    return {
        "student_id": student_id,
        "student_elo": student_elo,
        "total_attempts": len(performances),
        "overall_accuracy": round((sum(s["correct"] for s in topic_stats.values()) / len(performances)) * 100, 2),
        "topics": topic_analytics
    }


@router.get("/generate")
def generate_quiz(
    subject: str = Query(..., description="Subject: e.g. data structures, mathematics, english literature"),
    level: str = Query(..., description="Level: easy, medium, hard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Ensure database is seeded
    seed_questions(db)

    # Determine difficulties
    lvl = level.lower()
    if lvl == "easy":
        diffs = [1, 2]
    elif lvl == "medium":
        diffs = [3]
    elif lvl == "hard":
        diffs = [4, 5]
    else:
        diffs = [1, 2, 3, 4, 5]

    questions = db.query(Question).filter(
        Question.subject == subject.lower(),
        Question.difficulty.in_(diffs)
    ).order_by(func.random()).limit(20).all()

    # Fallback to any questions in subject if not enough
    if len(questions) < 20:
        extra_questions = db.query(Question).filter(
            Question.subject == subject.lower(),
            ~Question.id.in_([q.id for q in questions])
        ).order_by(func.random()).limit(20 - len(questions)).all()
        questions.extend(extra_questions)

    # If still not enough, raise 404
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this subject")

    return [
        {
            "id": q.id,
            "subject": q.subject,
            "topic": q.topic,
            "question_text": q.question_text,
            "difficulty": q.difficulty,
            "type": q.type,
            "options": q.options,
            "explanation": q.explanation
        }
        for q in questions
    ]


@router.post("/submit-quiz")
async def submit_quiz(
    data: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id, elo=1200)
        db.add(profile)
        db.flush()

    old_elo = profile.elo
    total_questions = len(data.answers)
    correct_count = 0
    elo_change = 0

    performances = []
    
    for answer_data in data.answers:
        q = db.query(Question).filter(Question.id == answer_data.question_id).first()
        if not q:
            continue
        
        is_correct = (str(answer_data.answer_index).strip() == str(q.answer).strip())
        if is_correct:
            correct_count += 1
            if q.difficulty >= 4:
                elo_change += 5
            elif q.difficulty == 3:
                elo_change += 3
            else:
                elo_change += 2
        else:
            if q.difficulty >= 4:
                elo_change -= 2
            elif q.difficulty == 3:
                elo_change -= 3
            else:
                elo_change -= 5

        # Record performance
        perf = StudentPerformance(
            student_id=current_user.id,
            question_id=q.id,
            correct=is_correct
        )
        db.add(perf)
        performances.append(perf)

    # Bound new ELO
    new_elo = max(old_elo + elo_change, 500)
    profile.elo = new_elo

    # Log single activity for the quiz
    log = ActivityLog(
        user_id=current_user.id,
        role="student",
        action_type="quiz_attempt",
        metadata_json={
            "subject": data.subject,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "accuracy": round((correct_count / total_questions * 100), 1) if total_questions > 0 else 0.0,
            "elo_change": elo_change,
            "new_elo": new_elo
        },
        related_id=f"quiz-{int(datetime.now().timestamp())}"
    )
    db.add(log)

    # Check for streak achievements
    if correct_count == total_questions and total_questions >= 20:
        existing_badge = db.query(Achievement).filter(
            Achievement.user_id == current_user.id,
            Achievement.badge_name == "Perfect Quiz Master"
        ).first()
        if not existing_badge:
            badge = Achievement(
                user_id=current_user.id,
                badge_name="Perfect Quiz Master",
                description=f"Scored a perfect 100% on a 20-question {data.subject} quiz!",
                points=100
            )
            db.add(badge)

    db.commit()

    # Broadcast via SSE
    await sse_manager.broadcast({
        "event": "quiz_completed",
        "student_name": current_user.name,
        "correct": correct_count >= (total_questions / 2),
        "subject": data.subject
    })

    return {
        "correctCount": correct_count,
        "totalQuestions": total_questions,
        "accuracy": round((correct_count / total_questions * 100), 1) if total_questions > 0 else 0.0,
        "old_elo": old_elo,
        "new_elo": new_elo,
        "elo_change": elo_change
    }


# Admin Question Management APIs
from .auth import RoleChecker
from fastapi import UploadFile, File
import os
import json

@router.get("/questions")
def list_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    query = db.query(Question)
    if subject:
        query = query.filter(Question.subject == subject.lower())
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "questions": [
            {
                "id": q.id,
                "subject": q.subject,
                "topic": q.topic,
                "question_text": q.question_text,
                "difficulty": q.difficulty,
                "type": q.type,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation
            } for q in items
        ]
    }

@router.post("/questions")
def create_question(
    q_data: QuizQuestionSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    new_q = Question(
        subject=q_data.subject.lower(),
        topic=q_data.topic,
        question_text=q_data.question_text,
        difficulty=q_data.difficulty,
        type=q_data.type,
        options=q_data.options,
        answer=q_data.answer,
        explanation=q_data.explanation
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    
    # Sync with JSON file to make changes persistent in git/data folder
    sync_db_questions_to_json(db)
    
    return {"success": True, "question_id": new_q.id}

@router.delete("/questions/{q_id}")
def delete_question(
    q_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(q)
    db.commit()
    
    # Sync with JSON file
    sync_db_questions_to_json(db)
    
    return {"success": True, "message": "Question deleted successfully"}

@router.post("/questions/upload")
async def upload_questions_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    try:
        content = await file.read()
        questions_data = json.loads(content.decode("utf-8"))
        
        # Basic validation
        if not isinstance(questions_data, list):
            raise HTTPException(status_code=400, detail="JSON must be an array of questions")
            
        # Delete old questions and load new ones
        db.query(Question).delete()
        
        for q_data in questions_data:
            new_q = Question(
                subject=q_data["subject"].lower(),
                topic=q_data["topic"],
                question_text=q_data["question_text"],
                difficulty=q_data["difficulty"],
                type=q_data.get("type", "MCQ"),
                options=q_data.get("options"),
                answer=q_data["answer"],
                explanation=q_data.get("explanation")
            )
            db.add(new_q)
            
        db.commit()
        
        # Save to file
        sync_db_questions_to_json(db)
        
        return {"success": True, "count": len(questions_data)}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to load questions: {str(e)}")

def sync_db_questions_to_json(db: Session):
    try:
        questions = db.query(Question).all()
        data = [
            {
                "subject": q.subject,
                "topic": q.topic,
                "question_text": q.question_text,
                "difficulty": q.difficulty,
                "type": q.type,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation
            } for q in questions
        ]
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(backend_dir, "data", "quiz_bank.json")
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Failed to sync database questions to JSON file: {e}")


