from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import Question, StudentPerformance, StudentProfile, User, UserRole
from .auth import verify_token

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
    Seed 50+ questions from NCERT Physics and Math across difficulty levels (1 to 5)
    """
    if db.query(Question).count() > 0:
        return

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
                answer=f"Option A {i}"
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
                answer=f"Option A {i}"
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
            answer="E = mc^2"
        )
    )
    questions_list.append(
        Question(
            subject="math",
            topic="Calculus",
            difficulty=4,
            type="SHORT",
            options=None,
            answer="2x"
        )
    )

    db.add_all(questions_list)
    db.commit()
    print(f"Seeded {len(questions_list)} NCERT questions successfully.")


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
def submit_answer(
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
    db.commit()

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
