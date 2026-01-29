import redis, os, time

r = redis.Redis.from_url(os.getenv("REDIS_URL"))

def enforce_rate_limit(key: str, limit: int):
    now = int(time.time())
    bucket = f"rl:{key}:{now//60}"
    count = r.incr(bucket)
    if count == 1:
        r.expire(bucket, 60)
    if count > limit:
        raise Exception("Rate limit exceeded")
