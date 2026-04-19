import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  AccessibilityRole,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { theme } from "../theme";
import { useAppStore } from "../store/useAppStore";
import { RiskScoreBadge } from "../components/cloud/RiskScoreBadge";
import { TimelineView } from "../components/cloud/TimelineView";
import { ProgramMatchCard } from "../components/cloud/ProgramMatchCard";
import { CloudAnalysis } from "../types/cloud";

type RiskTone = {
  band: string;
  accent: string;
  tint: string;
  card: string;
  ink: string;
  headline: string;
  status: string;
};

function riskToneForScore(score: number): RiskTone {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  if (clamped <= 33) {
    return {
      band: "Low Risk",
      accent: theme.colors.riskLow,
      tint: "#D8F0E1",
      card: "#F5FBF7",
      ink: "#17613A",
      headline: "Stable placement outlook",
      status: "Routine follow-up window",
    };
  }

  if (clamped <= 66) {
    return {
      band: "Moderate Risk",
      accent: theme.colors.riskMedium,
      tint: "#F6DE9A",
      card: "#FFF9EB",
      ink: "#956A00",
      headline: "Coordinated follow-up recommended",
      status: "Near-term intervention advised",
    };
  }

  return {
    band: "High Risk",
    accent: theme.colors.riskHigh,
    tint: "#F1BBB4",
    card: "#FFF5F3",
    ink: "#A43124",
    headline: "Immediate stabilization recommended",
    status: "Priority case for rapid response",
  };
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildHeroCopy(result: CloudAnalysis) {
  const tone = riskToneForScore(result.riskScore);

  const description = [
    `${pluralize(result.riskFactors.length, "risk driver")} flagged`,
    `${pluralize(result.protectiveFactors.length, "protective factor")} captured`,
    `${pluralize(result.timeline.length, "action")} sequenced`,
    `${pluralize(result.programMatches.length, "program match")} prepared`,
  ].join(" • ");

  return {
    tone,
    title: tone.headline,
    description,
  };
}

/**
 * Final screen of the intake flow. Reads cloudResult from the store and
 * renders a summary-first triage report while preserving all existing data.
 */
export function ResourcePlanScreen() {
  const navigation = useNavigation();
  const cloudStatus = useAppStore((s) => s.cloudStatus);
  const cloudResult = useAppStore((s) => s.cloudResult);
  const resetSession = useAppStore((s) => s.resetSession);

  const handleNewCase = () => {
    resetSession();
    navigation.reset({
      index: 0,
      routes: [{ name: "IntakeSession" as never }],
    });
  };

  if (cloudStatus === "sending" || cloudStatus === "sanitizing") {
    return (
      <StatusScreen
        title="Generating triage report"
        body="Sending the anonymized intake to the analyst. This usually takes a few seconds."
        loading
      />
    );
  }

  if (cloudStatus === "queued") {
    return (
      <StatusScreen
        title="Offline — report queued"
        body="We couldn't reach the analyst service. The anonymized intake has been saved locally and will be sent the next time you're online."
        actionLabel="Start New Case"
        onPress={handleNewCase}
      />
    );
  }

  if (cloudStatus === "error" && !cloudResult) {
    return (
      <StatusScreen
        title="Something went wrong"
        body="The analyst service returned an error. Check your connection and try generating the plan again."
        actionLabel="Start New Case"
        onPress={handleNewCase}
        tone="danger"
      />
    );
  }

  if (!cloudResult) {
    return (
      <StatusScreen
        title="No report yet"
        body='Complete the intake form and tap "Generate Plan" to produce a risk score and action timeline.'
        actionLabel="Back to Intake"
        onPress={handleNewCase}
      />
    );
  }

  const {
    riskScore,
    riskFactors,
    protectiveFactors,
    timeline,
    programMatches,
  } = cloudResult;
  const hero = buildHeroCopy(cloudResult);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroPanel, { backgroundColor: hero.tone.card, borderColor: hero.tone.tint }]}>
          <View style={[styles.heroGlowLarge, { backgroundColor: hero.tone.tint }]} />
          <View style={styles.heroGlowSmall} />

          <View style={styles.heroHeader}>
            <Text style={styles.heroEyebrow}>AI TRIAGE REPORT</Text>
            <View style={[styles.heroStatusPill, { backgroundColor: hero.tone.tint }]}>
              <View style={[styles.heroStatusDot, { backgroundColor: hero.tone.accent }]} />
              <Text style={[styles.heroStatusText, { color: hero.tone.ink }]}>
                {hero.tone.status}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{hero.title}</Text>
          <Text style={styles.heroDescription}>{hero.description}</Text>

          <View style={styles.badgeRow}>
            <RiskScoreBadge score={riskScore} />
          </View>

          <View style={styles.metricGrid}>
            <MetricTile label="Risk Signals" value={riskFactors.length} accent={hero.tone.accent} />
            <MetricTile label="Stabilizers" value={protectiveFactors.length} accent={theme.colors.fieldConfirmedBorder} />
            <MetricTile label="Next Actions" value={timeline.length} accent={theme.colors.accent} />
            <MetricTile label="Programs" value={programMatches.length} accent={theme.colors.fieldInferredBorder} />
          </View>

          <View style={styles.heroPreviewGrid}>
            <PreviewPanel
              title="Primary Drivers"
              items={riskFactors}
              tone="danger"
              emptyLabel="No acute drivers identified."
            />
            <PreviewPanel
              title="Stabilizers"
              items={protectiveFactors}
              tone="confirmed"
              emptyLabel="No stabilizing factors documented."
            />
          </View>
        </View>

        <SectionCard
          eyebrow="Signal Review"
          title="Primary Drivers"
          detail={pluralize(riskFactors.length, "signal")}
        >
          {riskFactors.length > 0 ? (
            <ChipGroup items={riskFactors} tone="danger" />
          ) : (
            <EmptyText>No risk factors identified.</EmptyText>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Protective Context"
          title="Stabilizers"
          detail={pluralize(protectiveFactors.length, "factor")}
        >
          {protectiveFactors.length > 0 ? (
            <ChipGroup items={protectiveFactors} tone="confirmed" />
          ) : (
            <EmptyText>No protective factors identified.</EmptyText>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Execution Plan"
          title="30-Day Action Plan"
          detail={pluralize(timeline.length, "step")}
        >
          <TimelineView entries={timeline} />
        </SectionCard>

        <SectionCard
          eyebrow="Recommended Resources"
          title="Eligible Programs"
          detail={pluralize(programMatches.length, "match")}
        >
          {programMatches.length > 0 ? (
            <View style={styles.programList}>
              {programMatches.map((match, i) => (
                <ProgramMatchCard
                  key={`${match.name}-${i}`}
                  match={match}
                  rank={i}
                />
              ))}
            </View>
          ) : (
            <EmptyText>No matching programs found.</EmptyText>
          )}
        </SectionCard>

        <View style={styles.footer}>
          <PrimaryButton label="Start New Case" onPress={handleNewCase} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionDetailPill}>
          <Text style={styles.sectionDetailText}>{detail}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function PreviewPanel({
  title,
  items,
  tone,
  emptyLabel,
}: {
  title: string;
  items: string[];
  tone: "danger" | "confirmed";
  emptyLabel: string;
}) {
  return (
    <View style={styles.previewPanel}>
      <Text style={styles.previewTitle}>{title}</Text>
      {items.length > 0 ? (
        <ChipGroup items={items.slice(0, 2)} tone={tone} compact />
      ) : (
        <Text style={styles.previewEmpty}>{emptyLabel}</Text>
      )}
    </View>
  );
}

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusScreen({
  title,
  body,
  actionLabel,
  onPress,
  loading = false,
  tone = "neutral",
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onPress?: () => void;
  loading?: boolean;
  tone?: "neutral" | "danger";
}) {
  const accent = tone === "danger" ? theme.colors.danger : theme.colors.accent;
  const tint = tone === "danger" ? theme.colors.dangerLight : theme.colors.accentLight;

  return (
    <SafeAreaView style={styles.statusScreen}>
      <View style={[styles.statusPanel, { borderColor: tint }]}>
        <View style={[styles.statusWash, { backgroundColor: tint }]} />
        <Text style={styles.statusEyebrow}>AI TRIAGE REPORT</Text>
        {loading ? <ActivityIndicator size="large" color={accent} /> : null}
        <Text style={[styles.statusTitle, tone === "danger" && { color: accent }]}>
          {title}
        </Text>
        <Text style={styles.statusBody}>{body}</Text>
        {actionLabel && onPress ? (
          <PrimaryButton label={actionLabel} onPress={onPress} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ChipGroup({
  items,
  tone,
  compact = false,
}: {
  items: string[];
  tone: "danger" | "confirmed";
  compact?: boolean;
}) {
  const toneStyles =
    tone === "danger"
      ? {
          background: theme.colors.dangerLight,
          border: "#F3B1A8",
          text: theme.colors.danger,
          dot: theme.colors.danger,
        }
      : {
          background: theme.colors.fieldConfirmed,
          border: "#8FD0AA",
          text: theme.colors.fieldConfirmedAccent,
          dot: theme.colors.fieldConfirmedBorder,
        };

  return (
    <View style={styles.chipRow}>
      {items.map((item, i) => (
        <View
          key={`${item}-${i}`}
          style={[
            compact ? styles.compactChip : styles.chip,
            { backgroundColor: toneStyles.background, borderColor: toneStyles.border },
          ]}
        >
          <View style={[styles.chipDot, { backgroundColor: toneStyles.dot }]} />
          <Text
            style={[
              compact ? styles.compactChipText : styles.chipText,
              { color: toneStyles.text },
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.emptyText}>{children}</Text>;
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={"button" as AccessibilityRole}
      accessibilityLabel={label}
      style={({ pressed }: { pressed: boolean }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  heroPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  heroGlowLarge: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -72,
    right: -36,
    opacity: 0.55,
  },
  heroGlowSmall: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -36,
    left: -24,
    backgroundColor: "rgba(14,124,107,0.08)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  heroEyebrow: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textSecondary,
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
  },
  heroStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatusText: {
    ...theme.typography.caption,
    fontWeight: "700",
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    fontSize: 32,
    lineHeight: 36,
  },
  heroDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  badgeRow: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  metricTile: {
    flexGrow: 1,
    minWidth: "47%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(92,82,74,0.12)",
    gap: 6,
  },
  metricAccent: {
    width: 22,
    height: 4,
    borderRadius: theme.radii.full,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.8,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  heroPreviewGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  previewPanel: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(92,82,74,0.1)",
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  previewTitle: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textSecondary,
  },
  previewEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: "#E7DED2",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  sectionHeading: {
    flex: 1,
    gap: 2,
  },
  sectionEyebrow: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
  },
  sectionDetailPill: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  sectionDetailText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  compactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  chipText: {
    ...theme.typography.body,
    flexShrink: 1,
  },
  compactChipText: {
    ...theme.typography.caption,
    flexShrink: 1,
  },
  programList: {
    gap: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  footer: {
    paddingTop: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    ...theme.shadows.card,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    ...theme.typography.h3,
    color: theme.colors.background,
  },
  statusScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  statusPanel: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    ...theme.shadows.elevated,
  },
  statusWash: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -100,
    right: -70,
    opacity: 0.6,
  },
  statusEyebrow: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textSecondary,
  },
  statusTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  statusBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
