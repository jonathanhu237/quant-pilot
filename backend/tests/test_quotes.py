from urllib.error import URLError

import pytest

from schemas.market import StockQuote
from services import quotes


def make_tencent_line(
    symbol: str = "600519",
    name: str = "Kweichow Moutai",
    price: str = "1689.50",
    previous_close: str = "1675.00",
    field_31: str | None = None,
    field_32: str | None = None,
    total_fields: int = 33,
) -> str:
    parts = [""] * total_fields
    parts[1] = name
    parts[2] = symbol
    parts[3] = price
    parts[4] = previous_close
    if field_31 is not None and total_fields > 31:
        parts[31] = field_31
    if field_32 is not None and total_fields > 32:
        parts[32] = field_32
    return f'v_sh{symbol}="' + "~".join(parts) + '";'


def test_normalize_symbol_strips_whitespace() -> None:
    assert quotes.normalize_symbol(" 600519 \n") == "600519"


def test_normalize_symbol_preserves_clean_input() -> None:
    assert quotes.normalize_symbol("000001") == "000001"


@pytest.mark.parametrize(
    ("symbol", "expected"),
    [
        ("600519", "sh600519"),
        ("900901", "sh900901"),
        ("000001", "sz000001"),
        ("200001", "sz200001"),
        ("300001", "sz300001"),
        ("400001", "bj400001"),
        ("800001", "bj800001"),
    ],
)
def test_to_tencent_symbol_maps_supported_prefixes(
    symbol: str,
    expected: str,
) -> None:
    assert quotes.to_tencent_symbol(symbol) == expected


def test_to_tencent_symbol_rejects_unsupported_prefix() -> None:
    with pytest.raises(ValueError, match="Unsupported A-share symbol: 100000"):
        quotes.to_tencent_symbol("100000")


def test_safe_float_parses_valid_value() -> None:
    assert quotes.safe_float("12.34") == pytest.approx(12.34)


def test_safe_float_returns_default_for_invalid_value() -> None:
    assert quotes.safe_float("not-a-number") == 0.0


def test_safe_float_uses_custom_default() -> None:
    assert quotes.safe_float(None, default=-1.5) == pytest.approx(-1.5)


def test_parse_tencent_quote_line_extracts_fields() -> None:
    line = make_tencent_line(field_31="14.50", field_32="0.87")

    quote = quotes.parse_tencent_quote_line(line)

    assert quote == StockQuote(
        symbol="600519",
        name="Kweichow Moutai",
        price=1689.5,
        change_pct=0.87,
        change_amount=14.5,
    )


@pytest.mark.parametrize(
    "line",
    [
        'v_sh600519="";',
        'sh600519="1~2~3~4~5";',
        'v_sh600519=1~2~3~4~5;',
    ],
)
def test_parse_tencent_quote_line_returns_none_for_invalid_lines(
    line: str,
) -> None:
    assert quotes.parse_tencent_quote_line(line) is None


def test_parse_tencent_quote_line_returns_none_for_too_few_fields() -> None:
    assert quotes.parse_tencent_quote_line('v_sh600519="1~2~3~4";') is None


def test_parse_tencent_quote_line_falls_back_when_derived_fields_missing() -> None:
    line = make_tencent_line(total_fields=31)

    quote = quotes.parse_tencent_quote_line(line)

    assert quote is not None
    assert quote.symbol == "600519"
    assert quote.change_amount == pytest.approx(14.5)
    assert quote.change_pct == pytest.approx((1689.5 - 1675.0) / 1675.0 * 100)


def test_parse_tencent_quote_line_uses_symbol_from_prefix_when_payload_missing() -> None:
    parts = [""] * 33
    parts[1] = "Name Only"
    parts[3] = "10.0"
    parts[4] = "9.0"
    line = 'v_sh000001="' + "~".join(parts) + '";'

    quote = quotes.parse_tencent_quote_line(line)

    assert quote is not None
    assert quote.symbol == "sh000001"
    assert quote.name == "Name Only"


def test_fetch_quotes_returns_empty_list_without_network(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    def fake_urlopen(*_args, **_kwargs):  # pragma: no cover - defensive guard
        nonlocal called
        called = True
        raise URLError("network should not be used")

    monkeypatch.setattr(quotes, "urlopen", fake_urlopen)

    assert quotes.fetch_quotes([]) == []
    assert called is False


def test_fetch_quotes_dedupes_and_preserves_input_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    responses = {
        "sh600519": make_tencent_line(symbol="600519", name="Moutai", price="1689.50", previous_close="1675.00", field_31="14.50", field_32="0.87"),
        "sz000001": make_tencent_line(symbol="000001", name="Ping An", price="12.30", previous_close="12.10", field_31="0.20", field_32="1.65"),
    }
    requests: list[str] = []

    class FakeResponse:
        def __init__(self, body: str) -> None:
            self._body = body

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def read(self) -> bytes:
            return self._body.encode("gbk")

    def fake_urlopen(request, timeout=10):
        requests.append(request.full_url)
        return FakeResponse(";".join(responses.values()) + ";")

    monkeypatch.setattr(quotes, "urlopen", fake_urlopen)

    result = quotes.fetch_quotes([" 600519 ", "000001", "600519", "", "000001"])

    assert requests == [
        "https://qt.gtimg.cn/q=sh600519,sz000001",
    ]
    assert [quote.symbol for quote in result] == ["600519", "000001"]
    assert [quote.name for quote in result] == ["Moutai", "Ping An"]


def test_fetch_quote_map_returns_dict_keyed_by_symbol(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        quotes,
        "fetch_quotes",
        lambda symbols: [
            StockQuote(
                symbol=symbol,
                name=f"Quote {symbol}",
                price=float(index + 1),
                change_pct=0.0,
                change_amount=0.0,
            )
            for index, symbol in enumerate(symbols)
        ],
    )

    result = quotes.fetch_quote_map(["600519", "000001"])

    assert set(result) == {"600519", "000001"}
    assert result["600519"].name == "Quote 600519"
    assert result["000001"].price == pytest.approx(2.0)
