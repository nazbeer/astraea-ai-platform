import math

def calculator(expression: str):
    """
    Evaluates a mathematical expression.
    Safe evaluation of basic math operations.
    """
    allowed_names = {
        k: v for k, v in math.__dict__.items() if not k.startswith("__")
    }
    allowed_names.update({"abs": abs, "round": round})
    
    code = compile(expression, "<string>", "eval")
    for name in code.co_names:
        if name not in allowed_names:
            raise NameError(f"Use of {name} is not allowed")
    
    return eval(code, {"__builtins__": {}}, allowed_names)

def search(query: str):
    """
    Simulates a web search since we don't have a real search API key configured yet.
    """
    return f"Simulated search results for: {query}. (Integrate Serper/DuckDuckGo here for real results)"

# Tool Definitions for OpenAI
TOOLS_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Calculate a math expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate, e.g. '2 + 2' or 'math.sqrt(16)'",
                    }
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
         "type": "function",
        "function": {
            "name": "rag_retrieve",
            "description": "Retrieve information from the internal knowledge base",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The query to search in knowledge base",
                    }
                },
                "required": ["query"],
            },
        },
    }
]

AVAILABLE_TOOLS = {
    "calculator": calculator,
    "search": search,
    # rag_retrieve is handled specially in main.py usually, or we wrap it here if we pass the RAG instance
}
