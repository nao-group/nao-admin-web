"use client";

import { Badge, Box, Button, Divider, Drawer, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconCreditCard } from "@tabler/icons-react";
import { DetailItem, StatusBadge } from "@/components/ui/admin";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/types/admin";

export function PaymentDetailDrawer({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  return <Drawer opened={Boolean(payment)} onClose={onClose} position="right" size="md" title={<Text className="section-title">Payment details</Text>}>{payment && <Stack gap="lg"><Box className="detail-hero" p="lg"><Group justify="space-between" align="flex-start"><Box><Text size="xs" c="dimmed">Amount</Text><Text className="payment-detail-value">{formatCurrency(payment.amount)}</Text></Box><StatusBadge status={payment.status} /></Group></Box><SimpleGrid cols={2}><DetailItem label="Invoice ID" value={payment.id} /><DetailItem label="Payment date" value={formatDate(payment.date)} /><DetailItem label="Member" value={payment.member} /><DetailItem label="Product" value={<Badge variant="outline" color={payment.product === "ThinkNAO" ? "dark" : "yellow"}>{payment.product}</Badge>} /></SimpleGrid><Divider /><Box><Text className="section-title" mb="md">Transaction information</Text><Stack gap="sm"><DetailItem label="Payment method" value={payment.method} /><DetailItem label="Currency" value="IDR — Indonesian Rupiah" /><DetailItem label="Settlement" value={payment.status === "Paid" ? "Settled" : "Not settled"} /></Stack></Box><Button variant="light" color="dark" fullWidth leftSection={<IconCreditCard size={16} />}>Download receipt</Button></Stack>}</Drawer>;
}
