import logging, uuid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

def logger():
    return logging.getLogger("astraea")

def trace_id():
    return str(uuid.uuid4())
