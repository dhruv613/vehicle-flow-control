"""FastAPI entry point for the local Motorwise Garage system.

The application intentionally starts with zero external infrastructure.  A
small JSON store is seeded on first boot, every mutation is validated with
Pydantic, and the same API can be reached from Expo Go over a LAN address.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from typing import Any, Literal

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import SessionAuth
from .config import settings
from .schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    CustomerCreate,
    CustomerUpdate,
    GarageSettingsUpdate,
    InventoryCreate,
    InventoryUpdate,
    InvoiceCreate,
    InvoiceUpdate,
    JobCreate,
    JobUpdate,
    LoginRequest,
    PaymentCreate,
    StockAdjustment,
    VehicleCreate,
    VehicleUpdate,
    request_data,
)
from .store import LocalStore


API = settings.api_prefix
store = LocalStore(settings.data_file, persist=settings.persist_data)
auth = SessionAuth(store, public_paths={"/", "/health", f"{API}/health", f"{API}/auth/login"})

# `apps/mobile/dist` appears after `npx expo export --platform web`; when it
# exists this one process serves both the API and the web application.
WEB_DIST = Path(__file__).resolve().parents[2] / "apps" / "mobile" / "dist"

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Local-first garage operations API for customers, vehicles, work orders, "
        "appointments, inventory and invoices. Sign in via POST /api/auth/login "
        "and send the returned token as an Authorization: Bearer header."
    ),
    dependencies=[Depends(auth.guard)],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def not_found(resource: str, resource_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{resource.title()} '{resource_id}' was not found.")


def require(name: str, resource_id: str) -> dict[str, Any]:
    row = store.get(name, resource_id)
    if row is None:
        raise not_found(name.rstrip("s"), resource_id)
    return row


def require_customer(customer_id: str) -> None:
    require("customers", customer_id)


def require_vehicle(vehicle_id: str) -> dict[str, Any]:
    return require("vehicles", vehicle_id)


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def sort_by_updated(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: row.get("updated_at", ""), reverse=True)


def next_number(collection: str, key: str, prefix: str, start: int) -> str:
    highest = start - 1
    for row in store.list(collection):
        value = str(row.get(key, ""))
        if value.startswith(prefix):
            try:
                highest = max(highest, int(value.removeprefix(prefix)))
            except ValueError:
                continue
    return f"{prefix}{highest + 1}"


def calculate_invoice(payload: dict[str, Any], previous: dict[str, Any] | None = None) -> dict[str, Any]:
    """Apply invoice totals server-side so clients cannot forge a balance."""
    combined = {**(previous or {}), **payload}
    line_items = []
    for item in combined.get("line_items", []):
        row = dict(item)
        row["total"] = round(float(row["quantity"]) * float(row["unit_price"]), 2)
        line_items.append(row)
    subtotal = round(sum(item["total"] for item in line_items), 2)
    discount = min(float(combined.get("discount", 0)), subtotal)
    tax_rate = float(combined.get("tax_rate", 0))
    tax_amount = round((subtotal - discount) * tax_rate / 100, 2)
    total = round(subtotal - discount + tax_amount, 2)
    amount_paid = float(combined.get("amount_paid", previous.get("amount_paid", 0) if previous else 0))
    return {
        **payload,
        "line_items": line_items,
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "total": total,
        "balance_due": max(round(total - amount_paid, 2), 0),
    }


@app.get("/", tags=["system"], include_in_schema=False)
def root() -> Any:
    if (WEB_DIST / "index.html").exists():
        return FileResponse(WEB_DIST / "index.html")
    return {"name": settings.app_name, "docs": "/docs", "health": "/health"}


@app.post(f"{API}/auth/login", tags=["auth"])
def login(payload: LoginRequest) -> dict[str, Any]:
    return auth.login(payload.username, payload.password)


@app.post(f"{API}/auth/logout", tags=["auth"])
def logout(request: Request) -> dict[str, str]:
    auth.logout(auth.bearer_token(request))
    return {"message": "Signed out."}


@app.get(f"{API}/auth/me", tags=["auth"])
def me(request: Request) -> dict[str, Any]:
    return request.state.user


@app.get("/health", tags=["system"])
@app.get(f"{API}/health", tags=["system"])
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "persistence": "json" if settings.persist_data else "memory",
        "timestamp": now_iso(),
    }


@app.get(f"{API}/customers", tags=["customers"])
def list_customers(search: str | None = Query(default=None, max_length=120)) -> list[dict[str, Any]]:
    rows = store.list("customers")
    if search:
        needle = search.casefold().strip()
        rows = [
            row
            for row in rows
            if needle in " ".join(str(row.get(key, "")) for key in ("name", "phone", "email")).casefold()
        ]
    return sort_by_updated(rows)


@app.post(f"{API}/customers", status_code=status.HTTP_201_CREATED, tags=["customers"])
def create_customer(payload: CustomerCreate) -> dict[str, Any]:
    return store.create("customers", request_data(payload), id_prefix="cus")


@app.get(f"{API}/customers/{{customer_id}}", tags=["customers"])
def get_customer(customer_id: str) -> dict[str, Any]:
    return require("customers", customer_id)


@app.patch(f"{API}/customers/{{customer_id}}", tags=["customers"])
def update_customer(customer_id: str, payload: CustomerUpdate) -> dict[str, Any]:
    require_customer(customer_id)
    return store.update("customers", customer_id, request_data(payload, partial=True))  # type: ignore[return-value]


@app.delete(f"{API}/customers/{{customer_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=["customers"])
def delete_customer(customer_id: str) -> Response:
    require_customer(customer_id)
    if any(vehicle["customer_id"] == customer_id for vehicle in store.list("vehicles")):
        raise HTTPException(
            status_code=409,
            detail="This customer still has vehicles. Reassign or delete those vehicles first.",
        )
    store.delete("customers", customer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(f"{API}/vehicles", tags=["vehicles"])
def list_vehicles(
    customer_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=120),
) -> list[dict[str, Any]]:
    rows = store.list("vehicles")
    if customer_id:
        rows = [row for row in rows if row["customer_id"] == customer_id]
    if status_filter:
        rows = [row for row in rows if row.get("status") == status_filter]
    if search:
        needle = search.casefold().strip()
        rows = [
            row
            for row in rows
            if needle in " ".join(str(row.get(key, "")) for key in ("make", "model", "registration_number", "vin")).casefold()
        ]
    return sort_by_updated(rows)


@app.post(f"{API}/vehicles", status_code=status.HTTP_201_CREATED, tags=["vehicles"])
def create_vehicle(payload: VehicleCreate) -> dict[str, Any]:
    row = request_data(payload)
    require_customer(row["customer_id"])
    if any(vehicle["registration_number"] == row["registration_number"] for vehicle in store.list("vehicles")):
        raise HTTPException(status_code=409, detail="A vehicle with that registration number already exists.")
    return store.create("vehicles", row, id_prefix="veh")


@app.get(f"{API}/vehicles/{{vehicle_id}}", tags=["vehicles"])
def get_vehicle(vehicle_id: str) -> dict[str, Any]:
    return require_vehicle(vehicle_id)


@app.patch(f"{API}/vehicles/{{vehicle_id}}", tags=["vehicles"])
def update_vehicle(vehicle_id: str, payload: VehicleUpdate) -> dict[str, Any]:
    require_vehicle(vehicle_id)
    changes = request_data(payload, partial=True)
    if "customer_id" in changes:
        require_customer(changes["customer_id"])
    if "registration_number" in changes:
        duplicate = next(
            (
                vehicle
                for vehicle in store.list("vehicles")
                if vehicle["id"] != vehicle_id and vehicle["registration_number"] == changes["registration_number"]
            ),
            None,
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="A vehicle with that registration number already exists.")
    return store.update("vehicles", vehicle_id, changes)  # type: ignore[return-value]


@app.delete(f"{API}/vehicles/{{vehicle_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=["vehicles"])
def delete_vehicle(vehicle_id: str) -> Response:
    require_vehicle(vehicle_id)
    if any(job["vehicle_id"] == vehicle_id for job in store.list("jobs")):
        raise HTTPException(status_code=409, detail="This vehicle has work orders and cannot be deleted.")
    store.delete("vehicles", vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(f"{API}/work-orders", tags=["work orders"])
def list_work_orders(
    vehicle_id: str | None = None,
    customer_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict[str, Any]]:
    rows = store.list("jobs")
    if vehicle_id:
        rows = [row for row in rows if row["vehicle_id"] == vehicle_id]
    if customer_id:
        rows = [row for row in rows if row.get("customer_id") == customer_id]
    if status_filter:
        rows = [row for row in rows if row.get("status") == status_filter]
    return sort_by_updated(rows)


@app.post(f"{API}/work-orders", status_code=status.HTTP_201_CREATED, tags=["work orders"])
def create_work_order(payload: JobCreate) -> dict[str, Any]:
    row = request_data(payload)
    vehicle = require_vehicle(row["vehicle_id"])
    customer_id = row.get("customer_id") or vehicle["customer_id"]
    require_customer(customer_id)
    row["customer_id"] = customer_id
    row["job_number"] = next_number("jobs", "job_number", "WO-", 1001)
    return store.create("jobs", row, id_prefix="job")


@app.get(f"{API}/work-orders/{{job_id}}", tags=["work orders"])
def get_work_order(job_id: str) -> dict[str, Any]:
    return require("jobs", job_id)


@app.patch(f"{API}/work-orders/{{job_id}}", tags=["work orders"])
def update_work_order(job_id: str, payload: JobUpdate) -> dict[str, Any]:
    require("jobs", job_id)
    changes = request_data(payload, partial=True)
    if "vehicle_id" in changes:
        vehicle = require_vehicle(changes["vehicle_id"])
        changes.setdefault("customer_id", vehicle["customer_id"])
    if "customer_id" in changes:
        require_customer(changes["customer_id"])
    return store.update("jobs", job_id, changes)  # type: ignore[return-value]


@app.delete(f"{API}/work-orders/{{job_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=["work orders"])
def delete_work_order(job_id: str) -> Response:
    require("jobs", job_id)
    store.delete("jobs", job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(f"{API}/appointments", tags=["appointments"])
def list_appointments(from_date: date | None = Query(default=None), to_date: date | None = Query(default=None)) -> list[dict[str, Any]]:
    rows = store.list("appointments")
    if from_date or to_date:
        filtered: list[dict[str, Any]] = []
        for row in rows:
            start = parse_timestamp(row.get("starts_at"))
            if start is None:
                continue
            item_date = start.date()
            if (from_date is None or item_date >= from_date) and (to_date is None or item_date <= to_date):
                filtered.append(row)
        rows = filtered
    return sorted(rows, key=lambda row: row.get("starts_at", ""))


@app.post(f"{API}/appointments", status_code=status.HTTP_201_CREATED, tags=["appointments"])
def create_appointment(payload: AppointmentCreate) -> dict[str, Any]:
    row = request_data(payload)
    vehicle = require_vehicle(row["vehicle_id"])
    require_customer(row["customer_id"])
    if vehicle["customer_id"] != row["customer_id"]:
        raise HTTPException(status_code=422, detail="The selected vehicle does not belong to that customer.")
    return store.create("appointments", row, id_prefix="apt")


@app.patch(f"{API}/appointments/{{appointment_id}}", tags=["appointments"])
def update_appointment(appointment_id: str, payload: AppointmentUpdate) -> dict[str, Any]:
    current = require("appointments", appointment_id)
    changes = request_data(payload, partial=True)
    customer_id = changes.get("customer_id", current["customer_id"])
    vehicle_id = changes.get("vehicle_id", current["vehicle_id"])
    vehicle = require_vehicle(vehicle_id)
    require_customer(customer_id)
    if vehicle["customer_id"] != customer_id:
        raise HTTPException(status_code=422, detail="The selected vehicle does not belong to that customer.")
    return store.update("appointments", appointment_id, changes)  # type: ignore[return-value]


@app.delete(f"{API}/appointments/{{appointment_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=["appointments"])
def delete_appointment(appointment_id: str) -> Response:
    require("appointments", appointment_id)
    store.delete("appointments", appointment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(f"{API}/inventory", tags=["inventory"])
def list_inventory(low_stock: bool = False, search: str | None = Query(default=None, max_length=120)) -> list[dict[str, Any]]:
    rows = store.list("inventory")
    if low_stock:
        rows = [row for row in rows if int(row["quantity_on_hand"]) <= int(row["reorder_level"])]
    if search:
        needle = search.casefold().strip()
        rows = [
            row
            for row in rows
            if needle in " ".join(str(row.get(key, "")) for key in ("name", "sku", "category", "supplier")).casefold()
        ]
    return sorted(rows, key=lambda row: (row["quantity_on_hand"] > row["reorder_level"], row["name"]))


@app.post(f"{API}/inventory", status_code=status.HTTP_201_CREATED, tags=["inventory"])
def create_inventory_item(payload: InventoryCreate) -> dict[str, Any]:
    row = request_data(payload)
    if any(item["sku"] == row["sku"] for item in store.list("inventory")):
        raise HTTPException(status_code=409, detail="An inventory item with that SKU already exists.")
    row["stock_movements"] = []
    return store.create("inventory", row, id_prefix="part")


@app.patch(f"{API}/inventory/{{item_id}}", tags=["inventory"])
def update_inventory_item(item_id: str, payload: InventoryUpdate) -> dict[str, Any]:
    require("inventory", item_id)
    changes = request_data(payload, partial=True)
    if "sku" in changes:
        duplicate = next((item for item in store.list("inventory") if item["id"] != item_id and item["sku"] == changes["sku"]), None)
        if duplicate:
            raise HTTPException(status_code=409, detail="An inventory item with that SKU already exists.")
    return store.update("inventory", item_id, changes)  # type: ignore[return-value]


@app.post(f"{API}/inventory/{{item_id}}/adjustments", tags=["inventory"])
def adjust_inventory(item_id: str, payload: StockAdjustment) -> dict[str, Any]:
    item = require("inventory", item_id)
    adjustment = request_data(payload)
    next_quantity = int(item["quantity_on_hand"]) + int(adjustment["quantity_delta"])
    if next_quantity < 0:
        raise HTTPException(status_code=422, detail="This adjustment would make stock negative.")
    movements = list(item.get("stock_movements", []))
    movements.append({"id": f"mov_{len(movements) + 1}", **adjustment, "at": now_iso()})
    return store.update("inventory", item_id, {"quantity_on_hand": next_quantity, "stock_movements": movements})  # type: ignore[return-value]


@app.delete(f"{API}/inventory/{{item_id}}", status_code=status.HTTP_204_NO_CONTENT, tags=["inventory"])
def delete_inventory_item(item_id: str) -> Response:
    require("inventory", item_id)
    store.delete("inventory", item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get(f"{API}/invoices", tags=["invoices"])
def list_invoices(status_filter: str | None = Query(default=None, alias="status")) -> list[dict[str, Any]]:
    rows = store.list("invoices")
    if status_filter:
        rows = [row for row in rows if row.get("status") == status_filter]
    return sorted(rows, key=lambda row: row.get("issued_at") or row.get("created_at", ""), reverse=True)


@app.post(f"{API}/invoices", status_code=status.HTTP_201_CREATED, tags=["invoices"])
def create_invoice(payload: InvoiceCreate) -> dict[str, Any]:
    row = request_data(payload)
    require_customer(row["customer_id"])
    if row.get("vehicle_id"):
        vehicle = require_vehicle(row["vehicle_id"])
        if vehicle["customer_id"] != row["customer_id"]:
            raise HTTPException(status_code=422, detail="The selected vehicle does not belong to that customer.")
    if row.get("job_id"):
        require("jobs", row["job_id"])
    row["invoice_number"] = next_number("invoices", "invoice_number", "INV-", 2001)
    row["issued_at"] = now_iso()
    row["payments"] = []
    return store.create("invoices", calculate_invoice(row), id_prefix="inv")


@app.get(f"{API}/invoices/{{invoice_id}}", tags=["invoices"])
def get_invoice(invoice_id: str) -> dict[str, Any]:
    return require("invoices", invoice_id)


@app.patch(f"{API}/invoices/{{invoice_id}}", tags=["invoices"])
def update_invoice(invoice_id: str, payload: InvoiceUpdate) -> dict[str, Any]:
    current = require("invoices", invoice_id)
    changes = request_data(payload, partial=True)
    customer_id = changes.get("customer_id", current["customer_id"])
    require_customer(customer_id)
    if "vehicle_id" in changes and changes["vehicle_id"]:
        vehicle = require_vehicle(changes["vehicle_id"])
        if vehicle["customer_id"] != customer_id:
            raise HTTPException(status_code=422, detail="The selected vehicle does not belong to that customer.")
    return store.update("invoices", invoice_id, calculate_invoice(changes, current))  # type: ignore[return-value]


@app.post(f"{API}/invoices/{{invoice_id}}/payments", tags=["invoices"])
def add_payment(invoice_id: str, payload: PaymentCreate) -> dict[str, Any]:
    invoice = require("invoices", invoice_id)
    payment = request_data(payload)
    amount = float(payment["amount"])
    if amount > float(invoice["balance_due"]):
        raise HTTPException(status_code=422, detail="Payment cannot exceed the outstanding balance.")
    payments = list(invoice.get("payments", []))
    payments.append({"id": f"pay_{len(payments) + 1}", **payment, "paid_at": payment.get("paid_at") or now_iso()})
    paid = round(float(invoice.get("amount_paid", 0)) + amount, 2)
    status_value = "paid" if paid >= float(invoice["total"]) else "partial"
    return store.update("invoices", invoice_id, {"payments": payments, "amount_paid": paid, "balance_due": max(round(float(invoice["total"]) - paid, 2), 0), "status": status_value})  # type: ignore[return-value]


@app.get(f"{API}/settings", tags=["settings"])
def get_settings() -> dict[str, Any]:
    rows = store.list("settings")
    if not rows:
        raise HTTPException(status_code=500, detail="Garage settings are unavailable.")
    return rows[0]


@app.patch(f"{API}/settings", tags=["settings"])
def update_settings(payload: GarageSettingsUpdate) -> dict[str, Any]:
    current = get_settings()
    return store.update("settings", current["id"], request_data(payload, partial=True))  # type: ignore[return-value]


@app.get(f"{API}/dashboard", tags=["dashboard"])
def dashboard() -> dict[str, Any]:
    jobs = store.list("jobs")
    appointments = store.list("appointments")
    inventory = store.list("inventory")
    invoices = store.list("invoices")
    today = date.today()
    active_statuses = {"scheduled", "checked_in", "in_progress", "quality_check"}
    active_jobs = [job for job in jobs if job.get("status") in active_statuses]
    today_appointments = [
        item for item in appointments if (parsed := parse_timestamp(item.get("starts_at"))) and parsed.date() == today
    ]
    month_prefix = today.strftime("%Y-%m")
    paid_this_month = sum(
        float(invoice.get("amount_paid", 0))
        for invoice in invoices
        if str(invoice.get("issued_at", "")).startswith(month_prefix)
    )
    return {
        "today": today.isoformat(),
        "metrics": {
            "active_jobs": len(active_jobs),
            "today_appointments": len(today_appointments),
            "low_stock_items": sum(int(item["quantity_on_hand"]) <= int(item["reorder_level"]) for item in inventory),
            "unpaid_balance": round(sum(float(invoice.get("balance_due", 0)) for invoice in invoices), 2),
            "paid_this_month": round(paid_this_month, 2),
        },
        "active_work_orders": sort_by_updated(active_jobs)[:6],
        "today_appointments": sorted(today_appointments, key=lambda item: item.get("starts_at", "")),
    }


def workspace_status(value: str) -> str:
    lookup = {
        "scheduled": "Waiting",
        "checked_in": "Waiting",
        "in_progress": "In service",
        "in_service": "In service",
        "quality_check": "Quality check",
        "ready": "Ready",
        "completed": "Collected",
        "collected": "Collected",
    }
    return lookup.get(value, "Waiting")


def workspace_date(value: str | None) -> str:
    parsed = parse_timestamp(value)
    return parsed.strftime("%d %b %Y") if parsed else "Not recorded"


def workspace_due(value: str | None) -> str:
    parsed = parse_timestamp(value)
    if not parsed:
        return "To be scheduled"
    local = parsed.astimezone()
    prefix = "Today" if local.date() == date.today() else local.strftime("%d %b")
    return f"{prefix}, {local.strftime('%H:%M')}"


@app.get(f"{API}/workspace", tags=["mobile client"])
def workspace() -> dict[str, Any]:
    """A normalized convenience payload used by the Expo demo client.

    Individual REST endpoints remain the system of record. This route simply
    lets a mobile app hydrate a useful offline-capable workspace in one call.
    """
    customers = store.list("customers")
    vehicles = store.list("vehicles")
    jobs = store.list("jobs")
    appointments = store.list("appointments")
    inventory = store.list("inventory")
    invoices = store.list("invoices")
    settings_row = get_settings()
    invoice_totals: dict[str, float] = defaultdict(float)
    visit_totals: Counter[str] = Counter()
    for invoice in invoices:
        invoice_totals[invoice["customer_id"]] += float(invoice.get("total", 0))
    for job in jobs:
        visit_totals[job.get("customer_id", "")] += 1
    tones = ["dark", "sand", "blue", "red", "gray"]
    local_customers = [
        {
            "id": row["id"],
            "name": row["name"],
            "initials": "".join(piece[0] for piece in row["name"].split()[:2]).upper(),
            "phone": row["phone"],
            "email": row.get("email") or "",
            "joinedAt": str(row.get("created_at", ""))[:10] or date.today().isoformat(),
            "totalVisits": visit_totals[row["id"]],
            "lifetimeValue": round(invoice_totals[row["id"]], 2),
            "note": row.get("notes") or None,
        }
        for row in customers
    ]
    local_vehicles = [
        {
            "id": row["id"],
            "customerId": row["customer_id"],
            "make": row["make"],
            "model": row["model"],
            "year": row["year"],
            "plate": row["registration_number"],
            "colour": row.get("color") or "Not recorded",
            "odometer": row.get("odometer", 0),
            "status": workspace_status(row.get("status", "")),
            "lastService": workspace_date(row.get("updated_at")),
            "nextService": "To be scheduled",
            "imageTone": tones[index % len(tones)],
        }
        for index, row in enumerate(vehicles)
    ]
    local_orders = [
        {
            "id": row["id"],
            "number": row.get("job_number", row["id"]),
            "customerId": row.get("customer_id", ""),
            "vehicleId": row["vehicle_id"],
            "title": row["service_type"],
            "service": row["service_type"],
            "technician": row.get("technician") or "Unassigned",
            "bay": "Bay —",
            "status": workspace_status(row.get("status", "")),
            "priority": "Urgent" if row.get("priority") in {"urgent", "high"} else "Standard",
            "estimate": row.get("estimated_cost", 0),
            "dueAt": workspace_due(row.get("due_at")),
            "startedAt": workspace_due(row.get("scheduled_at")),
            "checklist": [
                {"label": "Vehicle check-in", "done": row.get("status") not in {"scheduled", "checked_in"}},
                {"label": "Technician inspection", "done": row.get("status") in {"in_progress", "quality_check", "completed"}},
                {"label": "Customer update", "done": row.get("status") in {"quality_check", "completed"}},
            ],
            "note": row.get("notes") or None,
        }
        for row in jobs
    ]
    local_inventory = [
        {
            "id": row["id"],
            "name": row["name"],
            "sku": row["sku"],
            "category": row["category"],
            "quantity": row["quantity_on_hand"],
            "reorderAt": row["reorder_level"],
            "unit": "pcs",
            "price": row.get("unit_price", 0),
            "supplier": row.get("supplier") or "Not recorded",
        }
        for row in inventory
    ]
    local_events = [
        {
            "id": row["id"],
            "date": str(row.get("starts_at", ""))[:10],
            "time": (parse_timestamp(row.get("starts_at")) or datetime.now()).strftime("%H:%M"),
            "title": row["service_type"],
            "customerId": row["customer_id"],
            "vehicleId": row["vehicle_id"],
            "technician": row.get("advisor") or "Unassigned",
            "duration": "1h",
            "kind": "Service",
        }
        for row in appointments
    ]
    local_invoices = [
        {
            "id": row["id"],
            "number": row.get("invoice_number", row["id"]),
            "customerId": row["customer_id"],
            "vehicleId": row.get("vehicle_id"),
            "workOrderId": row.get("job_id"),
            "status": row.get("status", "draft"),
            "lineItems": [
                {
                    "description": item.get("description", ""),
                    "quantity": float(item.get("quantity", 0)),
                    "unitPrice": float(item.get("unit_price", 0)),
                    "total": float(item.get("total", 0)),
                }
                for item in row.get("line_items", [])
            ],
            "subtotal": float(row.get("subtotal", 0)),
            "discount": float(row.get("discount", 0)),
            "taxRate": float(row.get("tax_rate", 0)),
            "taxAmount": float(row.get("tax_amount", 0)),
            "total": float(row.get("total", 0)),
            "amountPaid": float(row.get("amount_paid", 0)),
            "balanceDue": float(row.get("balance_due", 0)),
            "issuedAt": workspace_date(row.get("issued_at")),
            "payments": [
                {
                    "id": payment.get("id", ""),
                    "amount": float(payment.get("amount", 0)),
                    "method": payment.get("method", "cash"),
                    "paidAt": workspace_date(payment.get("paid_at")),
                }
                for payment in row.get("payments", [])
            ],
        }
        for row in invoices
    ]
    return {
        "customers": local_customers,
        "vehicles": local_vehicles,
        "workOrders": local_orders,
        "inventory": local_inventory,
        "events": local_events,
        "invoices": local_invoices,
        "settings": {
            "garageName": settings_row["garage_name"],
            "ownerName": "Garage owner",
            "phone": settings_row["phone"],
            "address": settings_row["address"],
            "currency": settings_row.get("currency", "INR"),
            "serviceReminders": True,
            "dailyDigest": True,
            "compactNumbers": False,
        },
    }


@app.post(f"{API}/demo/reset", tags=["system"])
def reset_demo() -> dict[str, str]:
    store.reset()
    return {"message": "Demo workspace restored."}


if WEB_DIST.exists():
    # Catch-all mount registered last: API routes above always win.
    app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="web")
