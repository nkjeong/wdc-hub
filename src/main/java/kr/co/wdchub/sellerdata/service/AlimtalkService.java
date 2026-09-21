package kr.co.wdchub.sellerdata.service;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 카카오톡 알림톡 발송 (발송 대행사: 솔라피 SOLAPI).
 *
 * 알림톡은 카카오가 미리 승인한 "템플릿"으로만 보낼 수 있어서, 이벤트마다 템플릿이 필요합니다.
 * 템플릿 키(예: ADMIN_SIGNUP_NEW)와 승인된 템플릿 ID는 application.properties에 적어 둡니다.
 * 템플릿 ID가 비어 있는 이벤트는 조용히 건너뛰므로, 승인된 것부터 하나씩 켤 수 있어요.
 *
 *   app.alimtalk.enabled=true
 *   app.alimtalk.api-key=...            (솔라피 API Key)
 *   app.alimtalk.api-secret=...         (솔라피 API Secret)
 *   app.alimtalk.pf-id=...              (솔라피에 연동한 카카오 채널의 pfId)
 *   app.alimtalk.sender=01012345678     (솔라피에 등록한 발신번호)
 *   app.alimtalk.admin-phones=01012345678,01098765432   (관리자 알림을 받을 휴대폰, 쉼표로 구분)
 *   app.alimtalk.sms-fallback=false     (알림톡 실패 시 문자로 대체 발송할지. 문자 요금이 추가로 나갑니다)
 *   app.alimtalk.template.ADMIN_SIGNUP_NEW=KA01TP...   (승인된 템플릿 ID)
 *
 * - 별도 스레드에서 보내므로 발송이 느려도 화면 동작에는 영향이 없고, 실패하면 로그만 남깁니다.
 * - 이 파일은 API Key/Secret이 들어가는 설정을 씁니다. application.properties를 공개 저장소에 올리지 마세요.
 */
@Service
public class AlimtalkService {

    private static final Logger log = LoggerFactory.getLogger(AlimtalkService.class);

    private static final String SEND_URL = "https://api.solapi.com/messages/v4/send-many/detail";

    @Value("${app.alimtalk.enabled:false}")
    private boolean enabled;

    @Value("${app.alimtalk.api-key:}")
    private String apiKey;

    @Value("${app.alimtalk.api-secret:}")
    private String apiSecret;

    @Value("${app.alimtalk.pf-id:}")
    private String pfId;

    @Value("${app.alimtalk.sender:}")
    private String sender;

    @Value("${app.alimtalk.admin-phones:}")
    private String adminPhones;

    @Value("${app.alimtalk.sms-fallback:false}")
    private boolean smsFallback;

    private final Environment env;

    private final RestTemplate restTemplate = createRestTemplate();

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "alimtalk-sender");
        t.setDaemon(true);
        return t;
    });

    public AlimtalkService(Environment env) {
        this.env = env;
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(5_000);
        base.setReadTimeout(15_000);
        return new RestTemplate(new BufferingClientHttpRequestFactory(base));
    }

    // ── 공개 메서드 ───────────────────────────

    /** 설정해 둔 관리자 휴대폰 전체에 알림톡 발송 */
    public void sendToAdmins(String templateKey, Map<String, String> variables) {
        send(templateKey, parsePhones(adminPhones), variables);
    }

    /** 휴대폰 번호 1개(예: 회원)에게 알림톡 발송 */
    public void sendToPhone(String templateKey, String phone, Map<String, String> variables) {
        send(templateKey, parsePhones(phone), variables);
    }

    // ── 내부 ─────────────────────────────────

    private void send(String templateKey, List<String> phones, Map<String, String> variables) {
        if (!enabled || templateKey == null) return;

        String templateId = env.getProperty("app.alimtalk.template." + templateKey);
        if (templateId == null || templateId.isBlank()) {
            log.debug("알림톡 템플릿 ID가 설정되지 않아 건너뜁니다: {}", templateKey);
            return;
        }
        if (apiKey.isBlank() || apiSecret.isBlank() || pfId.isBlank() || sender.isBlank()) {
            log.warn("알림톡 설정(api-key/api-secret/pf-id/sender)이 비어 있어 발송하지 않습니다: {}", templateKey);
            return;
        }
        if (phones.isEmpty()) {
            log.debug("알림톡을 받을 휴대폰 번호가 없어 건너뜁니다: {}", templateKey);
            return;
        }

        String body = buildBody(templateId.trim(), phones, variables);
        executor.submit(() -> post(templateKey, body));
    }

    private void post(String templateKey, String body) {
        try {
            String date = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString(); // 예: 2026-09-20T13:05:01Z
            String salt = UUID.randomUUID().toString().replace("-", "");
            String signature = hmacSha256Hex(apiSecret, date + salt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));
            headers.set("Authorization", "HMAC-SHA256 apiKey=" + apiKey.trim()
                    + ", date=" + date + ", salt=" + salt + ", signature=" + signature);

            ResponseEntity<String> res = restTemplate.postForEntity(URI.create(SEND_URL), new HttpEntity<>(body, headers), String.class);
            String resBody = res.getBody() == null ? "" : res.getBody();
            if (resBody.contains("\"failedMessageList\":[{")) {
                log.warn("알림톡 일부/전체 발송 실패 ({}): {}", templateKey, cut(resBody, 500));
            } else {
                log.info("알림톡 발송 요청 완료 ({}): {}", templateKey, res.getStatusCode());
            }
        } catch (Exception e) {
            log.warn("알림톡을 보내지 못했습니다 ({}): {}", templateKey, e.getMessage());
        }
    }

    /** 솔라피 send-many/detail 요청 본문: 수신자마다 메시지 1건. 알림톡은 text 없이 templateId+variables로 보냅니다. */
    private String buildBody(String templateId, List<String> phones, Map<String, String> variables) {
        StringBuilder vars = new StringBuilder("{");
        if (variables != null) {
            boolean first = true;
            for (Map.Entry<String, String> e : variables.entrySet()) {
                if (!first) vars.append(',');
                first = false;
                vars.append(q("#{" + e.getKey() + "}")).append(':').append(q(cleanValue(e.getValue())));
            }
        }
        vars.append('}');

        StringBuilder sb = new StringBuilder("{\"messages\":[");
        for (int i = 0; i < phones.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append("{\"to\":").append(q(phones.get(i)))
              .append(",\"from\":").append(q(sender.replaceAll("[^0-9]", "")))
              .append(",\"type\":\"ATA\"")
              .append(",\"kakaoOptions\":{")
              .append("\"pfId\":").append(q(pfId.trim()))
              .append(",\"templateId\":").append(q(templateId))
              .append(",\"variables\":").append(vars);
            if (!smsFallback) sb.append(",\"disableSms\":true");
            sb.append("}}");
        }
        return sb.append("]}").toString();
    }

    /** 변수 값: 줄바꿈 제거, 너무 길면 자르기 */
    private String cleanValue(String v) {
        if (v == null) return "-";
        String s = v.replace('\n', ' ').replace('\r', ' ').trim();
        if (s.isEmpty()) return "-";
        return cut(s, 40);
    }

    private List<String> parsePhones(String raw) {
        List<String> result = new ArrayList<>();
        if (raw == null) return result;
        for (String part : raw.split(",")) {
            String digits = part.replaceAll("[^0-9]", "");
            if (digits.matches("01[0-9]{8,9}")) result.add(digits); // 휴대폰 번호 형식만
        }
        return result;
    }

    private static String hmacSha256Hex(String secret, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private static String q(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.append('"').toString();
    }

    private static String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
