"use client";

import { Box, Text } from "@mantine/core";
import { INK, MUTED, PRIMARY } from "@/constants/colors";
import { formatMonthYear } from "@/lib/format";
import type { SubscriptionHistoryEntry } from "../types";

export function SubscriptionHistoryTimeline({ history }: { history: SubscriptionHistoryEntry[] }) {
  if (!history.length) return <Text size="sm" c="dimmed">No subscription history yet.</Text>;

  return (
    <Box>
      {history.map((entry, index) => {
        const isLast = index === history.length - 1;
        return (
          <Box key={`${entry.plan_name}-${entry.start}`} style={{ position: "relative", paddingLeft: 22, paddingBottom: isLast ? 0 : 18 }}>
            <Box style={{ position: "absolute", left: 0, top: 3, width: 10, height: 10, borderRadius: "50%", border: `2px solid ${PRIMARY}`, backgroundColor: "white" }} />
            {!isLast && <Box style={{ position: "absolute", left: 4, top: 15, bottom: 0, width: 2, backgroundColor: "#ece8df" }} />}
            <Text size="sm" fw={700} c={INK}>{entry.plan_name}</Text>
            <Text size="xs" c={MUTED} mt={2}>
              {formatMonthYear(entry.start)} – {entry.end ? formatMonthYear(entry.end) : "Present"}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
