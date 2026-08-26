import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, parentName, childName, matricule, categorie, programme } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email destinataire manquant" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromName = process.env.SMTP_FROM_NAME || "FC TORO";
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const emailSubject = `Validation d'inscription FC TORO - ${childName || "Joueur"}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1f2937; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #C8102E 0%, #990B21 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
          .header p { margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 30px; }
          .greeting { font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 15px; }
          .message { font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 25px; }
          .info-card { background-color: #f9fafb; border-left: 4px solid #C8102E; border-radius: 6px; padding: 15px 20px; margin-bottom: 25px; }
          .info-card table { width: 100%; border-collapse: collapse; }
          .info-card td { padding: 6px 0; font-size: 14px; }
          .info-card td.label { font-weight: bold; color: #4b5563; width: 140px; }
          .info-card td.value { color: #111827; font-weight: bold; }
          .section-title { font-size: 15px; font-weight: bold; color: #C8102E; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fee2e2; padding-bottom: 6px; margin: 25px 0 15px 0; }
          .payment-methods { list-style: none; padding: 0; margin: 0 0 20px 0; font-size: 14px; }
          .payment-methods li { padding: 8px 12px; background: #f3f4f6; margin-bottom: 6px; border-radius: 6px; font-weight: bold; color: #1f2937; }
          .bank-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
          .bank-table th { background-color: #374151; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
          .bank-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
          .bank-table tr:nth-child(even) { background-color: #f9fafb; }
          .footer { background-color: #111827; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
          .footer a { color: #f87171; text-decoration: none; font-weight: bold; }
          .badge { display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SMG FC TORO</h1>
            <p>Académie de Football — Haïti</p>
          </div>
          
          <div class="content">
            <div class="greeting">Bonjour ${parentName || "Parent / Tuteur"},</div>
            <div class="message">
              Nous avons le plaisir de vous informer que l'inscription de votre enfant <strong style="color:#C8102E;">${childName || "le joueur"}</strong> a été <span class="badge">VALIDÉE AVEC SUCCÈS</span> pour la saison <strong>2026-2027</strong> au sein du club <strong>FC TORO</strong>.
            </div>

            <div class="info-card">
              <table>
                <tr>
                  <td class="label">Joueur :</td>
                  <td class="value">${childName || "-"}</td>
                </tr>
                ${matricule ? `
                <tr>
                  <td class="label">Matricule Officiel :</td>
                  <td class="value" style="color:#C8102E;">${matricule}</td>
                </tr>` : ""}
                ${categorie ? `
                <tr>
                  <td class="label">Catégorie :</td>
                  <td class="value">${categorie}</td>
                </tr>` : ""}
                ${programme ? `
                <tr>
                  <td class="label">Programme :</td>
                  <td class="value">${programme}</td>
                </tr>` : ""}
              </table>
            </div>

            <div class="section-title">💳 Méthodes de Paiement</div>
            <ul class="payment-methods">
              <li>1. Cash</li>
              <li>2. Chèque à l'ordre de : <strong>FULMOUN PRODUCTION</strong></li>
              <li>3. Carte de crédit</li>
              <li>4. SPIH / Dépôt ou Virement bancaire</li>
            </ul>

            <div class="section-title">🏦 Informations Bancaires — SOGEBANK</div>
            <table class="bank-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>USD</th>
                  <th>HTG</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Nom du compte</strong></td>
                  <td>Fulmoun Production</td>
                  <td>Fulmoun Production</td>
                </tr>
                <tr>
                  <td><strong>Numéro de compte</strong></td>
                  <td><strong>101010320</strong></td>
                  <td><strong>406001842</strong></td>
                </tr>
                <tr>
                  <td><strong>Type de compte</strong></td>
                  <td>Courant</td>
                  <td>Courant</td>
                </tr>
                <tr>
                  <td><strong>Banque</strong></td>
                  <td>SOGEBANK</td>
                  <td>SOGEBANK</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">🏦 Informations Bancaires — UNIBANK</div>
            <table class="bank-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>USD</th>
                  <th>HTG</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Nom du compte</strong></td>
                  <td>Patrick Bonnefil</td>
                  <td>Patrick Bonnefil</td>
                </tr>
                <tr>
                  <td><strong>Numéro de compte</strong></td>
                  <td><strong>105-1012-1869294</strong></td>
                  <td><strong>105-1011-1869286</strong></td>
                </tr>
                <tr>
                  <td><strong>Type de compte</strong></td>
                  <td>Courant</td>
                  <td>Courant</td>
                </tr>
                <tr>
                  <td><strong>Banque</strong></td>
                  <td>UNIBANK</td>
                  <td>UNIBANK</td>
                </tr>
              </tbody>
            </table>

            <p style="font-size: 13px; color: #6b7280; margin-top: 25px;">
              Merci de bien vouloir mentionner le nom de l'enfant et son matricule lors de tout virement ou dépôt bancaire.
            </p>
          </div>

          <div class="footer">
            <p><strong>SMG FC TORO — Académie de Football</strong></p>
            <p>7 Rue Rigaud, Pétion-Ville, Haïti | <a href="https://www.fctoro.com">www.fctoro.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: emailSubject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("E-mail de validation d'inscription envoyé : %s", info.messageId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'e-mail de validation :", error);
    return NextResponse.json({ error: error.message || "Erreur lors de l'envoi de l'e-mail" }, { status: 500 });
  }
}
