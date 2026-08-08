import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { email, playerName, recipientName, customMessage, customSubject } = await req.json();

    if (!email || !playerName) {
      return NextResponse.json({ error: "Email et playerName sont requis" }, { status: 400 });
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

    const defaultHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p>Chers parents,</p>
          <p>Nous souhaitons par la présente vous rappeler que le paiement du mois est dû depuis le 10.</p>
          <p>Si vous souhaitez vous informer du compte de votre enfant n'hésitez pas à nous contacter au 2817-8676<br/>
          Les chèques sont payables à l'ordre de FULMOUN PRODUCTION.</p>
          <br/>
          <p>Les parents ayant déjà acquitté de ce paiement ne sont pas concernés par ce message.</p>
          <p>Cordiales salutations.</p>
          <p><strong>Sterline Jessica Beaubrun</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #6B7280; font-size: 12px;">
            L'équipe FC TORO<br/>
            7 Rue Rigaud, Pétion-Ville, Haïti<br/>
            <a href="https://www.fctoro.com">www.fctoro.com</a>
          </p>
        </div>
      `;

    const htmlBody = customMessage ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p>Chers parents,</p>
          <p style="white-space: pre-wrap;">${customMessage}</p>
          <br/>
          <p>Cordiales salutations.</p>
          <p><strong>Sterline Jessica Beaubrun</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #6B7280; font-size: 12px;">
            L'équipe FC TORO<br/>
            7 Rue Rigaud, Pétion-Ville, Haïti<br/>
            <a href="https://www.fctoro.com">www.fctoro.com</a>
          </p>
        </div>
      ` : defaultHtml;

    const mailOptions = {
      from: `"FC TORO" <${process.env.SMTP_USER}>`,
      to: email,
      subject: customSubject || `Rappel de paiement`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email de rappel envoyé : %s", info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi du rappel :", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
