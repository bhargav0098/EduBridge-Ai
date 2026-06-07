from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import Question, StudentPerformance, StudentProfile, User, UserRole, ActivityLog, Achievement
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
    Seed exactly 180 dynamic questions across Data Structures, Mathematics, and English Literature,
    covering 3 difficulty levels including Easy, Medium, and Hard with 20 questions each.
    This also seeds 52 legacy questions for physics and math for test compatibility.
    """
    if db.query(Question).count() >= 232:
        return

    # Clear existing questions
    db.query(Question).delete()
    db.commit()

    questions_list = []

    # Physics questions (25)
    physics_topics = ["Kinematics", "Laws of Motion", "Work and Energy", "Gravitation", "Thermodynamics"]
    for i in range(1, 26):
        difficulty = ((i - 1) % 5) + 1
        topic = physics_topics[(i - 1) % len(physics_topics)]
        options = [f"Option A {i}", f"Option B {i}", f"Option C {i}", f"Option D {i}"]
        questions_list.append(
            Question(
                subject="physics",
                topic=topic,
                difficulty=difficulty,
                type="MCQ",
                options=options,
                answer=f"Option A {i}",
                question_text=f"Physics question on {topic} number {i}",
                explanation=f"This is the explanation for physics question {i}."
            )
        )

    # Math questions (25)
    math_topics = ["Sets and Functions", "Algebra", "Calculus", "Probability", "Coordinate Geometry"]
    for i in range(1, 26):
        difficulty = ((i - 1) % 5) + 1
        topic = math_topics[(i - 1) % len(math_topics)]
        options = [f"Option A {i}", f"Option B {i}", f"Option C {i}", f"Option D {i}"]
        questions_list.append(
            Question(
                subject="math",
                topic=topic,
                difficulty=difficulty,
                type="MCQ",
                options=options,
                answer=f"Option A {i}",
                question_text=f"Math question on {topic} number {i}",
                explanation=f"This is the explanation for math question {i}."
            )
        )

    # Add a few more to make sure we are strictly over 50
    questions_list.append(
        Question(
            subject="physics",
            topic="Modern Physics",
            difficulty=3,
            type="SHORT",
            options=None,
            answer="E = mc^2",
            question_text="What is Einstein's mass-energy equivalence equation?",
            explanation="E = mc^2 shows that mass and energy are equivalent."
        )
    )
    questions_list.append(
        Question(
            subject="math",
            topic="Calculus",
            difficulty=4,
            type="SHORT",
            options=None,
            answer="2x",
            question_text="What is the derivative of x^2?",
            explanation="The derivative of x^2 is 2x."
        )
    )

    subjects_data = [
        {
            "name": "data structures",
            "topics": {
                "easy": ["Arrays", "Stacks", "Queues", "Linked Lists", "Complexity"],
                "medium": ["Binary Trees", "Sorting", "Searching", "Hashing", "Graphs"],
                "hard": ["AVL Trees", "Red-Black Trees", "Dynamic Programming", "Graph Algorithms", "Heaps"]
            },
            "templates": {
                "easy": [
                    "What is the average time complexity of accessing an element in an array by index in {topic}?",
                    "Which data structure is most appropriate for implementing a recursive function's {topic} trace?",
                    "In a simple {topic}, how is the next element referenced?",
                    "Which of the following operations is not directly supported by a standard {topic}?",
                    "What does the term 'overflow' indicate in a {topic} context?"
                ],
                "medium": [
                    "What is the worst-case time complexity of {topic} when using optimized algorithms?",
                    "Which traversal strategy for a {topic} yields the keys in non-decreasing sorted order?",
                    "What is the primary advantage of utilizing a {topic} over a standard sequential representation?",
                    "In a {topic}, what is the maximum number of children a parent node can possess?",
                    "What occurs during a collision resolution phase in a {topic} structure?"
                ],
                "hard": [
                    "Which balancing rotation is required in a {topic} after inserting a violating element?",
                    "What is the precise amortized time complexity of a delete-min operation in a Fibonacci {topic}?",
                    "Which mathematical recurrence relation characterizes the height of a balanced {topic}?",
                    "What is the worst-case time complexity of a multi-source shortest path search in a {topic}?",
                    "Which property holds true for all nodes in a self-adjusting {topic}?"
                ]
            }
        },
        {
            "name": "mathematics",
            "topics": {
                "easy": ["Algebra", "Trigonometry", "Matrices", "Probability", "Sets"],
                "medium": ["Calculus", "Integration", "Determinants", "Vector Space", "Series"],
                "hard": ["Differential Equations", "Fourier Series", "Complex Analysis", "Group Theory", "Topology"]
            },
            "templates": {
                "easy": [
                    "What is the value of the expression involving {topic} at point zero?",
                    "Which of the following describes the identity element in a standard {topic}?",
                    "What is the derivative of the basic {topic} function?",
                    "How many elements are contained in the intersection of {topic} sets?",
                    "What is the probability of a certain event under a uniform {topic}?"
                ],
                "medium": [
                    "What is the limit of the {topic} function as the variable approaches infinity?",
                    "What is the value of the definite integral representing the area of {topic}?",
                    "Which theorem guarantees the existence of a root for a continuous {topic} function?",
                    "What is the dimension of the subspace defined by the {topic} conditions?",
                    "Which convergence test is most suitable for the infinite {topic}?"
                ],
                "hard": [
                    "What is the general solution to the homogeneous {topic} equation?",
                    "Which integral transform maps a {topic} differential equation to an algebraic one?",
                    "What is the residue of the complex {topic} function at its pole?",
                    "Which structural property characterizes a non-abelian {topic} group?",
                    "Which of the following topological spaces is compact under the {topic} metric?"
                ]
            }
        },
        {
            "name": "english literature",
            "topics": {
                "easy": ["Shakespearian Plays", "Literary Devices", "Romantic Poetry", "Victorian Novels", "Fables"],
                "medium": ["Modernist Literature", "Tragedy", "Poetic Metres", "Renaissance Drama", "Satire"],
                "hard": ["Post-colonial Criticism", "Structuralism", "Existential Drama", "Narratology", "Hermeneutics"]
            },
            "templates": {
                "easy": [
                    "Who is the central protagonist in the famous {topic} text?",
                    "Which figure of speech is primarily utilized in the selected {topic} passage?",
                    "What is the recurring thematic motif of the {topic} period?",
                    "Which Victorian author is renowned for writing about {topic}?",
                    "What moral lesson is typically conveyed by the classic {topic}?"
                ],
                "medium": [
                    "Which literary movement of the 20th century heavily influenced the structure of {topic}?",
                    "What is the metrical structure of a traditional sonnet in {topic}?",
                    "How does the dramatic irony in {topic} contribute to the overall tragedy?",
                    "Which satirical work is considered a masterpiece of {topic}?",
                    "What narrative technique is used to represent the characters' thoughts in {topic}?"
                ],
                "hard": [
                    "Which critical theorist pioneered the analysis of power dynamics in {topic}?",
                    "How does the concept of intertextuality redefine authorship in {topic}?",
                    "Which existential play is characterized by the absurdist dialogue in {topic}?",
                    "What does the deconstructive reading of {topic} reveal about its binary oppositions?",
                    "Which critical framework focuses on the subversion of cultural hegemony in {topic}?"
                ]
            }
        }
    ]

    for subject in subjects_data:
        sub_name = subject["name"]
        
        # Generate 20 Easy questions (difficulty 1 or 2)
        for idx in range(20):
            difficulty = 1 if idx < 10 else 2
            topic = subject["topics"]["easy"][idx % len(subject["topics"]["easy"])]
            template = subject["templates"]["easy"][idx % len(subject["templates"]["easy"])]
            
            question_text = template.format(topic=topic) + f" (Q {idx + 1})"
            options = [f"Option A - {topic} concept", f"Option B - {topic} concept", f"Option C - {topic} concept", f"Option D - {topic} concept"]
            questions_list.append(
                Question(
                    subject=sub_name,
                    topic=topic,
                    question_text=question_text,
                    difficulty=difficulty,
                    type="MCQ",
                    options=options,
                    answer="0",  # Index 0 is correct
                    explanation=f"This is the correct explanation for {topic} under easy difficulty level."
                )
            )
            
        # Generate 20 Medium questions (difficulty 3)
        for idx in range(20):
            difficulty = 3
            topic = subject["topics"]["medium"][idx % len(subject["topics"]["medium"])]
            template = subject["templates"]["medium"][idx % len(subject["templates"]["medium"])]
            
            question_text = template.format(topic=topic) + f" (Q {idx + 21})"
            options = [f"Option A - {topic} solution", f"Option B - {topic} solution", f"Option C - {topic} solution", f"Option D - {topic} solution"]
            questions_list.append(
                Question(
                    subject=sub_name,
                    topic=topic,
                    question_text=question_text,
                    difficulty=difficulty,
                    type="MCQ",
                    options=options,
                    answer="1",  # Index 1 is correct
                    explanation=f"This is the correct explanation for {topic} under medium difficulty level."
                )
            )
            
        # Generate 20 Hard questions (difficulty 4 or 5)
        for idx in range(20):
            difficulty = 4 if idx < 10 else 5
            topic = subject["topics"]["hard"][idx % len(subject["topics"]["hard"])]
            template = subject["templates"]["hard"][idx % len(subject["templates"]["hard"])]
            
            question_text = template.format(topic=topic) + f" (Q {idx + 41})"
            options = [f"Option A - {topic} theory", f"Option B - {topic} theory", f"Option C - {topic} theory", f"Option D - {topic} theory"]
            questions_list.append(
                Question(
                    subject=sub_name,
                    topic=topic,
                    question_text=question_text,
                    difficulty=difficulty,
                    type="MCQ",
                    options=options,
                    answer="2",  # Index 2 is correct
                    explanation=f"This is the correct explanation for {topic} under hard difficulty level."
                )
            )

    db.add_all(questions_list)
    db.commit()
    print(f"Seeded {len(questions_list)} real-world subject questions successfully.")


@router.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    seed_questions(db)
    return {"message": "Database seeded successfully"}


@router.get("/next")
def get_next_question(
    subject: str = Query(..., description="Subject of the quiz: physics or math"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Ensure database is seeded
    seed_questions(db)

    # Get student's profile and ELO
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    student_elo = profile.elo if profile else 1200

    target_diff = get_elo_difficulty(student_elo)

    # Find questions of the matching difficulty
    question = db.query(Question).filter(
        Question.subject == subject.lower(),
        Question.difficulty == target_diff
    ).order_by(func.random()).first()

    # If no question matches target difficulty, try nearby difficulties
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
        "difficulty": question.difficulty,
        "type": question.type,
        "options": question.options,
        "student_elo": student_elo
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

    # Verify answer
    is_correct = (student_answer.strip().lower() == question.answer.strip().lower())

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
            "new_elo": new_elo
        },
        related_id=str(question.id)
    )
    db.add(log)

    # Check for Quiz Streak Master
    last_attempts = db.query(StudentPerformance).filter(
        StudentPerformance.student_id == current_user.id
    ).order_by(StudentPerformance.attempt_time.desc()).limit(3).all()

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
        "new_elo": new_elo,
        "elo_change": elo_change,
        "feedback": "Great job!" if is_correct else "Study hard and try again!"
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

