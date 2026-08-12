interface ResolvedRow {
  inquiryId: string;
  conversationId: number;
  conversationSeq: number;
  repName: string;
  question: string;
  category: string;
  resolutionType: "ai" | "pm";
  confidence: number | null;
  answer: string;
  pmName: string | null;
  askedAt: string;
  resolvedAt: string;
  resolutionTimeSec: number | null;
  hospital?: string | null;
  procedureDate?: string | null;
  procedureProtocol?: string | null;
}

/**
 * 서비스 계정 키 없이, 구글시트에 바인딩된 Apps Script 웹앱으로 행을 추가한다.
 * 컬럼 순서는 Apps Script doPost의 appendRow 배열 순서와 반드시 일치해야 한다.
 */
export async function appendResolvedRow(row: ResolvedRow) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!url) {
    console.log(`[sheets] 구글시트 연동 미설정 - 적재 생략`, row);
    return;
  }

  try {
    // Apps Script는 브라우저처럼 보이지 않는 요청(기본 fetch User-Agent 등)을
    // 로그인 리디렉션 루프로 처리하는 경우가 있어 User-Agent를 명시적으로 지정한다.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Re2OChatBot/1.0)",
      },
      body: JSON.stringify({ ...row, secret: process.env.GOOGLE_APPS_SCRIPT_SECRET }),
      redirect: "follow",
    });
    if (!res.ok) {
      console.error(`[sheets] 적재 실패: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[sheets] 적재 요청 실패:", err);
  }
}
