import type { Reimbursement, ReimbursementList } from "./types";
async function api<T>(path: string, init?: RequestInit): Promise<T> {
 const response=await fetch(`/api/admin/reimbursements${path}`,{...init,cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Permintaan gagal.");
 return data;
}
export const getReimbursements=(page:number,status:string,scope:"all"|"mine"="all")=>api<ReimbursementList>(`?page=${page}&page_size=10&scope=${scope}${status?`&status=${status}`:""}`);
export const submitReimbursement=(body:FormData)=>api<Reimbursement>("",{method:"POST",body});
export const reviewReimbursement=(id:number,approve:boolean,review_note:string)=>api<Reimbursement>(`/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approve,review_note})});
