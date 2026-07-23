from fastapi.testclient import TestClient

from app.main import app, store


client = TestClient(app)

DEMO_LOGIN = {"username": "admin", "password": "garage123"}


def setup_function() -> None:
    store.reset()


def sign_in() -> dict[str, str]:
    response = client.post("/api/auth/login", json=DEMO_LOGIN)
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_health_is_public_but_workspace_needs_a_session() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    anonymous = client.get("/api/workspace")
    assert anonymous.status_code == 401

    workspace = client.get("/api/workspace", headers=sign_in())
    assert workspace.status_code == 200
    body = workspace.json()
    assert body["customers"]
    assert body["vehicles"]
    assert body["invoices"]
    assert body["settings"]["garageName"]


def test_login_rejects_bad_credentials_and_logout_revokes_token() -> None:
    rejected = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert rejected.status_code == 401

    headers = sign_in()
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["username"] == "admin"

    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_customer_vehicle_and_work_order_flow() -> None:
    headers = sign_in()
    customer = client.post(
        "/api/customers",
        json={"name": "Test Driver", "phone": "+91 90000 00000", "email": "driver@example.com"},
        headers=headers,
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
        headers=headers,
    )
    assert vehicle.status_code == 201
    vehicle_id = vehicle.json()["id"]

    job = client.post(
        "/api/work-orders",
        json={"vehicleId": vehicle_id, "serviceType": "First service", "estimatedCost": 2500},
        headers=headers,
    )
    assert job.status_code == 201
    assert job.json()["customer_id"] == customer_id


def test_stock_adjustment_rejects_negative_inventory() -> None:
    headers = sign_in()
    item = client.get("/api/inventory", headers=headers).json()[0]
    rejected = client.post(
        f"/api/inventory/{item['id']}/adjustments",
        json={"quantityDelta": -(item["quantity_on_hand"] + 1), "reason": "Invalid issue"},
        headers=headers,
    )
    assert rejected.status_code == 422

    accepted = client.post(
        f"/api/inventory/{item['id']}/adjustments",
        json={"quantityDelta": 4, "reason": "Supplier delivery"},
        headers=headers,
    )
    assert accepted.status_code == 200
    assert accepted.json()["quantity_on_hand"] == item["quantity_on_hand"] + 4


def test_invoice_totals_and_payment_flow() -> None:
    headers = sign_in()
    customer_id = client.get("/api/customers", headers=headers).json()[0]["id"]

    invoice = client.post(
        "/api/invoices",
        json={
            "customerId": customer_id,
            "status": "issued",
            "taxRate": 18,
            "discount": 100,
            "lineItems": [
                {"description": "Synthetic oil change", "quantity": 1, "unitPrice": 2450},
                {"description": "Labour", "quantity": 2, "unitPrice": 600},
            ],
        },
        headers=headers,
    )
    assert invoice.status_code == 201
    body = invoice.json()
    assert body["subtotal"] == 3650.0
    assert body["total"] == round((3650 - 100) * 1.18, 2)
    assert body["balance_due"] == body["total"]

    overpay = client.post(
        f"/api/invoices/{body['id']}/payments",
        json={"amount": body["total"] + 1, "method": "card"},
        headers=headers,
    )
    assert overpay.status_code == 422

    payment = client.post(
        f"/api/invoices/{body['id']}/payments",
        json={"amount": body["total"], "method": "upi"},
        headers=headers,
    )
    assert payment.status_code == 200
    settled = payment.json()
    assert settled["status"] == "paid"
    assert settled["balance_due"] == 0
