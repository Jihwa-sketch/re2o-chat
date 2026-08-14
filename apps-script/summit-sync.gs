/**
 * Re2O Masters Summit 사전접수 응답 시트 -> /dashboard 실시간 연동용 Apps Script.
 *
 * 설정 방법
 * 1. 응답 시트(설문지 응답 시트1)를 열고 확장 프로그램 > Apps Script 로 들어간다.
 * 2. 이 파일 내용을 그대로 붙여넣는다.
 * 3. 배포 > 새 배포 > 유형: 웹 앱
 *    - 실행 계정: 나
 *    - 액세스 권한: 아무나
 * 4. 배포 후 나오는 웹 앱 URL을 .env의 SUMMIT_SHEET_URL에 넣는다.
 *
 * 개인정보 보호를 위해 성함/병원명/연락처/자유응답(9번) 컬럼은 절대 응답에 포함하지 않는다.
 * 대시보드는 공개 링크이므로, 열을 추가할 때도 개인 식별 정보는 넣지 않는다.
 */

const SHEET_NAME = "설문지 응답 시트1";

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ error: "sheet_not_found" });
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).map(function (row) {
    return [
      row[0] instanceof Date ? row[0].toISOString() : row[0], // 타임스탬프
      row[1], // 1. 신청 경로
      row[3], // 3. 소속 지역
      row[6], // 6. Re2O 활용도
      row[7], // 7. 관심 시술 부위 (콤마 구분)
      row[8], // 8. 기대 세션 (콤마 구분)
    ];
  });

  return jsonResponse({ rows: rows });
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
