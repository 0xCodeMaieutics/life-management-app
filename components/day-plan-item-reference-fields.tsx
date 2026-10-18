"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type DayPlanItemReference,
  type DayPlanItemReferenceType,
} from "@/lib/day-plan-item-reference";

const REFERENCE_TYPE_OPTIONS: {
  type: DayPlanItemReferenceType;
  label: string;
  valueLabel: string;
  inputType: "tel" | "email" | "text";
  placeholder: string;
}[] = [
  {
    type: "PHONE",
    label: "Phone",
    valueLabel: "Phone number",
    inputType: "tel",
    placeholder: "+48 600 123 456",
  },
  {
    type: "EMAIL",
    label: "Email",
    valueLabel: "Email address",
    inputType: "email",
    placeholder: "anna@example.com",
  },
  {
    type: "LINK",
    label: "Link",
    valueLabel: "URL",
    inputType: "text",
    placeholder: "facebook.com/anna",
  },
];

export function DayPlanItemReferenceFields({
  defaultReference,
}: {
  defaultReference: DayPlanItemReference | null;
}) {
  const [hasReference, setHasReference] = useState(defaultReference !== null);
  const [referenceType, setReferenceType] = useState<DayPlanItemReferenceType>(
    defaultReference?.type ?? "PHONE",
  );
  const selectedOption =
    REFERENCE_TYPE_OPTIONS.find((option) => option.type === referenceType) ??
    REFERENCE_TYPE_OPTIONS[0];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="hasReference"
          className="size-4 rounded border-input"
          checked={hasReference}
          onChange={(event) => setHasReference(event.target.checked)}
        />
        <span className="text-sm font-medium">Add a reference</span>
      </label>
      {hasReference ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-reference-type">Reference type</Label>
            <select
              id="day-plan-item-reference-type"
              name="referenceType"
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              value={referenceType}
              onChange={(event) =>
                setReferenceType(event.target.value as DayPlanItemReferenceType)
              }
            >
              {REFERENCE_TYPE_OPTIONS.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-reference-value">
              {selectedOption.valueLabel}
            </Label>
            <Input
              key={referenceType}
              id="day-plan-item-reference-value"
              name="referenceValue"
              type={selectedOption.inputType}
              inputMode={referenceType === "LINK" ? "url" : undefined}
              required
              maxLength={2048}
              placeholder={selectedOption.placeholder}
              defaultValue={
                defaultReference?.type === referenceType
                  ? defaultReference.value
                  : ""
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
