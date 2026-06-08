import sys

from loguru import logger


def configure_logging() -> None:
    logger.remove()
    logger.add(sys.stderr, level="INFO", enqueue=True, backtrace=False, diagnose=False)
