package kr.co.wdchub.sellerdata.service;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 시놀로지 Chat 수신 웹훅(Incoming Webhook)으로 메시지를 보냅니다.
 *
 * application.properties:
 *   app.chat.webhook-url=https://chat.wdc-hub.synology.me/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=%22토큰%22
 *   (토큰이 포함된 비밀 주소입니다. 외부에 공개되는 저장소에 올리지 마세요.)
 *
 * - 별도 스레드에서 보내므로 Chat 서버가 느리거나 꺼져 있어도 화면 동작에는 영향이 없습니다.
 * - 보내기에 실패하면 로그만 남깁니다.
 */
@Service
public class ChatNotifyService {

    private static final Logger log = LoggerFactory.getLogger(ChatNotifyService.class);

    @Value("${app.chat.webhook-url:}")
    private String webhookUrl;

    private final RestTemplate restTemplate = createRestTemplate();

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "chat-notify");
        t.setDaemon(true);
        return t;
    });

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(5_000);
        base.setReadTimeout(10_000);
        // Content-Length를 붙여서 보내기 위해 요청 본문을 모았다가 전송합니다.
        return new RestTemplate(new BufferingClientHttpRequestFactory(base));
    }

    /** 채널에 메시지를 보냅니다 (비동기). 웹훅 주소가 설정되지 않았으면 조용히 건너뜁니다. */
    public void send(String text) {
        if (webhookUrl == null || webhookUrl.isBlank() || text == null || text.isBlank()) return;
        executor.submit(() -> post(text));
    }

    private void post(String text) {
        try {
            // String 대신 URI를 넘겨서, 주소 안의 %22(따옴표)가 한 번 더 인코딩되는 것을 막습니다.
            URI uri = URI.create(webhookUrl.trim());

            String payload = "{\"text\":" + jsonString(text) + "}";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-www-form-urlencoded", StandardCharsets.UTF_8));

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("payload", payload);

            ResponseEntity<String> res = restTemplate.postForEntity(uri, new HttpEntity<>(form, headers), String.class);
            String body = res.getBody() == null ? "" : res.getBody();
            if (body.contains("\"success\":true") || body.contains("\"success\": true")) {
                log.info("Chat 알림을 보냈습니다.");
            } else {
                log.warn("Chat 알림 응답이 성공이 아닙니다: {} {}", res.getStatusCode(), body);
            }
        } catch (Exception e) {
            log.warn("Chat 알림을 보내지 못했습니다: {}", e.getMessage());
        }
    }

    /** JSON 문자열 리터럴로 만들기 (따옴표/역슬래시/줄바꿈/제어문자 처리) */
    private static String jsonString(String s) {
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

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
