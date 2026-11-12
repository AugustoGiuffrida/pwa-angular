import pytest
from fastapi.testclient import TestClient

from app.main import create_app

TASK_ID = "4e2590d7-4ab5-4aef-8e13-ff063cf82c3c"
TASK_URL = f"/api/tasks/{TASK_ID}"
TASK = {"title": "Conectar la API", "completed": False}


@pytest.fixture
def database_path(tmp_path, monkeypatch):
    path = tmp_path / "data" / "tasks.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    return path


@pytest.fixture
def client(database_path):
    with TestClient(create_app()) as test_client:
        yield test_client


def test_empty_database_returns_empty_list(client, database_path):
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}
    assert database_path.is_file()


def test_put_creates_then_replaces(client):
    response = client.put(TASK_URL, json=TASK)
    assert response.status_code == 201
    assert response.json() == {"id": TASK_ID, **TASK}

    changed = {"title": "Conectar la API real", "completed": True}
    response = client.put(TASK_URL, json=changed)
    assert response.status_code == 200
    assert client.get(TASK_URL).json() == {"id": TASK_ID, **changed}
    assert client.get("/api/tasks").json() == {"tasks": [{"id": TASK_ID, **changed}]}


def test_repeated_put_does_not_duplicate(client):
    assert client.put(TASK_URL, json=TASK).status_code == 201
    for _ in range(3):
        assert client.put(TASK_URL, json=TASK).status_code == 200
    assert len(client.get("/api/tasks").json()["tasks"]) == 1


def test_title_is_trimmed(client):
    response = client.put(TASK_URL, json={"title": "  Probar  ", "completed": False})
    assert response.json()["title"] == "Probar"


def test_list_keeps_creation_order_after_updates(client):
    ids = [f"00000000-0000-0000-0000-00000000000{n}" for n in (3, 1, 2)]
    for id in ids:
        client.put(f"/api/tasks/{id}", json={"title": id, "completed": False})
    client.put(f"/api/tasks/{ids[0]}", json={"title": "editada", "completed": True})
    assert [task["id"] for task in client.get("/api/tasks").json()["tasks"]] == ids


def test_delete_is_idempotent(client):
    client.put(TASK_URL, json=TASK)
    for _ in range(2):
        response = client.delete(TASK_URL)
        assert response.status_code == 204
        assert response.content == b""
    assert client.get(TASK_URL).status_code == 404
    assert client.get("/api/tasks").json() == {"tasks": []}


def test_data_survives_restart(database_path):
    with TestClient(create_app()) as first:
        first.put(TASK_URL, json=TASK)
    with TestClient(create_app()) as second:
        assert second.get(TASK_URL).json() == {"id": TASK_ID, **TASK}


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"title": "", "completed": False},
        {"title": "   ", "completed": False},
        {"title": "Sin estado"},
        {"title": "Estado como texto", "completed": "true"},
        {"title": 123, "completed": False},
        {"title": "Con id", "completed": False, "id": TASK_ID},
        [],
    ],
)
def test_invalid_body_is_rejected_without_changes(client, body):
    client.put(TASK_URL, json=TASK)
    assert client.put(TASK_URL, json=body).status_code == 422
    assert client.get(TASK_URL).json() == {"id": TASK_ID, **TASK}


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_invalid_uuid(client, method):
    kwargs = {"json": TASK} if method == "put" else {}
    assert getattr(client, method)("/api/tasks/no-es-un-uuid", **kwargs).status_code == 422


def test_uuid_is_normalized(client):
    assert client.put(f"/api/tasks/{TASK_ID.upper()}", json=TASK).status_code == 201
    assert client.put(TASK_URL, json=TASK).status_code == 200
    assert client.get("/api/tasks").json()["tasks"][0]["id"] == TASK_ID


@pytest.mark.parametrize(
    "origin",
    ["http://localhost:4200", "http://localhost:8080", "http://127.0.0.1:4200", "http://127.0.0.1:8080"],
)
@pytest.mark.parametrize("method", ["PUT", "DELETE"])
def test_cors_preflight(client, origin, method):
    response = client.options(
        TASK_URL,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert method in response.headers["access-control-allow-methods"]


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        TASK_URL,
        headers={"Origin": "https://otro.example.com", "Access-Control-Request-Method": "PUT"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_responses_are_not_stored_by_the_browser(client):
    assert client.get("/api/tasks").headers["cache-control"] == "no-store"
    assert client.put(TASK_URL, json=TASK).headers["cache-control"] == "no-store"
    assert client.delete(TASK_URL).headers["cache-control"] == "no-store"
