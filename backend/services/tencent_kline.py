import json
import re
from datetime import date

import requests


def fetch_kline_page(full_symbol: str, start_date: date, end_date: date) -> list[list[str]]:
    """Fetch one page (up to 640 rows) of front-adjusted daily kline data."""
    url = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
    params = {
        "_var": "kline_data",
        "param": (
            f"{full_symbol},day,{start_date.strftime('%Y-%m-%d')},"
            f"{end_date.strftime('%Y-%m-%d')},640,qfq"
        ),
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    json_str = re.sub(r"^[^=]+=", "", response.text).strip()
    payload = json.loads(json_str)
    rows = payload["data"][full_symbol].get("qfqday", [])
    # Some rows (ex-dividend days) have a 7th dict element — keep only first 6
    return [row[:6] for row in rows if len(row) >= 6]
