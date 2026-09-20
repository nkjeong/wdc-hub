package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Notification;
import kr.co.wdchub.sellerdata.domain.NotificationAudience;
import kr.co.wdchub.sellerdata.dto.NotificationDtos.Item;
import kr.co.wdchub.sellerdata.dto.NotificationDtos.ListResponse;
import kr.co.wdchub.sellerdata.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/**
 * 벨 아이콘 알림 + (관리자 알림은) 시놀로지 Chat 전송.
 *
 * 다른 서비스에서 이렇게 부르면 됩니다.
 *   notificationService.notifyAdmins("MEMBER_SIGNUP_NEW", "새 회원가입 신청", "회사명 · 아이디",
 *           "/admin/members", "회사명: ...\n아이디: ...");
 *   notificationService.notifyMember(username, "PRODUCT_REQUEST_UPDATED", "처리 상태가 바뀌었어요", "...", "/product-requests");
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int LIST_SIZE = 20;

    private final NotificationRepository notificationRepository;
    private final ChatNotifyService chatNotifyService;

    /** 알림 저장은 별도 트랜잭션으로 합니다. 알림 저장이 실패해도 요청 처리/회원가입 같은 본 기능이 롤백되지 않게 하기 위해서예요. */
    private final TransactionTemplate requiresNewTx;

    public NotificationService(NotificationRepository notificationRepository,
                               ChatNotifyService chatNotifyService,
                               PlatformTransactionManager transactionManager) {
        this.notificationRepository = notificationRepository;
        this.chatNotifyService = chatNotifyService;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Chat 메시지에 붙일 '확인' 링크의 도메인 */
    @Value("${app.public-base-url:https://wdc-hub.co.kr}")
    private String publicBaseUrl;

    // ── 만들기 ───────────────────────────────

    /**
     * 관리자에게 알림. Chat 메시지도 함께 보냅니다 (DB 커밋이 성공한 뒤에).
     * @param chatBody Chat에 보낼 본문(여러 줄 가능). null이면 Chat은 보내지 않고 벨 알림만 만듭니다.
     */
    public void notifyAdmins(String type, String title, String message, String linkUrl, String chatBody) {
        saveQuietly(Notification.builder()
                .audience(NotificationAudience.ADMIN)
                .type(type)
                .title(cut(title, 200))
                .message(cut(message, 500))
                .linkUrl(linkUrl)
                .readYn(false)
                .build());

        if (chatBody != null) {
            String text = "🔔 [WDC-HUB] " + title + "\n" + safeForChat(chatBody)
                    + (linkUrl != null ? "\n확인: " + publicBaseUrl + linkUrl : "");
            runAfterCommit(() -> chatNotifyService.send(text));
        }
    }

    /** 회원 한 명에게 벨 알림 */
    public void notifyMember(String username, String type, String title, String message, String linkUrl) {
        if (username == null || username.isBlank()) return;
        saveQuietly(Notification.builder()
                .audience(NotificationAudience.MEMBER)
                .recipientUsername(username)
                .type(type)
                .title(cut(title, 200))
                .message(cut(message, 500))
                .linkUrl(linkUrl)
                .readYn(false)
                .build());
    }

    /** 별도 트랜잭션으로 저장하고, 실패해도 예외를 던지지 않고 로그만 남깁니다. */
    private void saveQuietly(Notification n) {
        try {
            requiresNewTx.executeWithoutResult(status -> notificationRepository.save(n));
        } catch (Exception e) {
            log.warn("알림을 저장하지 못했습니다 (본 기능에는 영향 없음): type={} / {}", n.getType(), e.getMessage(), e);
        }
    }

    // ── 벨 아이콘용 조회/읽음 처리 ────────────

    @Transactional(readOnly = true)
    public ListResponse list(String username, boolean admin) {
        PageRequest page = PageRequest.of(0, LIST_SIZE);
        List<Notification> items;
        long unread;
        if (admin) {
            items = notificationRepository.findByAudienceOrderByCreatedAtDesc(NotificationAudience.ADMIN, page);
            unread = notificationRepository.countByAudienceAndReadYnFalse(NotificationAudience.ADMIN);
        } else {
            items = notificationRepository.findByAudienceAndRecipientUsernameOrderByCreatedAtDesc(
                    NotificationAudience.MEMBER, username, page);
            unread = notificationRepository.countByAudienceAndRecipientUsernameAndReadYnFalse(
                    NotificationAudience.MEMBER, username);
        }
        return new ListResponse(unread, items.stream().map(this::toItem).toList());
    }

    @Transactional
    public void markRead(Long id, String username, boolean admin) {
        Notification n = notificationRepository.findById(id).orElse(null);
        if (n == null) return;
        boolean mine = admin
                ? n.getAudience() == NotificationAudience.ADMIN
                : (n.getAudience() == NotificationAudience.MEMBER && username.equals(n.getRecipientUsername()));
        if (mine) n.setReadYn(true);
    }

    @Transactional
    public void markAllRead(String username, boolean admin) {
        if (admin) {
            notificationRepository.markAllReadForAudience(NotificationAudience.ADMIN);
        } else {
            notificationRepository.markAllReadForMember(NotificationAudience.MEMBER, username);
        }
    }

    // ── 내부 ─────────────────────────────────

    private Item toItem(Notification n) {
        return new Item(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getLinkUrl(), n.isReadYn(), n.getCreatedAt());
    }

    private String cut(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** Chat은 < > 를 링크 문법으로 쓰기 때문에, 회원이 입력한 내용에 들어 있으면 모양이 깨져서 바꿔 줍니다. */
    private String safeForChat(String s) {
        return s.replace('<', '(').replace('>', ')');
    }

    private void runAfterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
