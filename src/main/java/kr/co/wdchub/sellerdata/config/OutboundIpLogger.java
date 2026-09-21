package kr.co.wdchub.sellerdata.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * [임시 파일] 이 서버가 인터넷으로 나갈 때 쓰는 "외부 IP"를 시작할 때 로그에 한 번 남깁니다.
 * 솔라피 API Key의 '허용할 IP'에 넣을 값을 알아내기 위한 용도예요.
 * IP를 확인했으면 이 파일은 지우세요.
 */
@Component
public class OutboundIpLogger {

    private static final Logger log = LoggerFactory.getLogger(OutboundIpLogger.class);

    @EventListener(ApplicationReadyEvent.class)
    public void logOutboundIp() {
        // 시작 속도에 영향이 없도록 별도 스레드에서 확인합니다.
        new Thread(() -> {
            try {
                SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
                factory.setConnectTimeout(5_000);
                factory.setReadTimeout(5_000);
                String ip = new RestTemplate(factory).getForObject("https://api.ipify.org", String.class);
                log.info("★ 이 서버의 외부 IP: {}  (솔라피 API Key 허용 IP로 사용)", ip);
            } catch (Exception e) {
                log.warn("외부 IP를 확인하지 못했습니다: {}", e.getMessage());
            }
        }, "outbound-ip-logger").start();
    }
}
