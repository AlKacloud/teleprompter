#!/usr/bin/env python3
"""Собирает ссылку на голосовой суфлёр с уже загруженным сценарием и переводом.

Вход: JSON-файл вида
    {"title": "Название", "lines": [["English line", "Русский перевод"], ...]}
Строки должны быть уже разбиты под ширину iPad (одна строка = одна строка суфлёра).

Выход: ссылка https://alkacloud.github.io/teleprompter/#s=...
Данные сжаты (deflate) и лежат после «#»: эта часть ссылки не уходит на сервер GitHub.

Запуск: python3 make_link.py сценарий.json
"""
import base64
import json
import logging
import sys
import zlib

BASE = "https://alkacloud.github.io/teleprompter/#s="
log = logging.getLogger("make_link")


def make_link(data: dict) -> str:
    """Проверяет сценарий и возвращает ссылку с упакованными данными."""
    lines = data.get("lines")
    if not isinstance(lines, list) or not lines:
        raise ValueError("в файле нет списка lines")
    for i, pair in enumerate(lines, 1):
        if not (isinstance(pair, list) and len(pair) == 2 and str(pair[0]).strip()):
            raise ValueError(f"строка {i}: нужна пара [английский, русский]")
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    packer = zlib.compressobj(9, zlib.DEFLATED, -15)  # «сырой» deflate — его понимает DecompressionStream в Safari
    packed = packer.compress(raw) + packer.flush()
    log.info("строк: %d, текст: %d байт, в ссылке: %d байт", len(lines), len(raw), len(packed))
    return BASE + base64.urlsafe_b64encode(packed).decode("ascii").rstrip("=")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
    if len(sys.argv) != 2:
        log.error("Запуск: python3 make_link.py сценарий.json")
        return 2
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            data = json.load(f)
        print(make_link(data))
        return 0
    except (OSError, ValueError) as e:
        log.error("Не получилось собрать ссылку: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
