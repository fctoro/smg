import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, parentName, receiptBase64, receiptNumber, amount } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email est requis" }, { status: 400 });
    }

    if (!receiptBase64) {
      return NextResponse.json({ error: "Le reçu PDF est manquant" }, { status: 400 });
    }

    // Configurer le transporteur Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // false pour 587, true pour 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Nettoyer la chaîne base64 (extraire tout ce qui vient après "base64,")
    const base64Data = receiptBase64.includes("base64,") 
      ? receiptBase64.split("base64,")[1] 
      : receiptBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const fromName = process.env.SMTP_FROM_NAME || "FC TORO";
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: `Votre reçu FC TORO - ${receiptNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1F2937;">Bonjour ${parentName || "Parent"},</h2>
          <p>Nous avons bien reçu votre paiement de <strong>${amount}</strong>.</p>
          <p>Vous trouverez ci-joint votre reçu officiel (<strong>${receiptNumber}</strong>).</p>
          <p>Nous vous remercions de votre confiance.</p>
          <br/>
          <p style="color: #6B7280; font-size: 12px;">
            L'équipe FC TORO<br/>
            7 Rue Rigaud, Pétion-Ville, Haïti<br/>
            <a href="https://www.fctoro.com">www.fctoro.com</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${receiptNumber}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email envoyé : %s", info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email :", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
