import { IntakeSchema, IntakeField } from "../types/intake";

function seededField<T>(value: T): IntakeField<T> {
  return {
    value,
    status: "inferred",
    lastUpdatedAt: Date.now(),
    source: "manual",
  };
}

export function createEmptyIntake(): IntakeSchema {
  // Temporary seeded data for faster UI and plan-generation testing.
  // Replace with the empty-field loop below when the test scaffold is no longer needed.
  return {
    client_first_name: seededField("Zorbi"),
    client_last_name: seededField("Flarn"),
    date_of_birth: seededField("03/17/1989"),
    gender: seededField("other"),
    primary_language: seededField("Blorbian English"),
    phone_number: seededField("555-0109"),
    family_size_adults: seededField(2),
    family_size_children: seededField(3),
    children_ages: seededField("4, 8, 13"),
    current_address: seededField("77 Nebula Court"),
    housing_status: seededField("doubled_up"),
    homelessness_duration_days: seededField(46),
    eviction_status: seededField("filed"),
    employment_status: seededField("part_time"),
    income_amount: seededField(1735),
    income_frequency: seededField("monthly"),
    benefits_receiving: seededField("SNAP, GlimmerAid"),
    has_disability: seededField(false),
    safety_concern_flag: seededField(true),
    timeline_urgency: seededField("within_week"),
  };
}
