"""Request schemas shared by the garage-management API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    """Expose JSON in the convention commonly used by web/mobile clients."""
    head, *tail = value.split("_")
    return head + "".join(piece.capitalize() for piece in tail)


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
    )


class LoginRequest(APIModel):
    username: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=4, max_length=128)


class CustomerCreate(APIModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=32)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class CustomerUpdate(APIModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class GarageSettingsUpdate(APIModel):
    garage_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = Field(default=None, max_length=300)
    timezone: str | None = Field(default=None, max_length=80)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    opening_hours: str | None = Field(default=None, max_length=200)


class VehicleCreate(APIModel):
    customer_id: str = Field(min_length=1)
    make: str = Field(min_length=1, max_length=60)
    model: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=1900, le=2100)
    registration_number: str = Field(min_length=2, max_length=32)
    vin: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=40)
    fuel_type: str | None = Field(default=None, max_length=32)
    transmission: str | None = Field(default=None, max_length=32)
    odometer: int = Field(default=0, ge=0)
    status: str = Field(default="checked_in", max_length=32)
    image_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("registration_number")
    @classmethod
    def normalise_registration(cls, value: str) -> str:
        return value.upper()


class VehicleUpdate(APIModel):
    customer_id: str | None = Field(default=None, min_length=1)
    make: str | None = Field(default=None, min_length=1, max_length=60)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    year: int | None = Field(default=None, ge=1900, le=2100)
    registration_number: str | None = Field(default=None, min_length=2, max_length=32)
    vin: str | None = Field(default=None, max_length=32)
    color: str | None = Field(default=None, max_length=40)
    fuel_type: str | None = Field(default=None, max_length=32)
    transmission: str | None = Field(default=None, max_length=32)
    odometer: int | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, max_length=32)
    image_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("registration_number")
    @classmethod
    def normalise_registration(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class JobCreate(APIModel):
    vehicle_id: str = Field(min_length=1)
    customer_id: str | None = Field(default=None, min_length=1)
    service_type: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    status: str = Field(default="scheduled", max_length=32)
    priority: str = Field(default="normal", max_length=32)
    technician: str | None = Field(default=None, max_length=100)
    scheduled_at: datetime | None = None
    due_at: datetime | None = None
    odometer: int | None = Field(default=None, ge=0)
    estimated_cost: float = Field(default=0, ge=0)
    labor_cost: float = Field(default=0, ge=0)
    parts_cost: float = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class JobUpdate(APIModel):
    vehicle_id: str | None = Field(default=None, min_length=1)
    customer_id: str | None = Field(default=None, min_length=1)
    service_type: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, max_length=32)
    priority: str | None = Field(default=None, max_length=32)
    technician: str | None = Field(default=None, max_length=100)
    scheduled_at: datetime | None = None
    due_at: datetime | None = None
    odometer: int | None = Field(default=None, ge=0)
    estimated_cost: float | None = Field(default=None, ge=0)
    labor_cost: float | None = Field(default=None, ge=0)
    parts_cost: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentCreate(APIModel):
    customer_id: str = Field(min_length=1)
    vehicle_id: str = Field(min_length=1)
    service_type: str = Field(min_length=2, max_length=100)
    starts_at: datetime
    ends_at: datetime | None = None
    status: str = Field(default="confirmed", max_length=32)
    advisor: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)


class AppointmentUpdate(APIModel):
    customer_id: str | None = Field(default=None, min_length=1)
    vehicle_id: str | None = Field(default=None, min_length=1)
    service_type: str | None = Field(default=None, min_length=2, max_length=100)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str | None = Field(default=None, max_length=32)
    advisor: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)


class InventoryCreate(APIModel):
    sku: str = Field(min_length=2, max_length=60)
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(default="General", max_length=80)
    quantity_on_hand: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=0, ge=0)
    unit_price: float = Field(default=0, ge=0)
    supplier: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("sku")
    @classmethod
    def normalise_sku(cls, value: str) -> str:
        return value.upper()


class InventoryUpdate(APIModel):
    sku: str | None = Field(default=None, min_length=2, max_length=60)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=80)
    quantity_on_hand: int | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("sku")
    @classmethod
    def normalise_sku(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class StockAdjustment(APIModel):
    quantity_delta: int = Field(ge=-100000, le=100000)
    reason: str = Field(min_length=2, max_length=300)

    @field_validator("quantity_delta")
    @classmethod
    def quantity_cannot_be_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("quantity_delta cannot be zero")
        return value


class InvoiceLineItem(APIModel):
    description: str = Field(min_length=2, max_length=200)
    quantity: float = Field(gt=0, le=100000)
    unit_price: float = Field(ge=0)
    inventory_id: str | None = None


class InvoiceCreate(APIModel):
    customer_id: str = Field(min_length=1)
    vehicle_id: str | None = Field(default=None, min_length=1)
    job_id: str | None = Field(default=None, min_length=1)
    line_items: list[InvoiceLineItem] = Field(min_length=1)
    status: str = Field(default="draft", max_length=32)
    tax_rate: float = Field(default=0, ge=0, le=100)
    discount: float = Field(default=0, ge=0)
    amount_paid: float = Field(default=0, ge=0)
    due_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)


class InvoiceUpdate(APIModel):
    customer_id: str | None = Field(default=None, min_length=1)
    vehicle_id: str | None = Field(default=None, min_length=1)
    job_id: str | None = Field(default=None, min_length=1)
    line_items: list[InvoiceLineItem] | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, max_length=32)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount: float | None = Field(default=None, ge=0)
    amount_paid: float | None = Field(default=None, ge=0)
    due_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)


class PaymentCreate(APIModel):
    amount: float = Field(gt=0)
    method: str = Field(default="cash", min_length=2, max_length=32)
    reference: str | None = Field(default=None, max_length=120)
    paid_at: datetime | None = None


def request_data(model: APIModel, *, partial: bool = False) -> dict[str, Any]:
    """Produce JSON-safe, snake-case data for the local data store."""
    return model.model_dump(mode="json", exclude_unset=partial)
