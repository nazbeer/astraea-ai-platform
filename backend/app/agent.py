SYSTEM_PROMPT = """
You are Astraea, an enterprise AI assistant.
Use provided context when relevant.
Be precise and factual.
"""

def build_messages(user, memory, context):
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        msgs.append({"role": "system", "content": "\n".join(context)})
    msgs.extend(memory)
    msgs.append({"role": "user", "content": user})
    return msgs
