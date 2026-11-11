import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class CaseFileModel(Base):
    __tablename__ = "case_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    page_count = Column(Integer, default=1)
    raw_text = Column(Text, nullable=True)
    extracted_text_by_pages = Column(JSON, nullable=True)  # List of {page: int, text: str}
    analysis = Column(JSON, nullable=True)  # CaseAnalysis parsed data
    created_at = Column(DateTime, default=datetime.utcnow)

    simulations = relationship("SimulationSessionModel", back_populates="case_file", cascade="all, delete-orphan")


class SimulationSessionModel(Base):
    __tablename__ = "simulation_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_file_id = Column(String(36), ForeignKey("case_files.id"), nullable=False)
    user_role = Column(String(50), nullable=False)
    current_stage = Column(String(50), default="introduccion_juez")
    status = Column(String(50), default="en_curso")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case_file = relationship("CaseFileModel", back_populates="simulations")
    interventions = relationship("InterventionModel", back_populates="session", cascade="all, delete-orphan", order_by="InterventionModel.created_at")
    decisions = relationship("UserDecisionModel", back_populates="session", cascade="all, delete-orphan")
    evaluation = relationship("AcademicEvaluationModel", back_populates="session", uselist=False, cascade="all, delete-orphan")


class InterventionModel(Base):
    __tablename__ = "interventions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("simulation_sessions.id"), nullable=False)
    speaker_role = Column(String(50), nullable=False)
    speaker_name = Column(String(100), nullable=False)
    stage = Column(String(50), nullable=False)
    text = Column(Text, nullable=False)
    is_user = Column(Boolean, default=False)
    model_3d_key = Column(String(50), default="persona1")
    options = Column(JSON, nullable=True)  # DecisionOption list in JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSessionModel", back_populates="interventions")


class UserDecisionModel(Base):
    __tablename__ = "user_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("simulation_sessions.id"), nullable=False)
    stage = Column(String(50), nullable=False)
    selected_option_id = Column(String(100), nullable=True)
    free_text_response = Column(Text, nullable=True)
    legal_consequence = Column(Text, nullable=True)
    fidelity_valid = Column(Boolean, default=True)
    fidelity_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSessionModel", back_populates="decisions")


class AcademicEvaluationModel(Base):
    __tablename__ = "academic_evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("simulation_sessions.id"), nullable=False, unique=True)
    academic_disclaimer = Column(Text, nullable=False)
    verdict = Column(String(200), nullable=False)
    ruling_summary = Column(Text, nullable=False)
    score_coherence = Column(Float, nullable=False)
    score_fidelity_to_facts = Column(Float, nullable=False)
    score_evidence_usage = Column(Float, nullable=False)
    final_feedback = Column(Text, nullable=False)
    strengths = Column(JSON, nullable=True)
    areas_for_improvement = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SimulationSessionModel", back_populates="evaluation")

