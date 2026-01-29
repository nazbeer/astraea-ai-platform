import redis, json, os

r = redis.Redis.from_url(os.getenv("REDIS_URL"))

def get_memory(session_id):
    return [json.loads(x) for x in r.lrange(session_id, -10, -1)]

def add_memory(session_id, role, content):
    r.rpush(session_id, json.dumps({"role": role, "content": content}))
    r.ltrim(session_id, -10, -1)
