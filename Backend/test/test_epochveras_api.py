import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
SYM = "TEST_SYMBOL_" + uuid.uuid4().hex[:6]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# Binance proxy
class TestProxy:
    def test_exchange_info(self, s):
        r = s.get(f"{API}/binance/exchangeInfo", timeout=30)
        assert r.status_code == 200
        perps = [x for x in r.json()["symbols"] if x["contractType"] == "PERPETUAL" and x["status"] == "TRADING"]
        assert len(perps) > 300

    def test_klines(self, s):
        r = s.get(f"{API}/binance/klines", params={"symbol": "BTCUSDT", "interval": "15m", "limit": 1500}, timeout=30)
        assert r.status_code == 200
        assert len(r.json()) == 1500

    def test_klines_endtime_paging(self, s):
        r = s.get(f"{API}/binance/klines", params={"symbol": "BTCUSDT", "interval": "1d", "limit": 1500, "endTime": 1600000000000}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data and data[-1][0] <= 1600000000000

    def test_ticker(self, s):
        r = s.get(f"{API}/binance/ticker/24hr", timeout=30)
        assert r.status_code == 200
        assert any(t["symbol"] == "BTCUSDT" for t in r.json())

    def test_premium(self, s):
        r = s.get(f"{API}/binance/premiumIndex", timeout=30)
        assert r.status_code == 200
        assert "lastFundingRate" in r.json()[0]

    def test_funding_info(self, s):
        r = s.get(f"{API}/binance/fundingInfo", timeout=30)
        assert r.status_code == 200
        assert "fundingIntervalHours" in r.json()[0]

    @pytest.mark.parametrize("p", ["order", "account", "foo/bar", "../x"])
    def test_disallowed(self, s, p):
        r = s.get(f"{API}/binance/{p}", timeout=30)
        assert r.status_code == 404

    def test_bad_symbol_errors(self, s):
        r = s.get(f"{API}/binance/klines", params={"symbol": "NOPE", "interval": "1h"}, timeout=30)
        assert r.status_code == 400


# Drawings CRUD
class TestDrawings:
    def test_crud(self, s):
        did = "TEST_" + uuid.uuid4().hex
        d = {"id": did, "symbol": SYM, "type": "trend", "p1": {"t": 1, "p": 2.5}, "p2": {"t": 3, "p": 4}, "color": "#2962ff", "width": 2}
        r = s.put(f"{API}/drawings/{did}", json=d)
        assert r.status_code == 200 and r.json()["p1"]["p"] == 2.5
        lst = s.get(f"{API}/drawings", params={"symbol": SYM}).json()
        assert len(lst) == 1 and lst[0]["color"] == "#2962ff" and "_id" not in lst[0]
        d["color"] = "#f23645"
        s.put(f"{API}/drawings/{did}", json=d)
        lst = s.get(f"{API}/drawings", params={"symbol": SYM}).json()
        assert len(lst) == 1 and lst[0]["color"] == "#f23645"
        assert s.delete(f"{API}/drawings/{did}").status_code == 200
        assert s.get(f"{API}/drawings", params={"symbol": SYM}).json() == []

    def test_clear_by_symbol(self, s):
        for _ in range(2):
            did = "TEST_" + uuid.uuid4().hex
            s.put(f"{API}/drawings/{did}", json={"id": did, "symbol": SYM, "type": "hray"})
        r = s.delete(f"{API}/drawings", params={"symbol": SYM})
        assert r.json()["deleted"] == 2

    def test_invalid(self, s):
        r = s.put(f"{API}/drawings/x", json={"symbol": SYM})
        assert r.status_code == 422


# Alerts CRUD
class TestAlerts:
    def test_crud(self, s):
        r = s.post(f"{API}/alerts", json={"symbol": "TEST_ALERTSYM", "price": 123.45, "direction": "up"})
        assert r.status_code == 200
        a = r.json()
        aid = a["id"]
        try:
            assert a["status"] == "active" and a["price"] == 123.45
            assert any(x["id"] == aid for x in s.get(f"{API}/alerts").json())
            p = s.patch(f"{API}/alerts/{aid}", json={"status": "triggered", "triggered_at": "2026-01-01T00:00:00Z"})
            assert p.status_code == 200 and p.json()["status"] == "triggered" and "_id" not in p.json()
            got = [x for x in s.get(f"{API}/alerts").json() if x["id"] == aid][0]
            assert got["status"] == "triggered"
        finally:
            s.delete(f"{API}/alerts/{aid}")
        assert not any(x["id"] == aid for x in s.get(f"{API}/alerts").json())

    def test_patch_missing(self, s):
        assert s.patch(f"{API}/alerts/nope-xyz", json={"status": "active"}).status_code == 404

    def test_invalid(self, s):
        assert s.post(f"{API}/alerts", json={"symbol": "X"}).status_code == 422


# Settings
class TestSettings:
    def test_roundtrip(self, s):
        k = "TEST_key_" + uuid.uuid4().hex[:6]
        assert s.get(f"{API}/settings/{k}").json()["value"] is None
        s.put(f"{API}/settings/{k}", json={"value": {"a": [1, 2]}})
        assert s.get(f"{API}/settings/{k}").json()["value"] == {"a": [1, 2]}
