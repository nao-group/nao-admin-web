"use client";
import { useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { getPurchaseSettings, savePurchaseSettings } from "../api";
export function ZoomPurchaseSettings() {
 const [url,setUrl] = useState(""), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState("");
 async function load() { setLoading(true); try { setUrl((await getPurchaseSettings()).zoom_shopee_url || ""); setError(""); } catch(e) { setError(e instanceof Error ? e.message : "Gagal memuat link."); } finally {setLoading(false);} }
 useEffect(() => { let active = true; getPurchaseSettings().then(data => { if(active) { setUrl(data.zoom_shopee_url || ""); setError(""); } }).catch(e => { if(active) setError(e.message); }).finally(() => { if(active) setLoading(false); }); return () => { active = false; }; }, []);
 async function save() { setBusy(true); try { await savePurchaseSettings(url); notifications.show({color:"green",message:"Link pembelian Zoom tersimpan."}); } catch(e) { notifications.show({color:"red",message:e instanceof Error ? e.message : "Gagal menyimpan."}); } finally {setBusy(false);} }
 return <Card withBorder radius="md" p="lg"><Stack><Title order={2} size="h4">Pembelian Zoom guru</Title><Text size="sm" c="dimmed">Guru membeli Zoom sendiri melalui link ini dan mengajukan reimbursement dengan bukti. Kosongkan link untuk menonaktifkan pengajuan baru.</Text>{error && <Group><Text c="red" role="alert">{error}</Text><Button variant="light" onClick={() => void load()}>Coba lagi</Button></Group>}<TextInput label="Link pembelian" placeholder="https://example.com/product" value={url} disabled={loading || busy || !!error} onChange={e => setUrl(e.currentTarget.value)} /><Group justify="flex-end"><Button loading={busy} disabled={loading || !!error} onClick={() => void save()}>Simpan link</Button></Group></Stack></Card>;
}
