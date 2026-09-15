type Sale = { amount: number; teacherShareAmount: number | null; refund: { amount: number; teacherDebit: number } | null; cost: { amount: number } | null };
type Withdrawal = { amount: number; fee: number; status: string };
export function walletTotals(sales: Sale[], payouts: Withdrawal[]) {
  const gross = sales.reduce((sum,p)=>sum+p.amount,0);
  const earned = sales.reduce((sum,p)=>sum+(p.teacherShareAmount??0),0);
  const refunds = sales.reduce((sum,p)=>sum+(p.refund?.amount??0),0);
  const debits = sales.reduce((sum,p)=>sum+(p.refund?.teacherDebit??0),0);
  const saleFees = sales.reduce((sum,p)=>sum+(p.cost?.amount??0),0);
  const paid = payouts.filter(p=>p.status==='PAID').reduce((sum,p)=>sum+p.amount,0);
  const payoutFees = payouts.filter(p=>p.status==='PAID').reduce((sum,p)=>sum+p.fee,0);
  const reserved = payouts.filter(p=>['REQUESTED','PROCESSING'].includes(p.status)).reduce((sum,p)=>sum+p.amount,0);
  const unallocated = sales.filter(p=>p.teacherShareAmount===null && !p.refund).reduce((sum,p)=>sum+p.amount,0);
  return {gross,earned,refunds,debits,saleFees,paid,payoutFees,received:paid-payoutFees,reserved,
    netEarned:earned-debits, available:earned-debits-paid-reserved,
    platformNet:gross-refunds-earned+debits-saleFees-unallocated,unallocated};
}
export function validIban(iban: string) {
  return /^IR\d{24}$/.test(iban) && BigInt(iban.slice(4)+'1827'+iban.slice(2,4))%BigInt(97)===BigInt(1);
}
