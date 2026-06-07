import os
from typing import List, Dict, Any
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# LangChain Embeddings Protocol
class SimpleEmbeddings:
    def __init__(self, use_hf: bool = True):
        from ..config import settings
        if not settings.GEMINI_API_KEY or os.environ.get("OFFLINE_EMBEDDINGS") == "true":
            use_hf = False
            
        self.use_hf = use_hf
        self.embeddings = None
        if use_hf:
            try:
                from langchain_community.embeddings import HuggingFaceEmbeddings
                self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            except Exception as e:
                print(f"Failed to load HuggingFaceEmbeddings: {e}. Falling back to simple embeddings.")
                self.use_hf = False

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if self.use_hf and self.embeddings:
            return self.embeddings.embed_documents(texts)
        # Fallback: simple hash/deterministic floats
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        if self.use_hf and self.embeddings:
            return self.embeddings.embed_query(text)
        return self._embed(text)

    def __call__(self, text: str) -> List[float]:
        return self.embed_query(text)

    def _embed(self, text: str) -> List[float]:
        # Return a simple deterministic 384-dim vector based on characters
        vector = [0.0] * 384
        for i, char in enumerate(text[:384]):
            vector[i] = float(ord(char)) / 256.0
        # normalize
        norm = sum(x*x for x in vector) ** 0.5
        if norm > 0:
            vector = [x / norm for x in vector]
        return vector


INDEX_PATH = "faiss_index"

# Sample NCERT data to bootstrap RAG pipeline
NCERT_SAMPLES = [
    {
        "text": "Newton's First Law of Motion: A body remains in a state of rest or of uniform motion in a straight line unless compelled by an external force to change that state. This is also called the Law of Inertia.",
        "subject": "Physics",
        "topic": "Laws of Motion",
        "chapter": "Chapter 5"
    },
    {
        "text": "Newton's Second Law of Motion: The rate of change of momentum of a body is directly proportional to the applied force and takes place in the direction in which the force acts. Mathematically, Force = mass * acceleration (F = ma).",
        "subject": "Physics",
        "topic": "Laws of Motion",
        "chapter": "Chapter 5"
    },
    {
        "text": "Newton's Third Law of Motion: To every action, there is always an equal and opposite reaction. If body A exerts a force on body B, body B exerts an equal and opposite force on body A.",
        "subject": "Physics",
        "topic": "Laws of Motion",
        "chapter": "Chapter 5"
    },
    {
        "text": "Kinematics equations for uniform acceleration describe the motion of objects. The equations are: 1) v = u + at, where v is final velocity, u is initial velocity, a is acceleration, and t is time. 2) s = ut + 0.5 * a * t^2, where s is displacement. 3) v^2 = u^2 + 2as.",
        "subject": "Physics",
        "topic": "Motion in a Straight Line",
        "chapter": "Chapter 3"
    },
    {
        "text": "Chemical Kinetics is the branch of chemistry that deals with the rates of chemical reactions, the factors affecting these rates (such as concentration, temperature, catalyst), and the mechanisms by which they occur.",
        "subject": "Chemistry",
        "topic": "Chemical Kinetics",
        "chapter": "Chapter 4"
    },
    {
        "text": "Electrochemistry is the study of production of electricity from energy released during spontaneous chemical reactions and the use of electrical energy to bring about non-spontaneous chemical transformations.",
        "subject": "Chemistry",
        "topic": "Electrochemistry",
        "chapter": "Chapter 3"
    },
    {
        "text": "Calculus - Derivative of a Function: The derivative represents the rate of change of a function with respect to its independent variable. The derivative of x^n with respect to x is n * x^(n-1). For example, d(x^2)/dx = 2x.",
        "subject": "Math",
        "topic": "Limits and Derivatives",
        "chapter": "Chapter 13"
    },
    {
        "text": "Matrices: A matrix is an ordered rectangular array of numbers or functions. The numbers or functions are called the elements or the entries of the matrix. The dimension of a matrix with m rows and n columns is written as m x n.",
        "subject": "Math",
        "topic": "Matrices",
        "chapter": "Chapter 3"
    }
]

class RAGService:
    _db = None

    @classmethod
    def get_db(cls):
        if cls._db is None:
            embeddings = SimpleEmbeddings(use_hf=True)
            if os.path.exists(INDEX_PATH):
                try:
                    cls._db = FAISS.load_local(INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
                    print("Loaded existing FAISS index from disk.")
                except Exception as e:
                    print(f"Error loading FAISS index: {e}. Reinitializing.")
                    cls._db = cls.initialize_index(embeddings)
            else:
                cls._db = cls.initialize_index(embeddings)
        return cls._db

    @classmethod
    def initialize_index(cls, embeddings=None):
        if embeddings is None:
            embeddings = SimpleEmbeddings(use_hf=True)

        documents = []
        metadatas = []

        # 1. Parse any PDFs in a data folder if they exist
        pdf_dir = os.path.join("backend", "data")
        os.makedirs(pdf_dir, exist_ok=True)
        pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith(".pdf")]

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

        if pdf_files:
            for pdf_file in pdf_files:
                path = os.path.join(pdf_dir, pdf_file)
                try:
                    reader = PdfReader(path)
                    text = ""
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"

                    chunks = splitter.split_text(text)
                    for i, chunk in enumerate(chunks):
                        documents.append(chunk)
                        metadatas.append({
                            "source": pdf_file,
                            "chunk_id": f"{pdf_file}_{i}",
                            "subject": "Physics" if "physics" in pdf_file.lower() else "Chemistry" if "chem" in pdf_file.lower() else "Math"
                        })
                except Exception as e:
                    print(f"Error reading PDF {pdf_file}: {e}")

        # 2. Seed with sample NCERT content if no PDFs are parsed or to ensure coverage
        for sample in NCERT_SAMPLES:
            documents.append(sample["text"])
            metadatas.append({
                "source": f"NCERT_{sample['subject']}",
                "chunk_id": f"sample_{sample['topic'].replace(' ', '_').lower()}",
                "subject": sample["subject"],
                "topic": sample["topic"],
                "chapter": sample["chapter"]
            })

        db = FAISS.from_texts(documents, embeddings, metadatas=metadatas)
        
        # Save FAISS index
        os.makedirs(INDEX_PATH, exist_ok=True)
        db.save_local(INDEX_PATH)
        print(f"Initialized and persisted FAISS index with {len(documents)} document chunks.")
        return db

    @classmethod
    def retrieve_context(cls, query: str, k: int = 4) -> List[Dict[str, Any]]:
        db = cls.get_db()
        results = db.similarity_search_with_score(query, k=k)
        retrieved = []
        for doc, score in results:
            retrieved.append({
                "text": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
        return retrieved
