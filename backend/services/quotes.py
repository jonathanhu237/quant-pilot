from urllib.request import Request, urlopen

from schemas.market import StockQuote

TENCENT_QUOTES_URL = "https://qt.gtimg.cn/q="


def normalize_symbol(symbol: str) -> str:
    return symbol.strip()


def to_tencent_symbol(symbol: str) -> str:
    normalized = normalize_symbol(symbol)

    if normalized.startswith(("6", "9")):
        return f"sh{normalized}"
    if normalized.startswith(("0", "2", "3")):
        return f"sz{normalized}"
    if normalized.startswith(("4", "8")) or normalized.startswith("92"):
        return f"bj{normalized}"

    raise ValueError(f"Unsupported A-share symbol: {symbol}")


def safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_tencent_quote_line(line: str) -> StockQuote | None:
    if not line.startswith("v_") or '="' not in line:
        return None

    raw_symbol, payload = line.split('="', 1)
    payload = payload.rstrip('";')
    if not payload:
        return None

    parts = payload.split("~")
    if len(parts) < 5:
        return None

    symbol = parts[2] or raw_symbol[2:]
    name = parts[1] or symbol
    price = safe_float(parts[3])
    previous_close = safe_float(parts[4])
    change_amount = safe_float(parts[31], price - previous_close) if len(parts) > 31 else price - previous_close
    if len(parts) > 32:
        change_pct = safe_float(parts[32])
    else:
        change_pct = ((price - previous_close) / previous_close * 100) if previous_close else 0.0

    return StockQuote(
        symbol=symbol,
        name=name,
        price=price,
        change_pct=change_pct,
        change_amount=change_amount,
    )


def fetch_quotes(symbols: list[str]) -> list[StockQuote]:
    normalized_symbols = []
    seen: set[str] = set()
    for symbol in symbols:
        normalized = normalize_symbol(symbol)
        if not normalized or normalized in seen:
            continue
        normalized_symbols.append(normalized)
        seen.add(normalized)

    if not normalized_symbols:
        return []

    request_symbols = [to_tencent_symbol(symbol) for symbol in normalized_symbols]
    request = Request(
        f"{TENCENT_QUOTES_URL}{','.join(request_symbols)}",
        headers={
            "Referer": "https://gu.qq.com/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=10) as response:
        body = response.read().decode("gbk", errors="ignore")

    quote_map: dict[str, StockQuote] = {}
    for line in body.split(";"):
        quote = parse_tencent_quote_line(line.strip())
        if quote is None:
            continue
        quote_map[quote.symbol] = quote

    return [quote_map[symbol] for symbol in normalized_symbols if symbol in quote_map]


def fetch_quote_map(symbols: list[str]) -> dict[str, StockQuote]:
    return {quote.symbol: quote for quote in fetch_quotes(symbols)}
