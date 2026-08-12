import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function notifyPmOfEscalation(params: {
  repName: string;
  category: string;
  question: string;
  conversationId: number;
}) {
  const { PM_NOTIFY_EMAIL, SMTP_USER, APP_BASE_URL } = process.env;
  const t = getTransporter();
  const adminUrl = `${APP_BASE_URL || "http://localhost:3000"}/admin`;

  if (!t || !PM_NOTIFY_EMAIL) {
    console.log(
      `[mailer] SMTP 미설정 - PM 알림 생략 (rep=${params.repName}, category=${params.category}, question=${params.question})`
    );
    return;
  }

  await t.sendMail({
    from: SMTP_USER,
    to: PM_NOTIFY_EMAIL,
    subject: `[Re2O 챗봇] PM 답변 요청 - ${params.category} - ${params.repName}`,
    text: `영업사원 ${params.repName}님의 문의가 이관되었습니다.\n\n카테고리: ${params.category}\n질문: ${params.question}\n\nPM 대시보드에서 확인하고 답변해주세요: ${adminUrl}`,
  });
}
