import os

from dotenv import load_dotenv

load_dotenv()


def get_setting(name: str) -> str | None:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else None
