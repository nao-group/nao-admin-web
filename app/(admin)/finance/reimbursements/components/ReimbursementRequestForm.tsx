"use client";
import { useRef, useState } from "react";
import { Button, Card, FileInput, Group, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { submitReimbursement } from "../api";

export function ReimbursementRequestForm({onSubmitted}:{onSubmitted:()=>void}) {
 const [title,setTitle]=useState(""),[category,setCategory]=useState<string|null>("other"),[date,setDate]=useState<string|null>(null);
 const [amount,setAmount]=useState<number|string>(""),[url,setUrl]=useState(""),[notes,setNotes]=useState("");
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
 const key=useRef<string|null>(null);
 const changed=()=>{key.current=null;};
 async function submit(event:React.FormEvent) {
  event.preventDefault();if(busy||!title.trim()||!category||!date||!file||Number(amount)<=0)return;
  if(file.size>10*1024*1024||!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
   notifications.show({color:"red",message:"Pilih bukti PDF, JPEG, atau PNG maksimal 10 MB."});return;
  }
  setBusy(true);key.current??=crypto.randomUUID();
  const body=new FormData();body.set("request_key",key.current);body.set("title",title);body.set("category",category);
  body.set("purchase_date",date);body.set("amount",String(amount));body.set("purchase_url",url);body.set("notes",notes);body.set("evidence",file);
  try {await submitReimbursement(body);setTitle("");setDate(null);setAmount("");setUrl("");setNotes("");setFile(null);key.current=null;onSubmitted();notifications.show({color:"green",message:"Pengajuan dikirim dan menunggu persetujuan superadmin."});}
  catch(error){notifications.show({color:"red",message:error instanceof Error?error.message:"Pengajuan gagal."});}
  finally {setBusy(false);}
 }
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 return <Card withBorder radius="lg" p="lg"><form onSubmit={submit}><Stack>
  <Title order={2} size="h3">Ajukan reimbursement</Title><Text size="sm" c="dimmed">Untuk biaya Zoom, API, software, atau kebutuhan operasional lainnya. Semua pengajuan ditinjau oleh superadmin.</Text><Text size="xs" c="dimmed">Akun pemohon perlu terhubung ke data karyawan sebelum pengajuan disetujui dan diproses melalui payroll.</Text>
  <SimpleGrid cols={{base:1,sm:2}}><TextInput label="Keperluan" placeholder="Contoh: pembelian kredit API" required maxLength={200} value={title} disabled={busy} onChange={e=>{setTitle(e.currentTarget.value);changed();}} />
  <Select label="Kategori" required data={[{value:"zoom",label:"Zoom"},{value:"api",label:"API"},{value:"software",label:"Software"},{value:"other",label:"Lainnya"}]} value={category} disabled={busy} onChange={v=>{setCategory(v);changed();}} />
  <DatePickerInput label="Tanggal pembelian" required maxDate={today} valueFormat="DD MMMM YYYY" value={date} disabled={busy} onChange={v=>{setDate(v);changed();}} />
  <NumberInput label="Nominal (IDR)" required min={1} max={100000000} allowDecimal={false} thousandSeparator="." decimalSeparator="," value={amount} disabled={busy} onChange={v=>{setAmount(v);changed();}} /></SimpleGrid>
  <TextInput label="Link pembelian (opsional)" placeholder="https://…" value={url} maxLength={2000} disabled={busy} onChange={e=>{setUrl(e.currentTarget.value);changed();}} />
  <FileInput label="Bukti pembayaran" description="PDF, JPEG, atau PNG maksimal 10 MB." accept="application/pdf,image/jpeg,image/png" required value={file} disabled={busy} onChange={v=>{setFile(v);changed();}} clearable />
  <Textarea label="Catatan (opsional)" maxLength={2000} value={notes} disabled={busy} onChange={e=>{setNotes(e.currentTarget.value);changed();}} />
  <Group justify="flex-end"><Button type="submit" loading={busy} disabled={!title.trim()||!category||!date||!file||Number(amount)<=0}>Kirim pengajuan</Button></Group>
 </Stack></form></Card>;
}
