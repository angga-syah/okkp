import { NextRequest, NextResponse } from "next/server";
import { Invoice as InvoiceClient } from "xendit-node";

// Define a type for error handling
type XenditError = {
  message: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, customerName, customerEmail } = body;
    
    if (!amount || amount <= 0 || !customerName || !customerEmail) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }
    
    const xenditInvoiceClient = new InvoiceClient({
      secretKey: process.env.XENDIT_SECRET_KEY!,
    });
    
    const invoiceData = {
      externalId: `INV-${Date.now()}`,
      amount: Number(amount),
      payerEmail: customerEmail.trim(),
      description: `Pembayaran untuk ${customerName.trim()}`,
      currency: "IDR",
      invoiceDuration: "120",
    };
    
    const invoice = await xenditInvoiceClient.createInvoice({
      data: invoiceData,
    });
    
    return NextResponse.json({
      success: true,
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
      expiryDate: invoice.expiryDate,
    });
  } catch (error: unknown) {
    // Type check and cast error to our defined type
    const xenditError = error as XenditError;
    console.error("Error creating invoice:", xenditError);
    
    return NextResponse.json(
      {
        success: false,
        message: xenditError.message || "Gagal membuat pesanan",
      },
      { status: 500 }
    );
  }
}