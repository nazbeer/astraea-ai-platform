import faiss, numpy as np
from app.llm import embed

class RAG:
    def __init__(self, docs):
        self.docs = docs
        vectors = [embed(d) for d in docs]
        self.index = faiss.IndexFlatL2(len(vectors[0]))
        self.index.add(np.array(vectors).astype("float32"))

    def retrieve(self, query, k=3):
        qv = np.array([embed(query)]).astype("float32")
        _, ids = self.index.search(qv, k)
        return [self.docs[i] for i in ids[0]]
