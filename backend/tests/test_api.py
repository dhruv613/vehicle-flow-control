from fastapi.testclient import TestClient

from app.main import app, store


client = TestClient(app)


def setup_function() -> None:
    store.reset()


def test_health_and_workspace_are_available() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    workspace = client.get("/api/workspace")
    assert workspace.status_code == 200
    body = workspace.json()
    assert body["customers"]
    assert body["vehicles"]
    assert body["settings"]["garageName"]


def test_customer_vehicle_and_work_order_flow() -> None:
    customer = client.post(
        "/api/customers",
        json={"name": "Test Driver", "phone": "+91 90000 00000", "email": "driver@example.com"},
    )
    assert customer.status_code == 201
    customer_id = customer.json()["id"]

    vehicle = client.post(
        "/api/vehicles",
        json={
            "customerId": customer_id,
            "make": "Mahindra",
            "model": "XUV700",
            "year": 2024,
            "registrationNumber": "KA01TT9000",
        },
    )
    assert vehicle.status_code == 201
    vehicle_id = vehicle.json()["id"]

    job = client.post(
        "/api/work-orders",
        json={"vehicleId": vehicle_id, "serviceType": "First service", "estimatedCost": 2500},
    )
    assert job.status_code == 201
    assert job.json()["customer_id"] == customer_id


def test_stock_adjustment_rejects_negative_inventory() -> None:
    item = client.get("/api/inventory").json()[0]
    rejected = client.post(
        f"/api/inventory/{item['id']}/adjustments",
        json={"quantityDelta": -(item["quantity_on_hand"] + 1), "reason": "Invalid issue"},
    )
    assert rejected.status_code == 422

    accepted = client.post(
        f"/api/inventory/{item['id']}/adjustments",
        json={"quantityDelta": 4, "reason": "Supplier delivery"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["quantity_on_hand"] == item["quantity_on_hand"] + 4
