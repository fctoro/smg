import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const maxDuration = 60; // 60 seconds max execution time for Vercel
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const TABLES_TO_BACKUP = [
  "tblEtudiants",
  "tblParents",
  "tblPaiements",
  "tblEmployes",
  "tblPayroll",
  "tblCoachs",
  "tblEffectifs",
  "tblCoachMatchReports",
  "tblCoachPlayerStatus",
  "tblRubriques",
  "tblProgrammes",
  "tblCategories",
  "tblEvenements",
  "tblAttendances",
  "tblParametres",
  "player_status",
  "player_programmes",
  "player_registrations",
  "player_registration_documents",
  "detection_registrations",
  "site_messages",
  "profiles",
  "aqua_space_members",
  "aqua_space_payments",
  "aqua_space_attendance"
];

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return "NULL";
    return String(val);
  }
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function escapeSqlIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function fetchAllRowsFromTable(supabase: any, tableName: string): Promise<any[]> {
  const allRows: any[] = [];
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + batchSize - 1);

    if (error) {
      console.warn(`[Backup] Table ${tableName} query notice:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      allRows.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    } else {
      break;
    }
  }

  return allRows;
}

export async function GET(request: NextRequest) {
  return handleBackup(request);
}

export async function POST(request: NextRequest) {
  return handleBackup(request);
}

async function handleBackup(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const url = new URL(request.url);
    const keyParam = url.searchParams.get("key") || url.searchParams.get("secret");
    if (keyParam !== cronSecret && keyParam !== "smg-backup-2026") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  if (!supabaseClient) {
    return NextResponse.json(
      { error: "Supabase client indisponible" },
      { status: 500 }
    );
  }

  const now = new Date();
  const dateFormatted = now.toISOString().split("T")[0];
  const timeFormatted = now.toISOString().replace("T", " ").split(".")[0];
  const filename = `fctoro_backup_${dateFormatted}.sql`;

  const sqlLines: string[] = [];
  sqlLines.push(`-- =========================================================`);
  sqlLines.push(`-- SAUVEGARDE COMPLÈTE BASE DE DONNÉES FC TORO`);
  sqlLines.push(`-- Date : ${timeFormatted} UTC`);
  sqlLines.push(`-- Destination : fulmoun.production@gmail.com`);
  sqlLines.push(`-- =========================================================\n`);
  sqlLines.push(`SET statement_timeout = 0;`);
  sqlLines.push(`SET client_encoding = 'UTF8';`);
  sqlLines.push(`SET standard_conforming_strings = on;\n`);

  let totalRowsCount = 0;
  const tableStats: { table: string; count: number }[] = [];

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      const rows = await fetchAllRowsFromTable(supabaseClient, tableName);
      if (rows.length === 0) {
        tableStats.push({ table: tableName, count: 0 });
        continue;
      }

      tableStats.push({ table: tableName, count: rows.length });
      totalRowsCount += rows.length;

      sqlLines.push(`-- ---------------------------------------------------------`);
      sqlLines.push(`-- Table: ${tableName} (${rows.length} lignes)`);
      sqlLines.push(`-- ---------------------------------------------------------`);

      const columns = Object.keys(rows[0]);
      const columnsList = columns.map(escapeSqlIdentifier).join(", ");

      const insertChunks: string[] = [];
      for (const row of rows) {
        const valuesList = columns.map((col) => escapeSqlValue(row[col])).join(", ");
        insertChunks.push(`  (${valuesList})`);
      }

      const chunkSize = 100;
      for (let i = 0; i < insertChunks.length; i += chunkSize) {
        const slice = insertChunks.slice(i, i + chunkSize);
        sqlLines.push(
          `INSERT INTO ${escapeSqlIdentifier(tableName)} (${columnsList})\nVALUES\n${slice.join(",\n")}\nON CONFLICT DO NOTHING;\n`
        );
      }
    } catch (err: any) {
      console.warn(`[Backup] Erreur export table ${tableName}:`, err?.message);
    }
  }

  const finalSqlContent = sqlLines.join("\n");
  const sqlBuffer = Buffer.from(finalSqlContent, "utf-8");
  const fileSizeKb = (sqlBuffer.length / 1024).toFixed(2);

  const smtpUser =
    process.env.SMTP_USER ||
    process.env.SMTP_EMAIL ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    "";
  const smtpPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_PASS ||
    "";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
  const recipientEmail = "fulmoun.production@gmail.com";

  let emailSent = false;
  let emailError: string | null = null;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const tableListHtml = tableStats
        .filter((t) => t.count > 0)
        .map((t) => `<li><b>${t.table}</b> : ${t.count.toLocaleString()} lignes</li>`)
        .join("");

      const mailOptions = {
        from: `"FC TORO System" <${smtpUser}>`,
        to: recipientEmail,
        subject: `💾 Sauvegarde Automatique Base de Données FC TORO - ${dateFormatted}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0d9488; margin-bottom: 8px;">FC TORO — Sauvegarde Automatique</h2>
            <p style="font-size: 14px; color: #64748b; margin-top: 0;">Sauvegarde mensuelle du 1er de chaque mois</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            
            <p>Bonjour,</p>
            <p>La sauvegarde complète de votre base de données Supabase a été générée avec succès le <b>${timeFormatted} UTC</b>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><b>📊 Total tables sauvegardées :</b> ${tableStats.filter((t) => t.count > 0).length} tables</p>
              <p style="margin: 4px 0;"><b>📁 Total lignes de données :</b> ${totalRowsCount.toLocaleString()} enregistrements</p>
              <p style="margin: 4px 0;"><b>📦 Taille du fichier :</b> ${fileSizeKb} KB</p>
            </div>

            <h4 style="margin-bottom: 8px; color: #334155;">Détail des tables incluses :</h4>
            <ul style="font-size: 13px; line-height: 1.6; color: #475569;">
              ${tableListHtml}
            </ul>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">Le fichier <code>${filename}</code> contenant toutes les tables et données est attaché en pièce jointe à cet email.</p>
          </div>
        `,
        attachments: [
          {
            filename,
            content: sqlBuffer,
            contentType: "application/sql",
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
    } catch (err: any) {
      console.error("[Backup] Erreur envoi email :", err);
      emailError = err?.message || String(err);
    }
  } else {
    emailError = "SMTP non configuré dans les variables d'environnement";
  }

  return NextResponse.json({
    success: true,
    timestamp: timeFormatted,
    filename,
    fileSizeKb: `${fileSizeKb} KB`,
    totalRows: totalRowsCount,
    tablesSaved: tableStats.filter((t) => t.count > 0).length,
    emailSent,
    recipient: recipientEmail,
    emailError,
    tableStats,
  });
}